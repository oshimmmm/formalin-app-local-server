// server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { utcStringToJstString } from './client/src/utils/formatDate';

dotenv.config();  // ここで .env ファイルを読み込む

// ==============================
// 1) Expressアプリの作成
// ==============================
const app = express();
app.use(express.json()); // JSONボディをパース
app.use(cors());         // 必要に応じてCORSを有効化

// ==============================
// 2) PostgreSQLとの接続設定
// ==============================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
});

// ==============================
// 3) テーブル構成 (例)
// ==============================
// 事前に psql などで下記テーブルを作成済みと想定:
//   CREATE TABLE formalin (
//       id SERIAL PRIMARY KEY,
//       key TEXT NOT NULL,
//       place TEXT,
//       status TEXT,
//       timestamp TIMESTAMP,
//       size TEXT,
//       expired TIMESTAMP,
//       lot_number TEXT
//   );
//   CREATE TABLE formalin_history (
//       history_id SERIAL PRIMARY KEY,
//       formalin_id INT NOT NULL REFERENCES formalin(id),
//       updated_by TEXT,
//       updated_at TIMESTAMP,
//       old_status TEXT,
//       new_status TEXT,
//       old_place TEXT,
//       new_place TEXT
//   );

// ==============================
// 全ユーザーのユーザー名を取得
// ==============================

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const query = `SELECT username FROM users ORDER BY username`;
    const result = await pool.query(query);
    const usernames = result.rows.map(row => row.username);
    res.json({ users: usernames });
  } catch (err) {
    console.error('ユーザー一覧取得エラー:', err);
    res.status(500).json({ success: false, message: 'サーバーエラー' });
  }
});

/**
 * POST /api/verify-password
 * ユーザーのパスワードを検証
 * リクエストボディ: { username, password }
 */
app.post('/api/verify-password', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const query = `SELECT password FROM users WHERE username = $1 LIMIT 1`;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'ユーザーが存在しません。' });
    }

    const user = result.rows[0];
    if (user.password !== password) {
      return res.json({ success: false, message: 'パスワードが間違っています。' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('パスワード検証エラー:', err);
    res.status(500).json({ success: false, message: 'サーバーエラー' });
  }
});

/**
 * POST /api/update-user
 * ユーザーのパスワードとユーザー種別を更新
 * リクエストボディ: { username, newPassword, newIsAdmin }
 */
app.post('/api/update-user', async (req: Request, res: Response) => {
  try {
    const { username, newPassword, newIsAdmin } = req.body;

    // ユーザーが存在するか確認
    const checkQuery = `SELECT id FROM users WHERE username = $1 LIMIT 1`;
    const checkResult = await pool.query(checkQuery, [username]);

    if (checkResult.rows.length === 0) {
      return res.json({ success: false, message: 'ユーザーが存在しません。' });
    }

    // パスワードを更新
    const updateQuery = `
      UPDATE users
      SET password = COALESCE($2, password),
          is_admin = COALESCE($3, is_admin)
      WHERE username = $1
    `;
    await pool.query(updateQuery, [username, newPassword, newIsAdmin]);

    return res.json({ success: true });
  } catch (err) {
    console.error('ユーザー更新エラー:', err);
    res.status(500).json({ success: false, message: 'サーバーエラー' });
  }
});

/**
 * GET /api/formalin
 * 全データを formalin_history と LEFT JOIN して取得。
 * 履歴は JSON配列にまとめて返す
 */

app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const queryText = `
      SELECT username, password, is_admin
      FROM users
      WHERE username = $1
      LIMIT 1
    `;
    const result = await pool.query(queryText, [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'ユーザー名またはパスワードが違います' });
    }

    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'ユーザー名またはパスワードが違います' });
    }

    return res.json({
      success: true,
      username: user.username,
      isAdmin: user.is_admin,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'サーバーエラー' });
  }
});

app.get('/api/formalin', async (req, res) => {
  try {
    // formalin と history をJOINしてまとめる
    const query = `
      SELECT
        f.id,
        f.key,
        f.place,
        f.status,
        f.timestamp,
        f.size,
        f.expired,
        f.lot_number,
        COALESCE(json_agg(
          json_build_object(
            'history_id', h.history_id,
            'updatedBy', h.updated_by,
            'updatedAt', h.updated_at,
            'oldStatus', h.old_status,
            'newStatus', h.new_status,
            'oldPlace', h.old_place,
            'newPlace', h.new_place
          )
        ) FILTER (WHERE h.history_id IS NOT NULL), '[]') AS history
      FROM formalin AS f
      LEFT JOIN formalin_history AS h
        ON f.id = h.formalin_id
      GROUP BY f.id
      ORDER BY f.id;
    `;

    const result = await pool.query(query);
    // result.rows は配列
    // 例: [{ id: 1, key: 'xxx', ..., history: [ { updatedBy:..., ...}, ... ] }, ...]
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * POST /api/formalin
 * 新規 formalin レコードの作成。
 * 必要に応じて履歴 (initialHistoryEntry) も登録したい場合、リクエストボディから受け取りINSERT
 */
app.post('/api/formalin', async (req, res) => {
  try {
    // リクエストボディから取り出す
    const {
      key,
      place,
      status,
      timestamp,
      size,
      expired,
      lotNumber,
      // 履歴追加用(任意)
      updatedBy,
      updatedAt,
      oldStatus,
      newStatus,
      oldPlace,
      newPlace,
    } = req.body;

    // 1) formalin.timestamp は JST形式の文字列に変換しておく
    const jstTimestamp = utcStringToJstString(timestamp);

    // 1) formalinテーブルにINSERT
    const insertFormalinQuery = `
      INSERT INTO formalin (key, place, status, timestamp, size, expired, lot_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const formalinValues = [
      key,
      place,
      status,
      jstTimestamp || null,
      size || null,
      expired || null,
      lotNumber || null
    ];
    const formalinResult = await pool.query(insertFormalinQuery, formalinValues);
    const newId = formalinResult.rows[0].id; // 挿入後のidを取得

    // 2) 履歴 (formalin_history) にINSERT (任意)
    //    ここでは updatedBy があれば履歴を書き込む例

    if (updatedBy && updatedAt) {
      const jstUpdatedAt = updatedAt ? utcStringToJstString(updatedAt) : null;
      const insertHistoryQuery = `
        INSERT INTO formalin_history (
          formalin_id,
          updated_by,
          updated_at,
          old_status,
          new_status,
          old_place,
          new_place
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const historyValues = [
        newId,
        updatedBy,
        jstUpdatedAt,
        oldStatus || '',    // 未指定なら空文字
        newStatus || '',
        oldPlace || '',
        newPlace || '',
      ];
      await pool.query(insertHistoryQuery, historyValues);
    }

    // 生成されたidを返す
    res.status(201).json({ id: newId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * PUT /api/formalin/:id
 * 指定idのレコードを更新。
 * 履歴として formalin_history にINSERT して更新ログを残す。
 */
app.put('/api/formalin/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const {
      key,
      place,
      status,
      timestamp,
      size,
      expired,
      lotNumber,
      // 履歴用
      updatedBy,
      updatedAt,
      oldStatus,
      newStatus,
      oldPlace,
      newPlace,
    } = req.body;

    const jstTimestamp = utcStringToJstString(timestamp);

    // 1) formalinテーブルのUPDATE
    const updateFormalinQuery = `
      UPDATE formalin
      SET
        key = COALESCE($2, key),
        place = COALESCE($3, place),
        status = COALESCE($4, status),
        timestamp = COALESCE($5, timestamp),
        size = COALESCE($6, size),
        expired = COALESCE($7, expired),
        lot_number = COALESCE($8, lot_number)
      WHERE id = $1
    `;
    const updateValues = [
      id,
      key || null,
      place || null,
      status || null,
      jstTimestamp || null,
      size || null,
      expired || null,
      lotNumber || null,
    ];
    await pool.query(updateFormalinQuery, updateValues);

    // 2) 履歴を formalin_history にINSERT (更新ログ)
    if (updatedBy && updatedAt) {
      const jstUpdatedAt = updatedAt ? utcStringToJstString(updatedAt) : null;

      const insertHistoryQuery = `
        INSERT INTO formalin_history (
          formalin_id,
          updated_by,
          updated_at,
          old_status,
          new_status,
          old_place,
          new_place
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const historyValues = [
        id,
        updatedBy,
        jstUpdatedAt,
        oldStatus || '',
        newStatus || '',
        oldPlace || '',
        newPlace || ''
      ];
      await pool.query(insertHistoryQuery, historyValues);
    }

    res.sendStatus(204); // 成功を204で返す
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/**
 * DELETE /api/formalin/:id
 * 指定idのレコードを削除。
 * 関連するhistoryも削除する例。
 */
app.delete('/api/formalin/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // 1) 履歴の削除
    await pool.query('DELETE FROM formalin_history WHERE formalin_id = $1', [id]);
    // 2) 本体の削除
    await pool.query('DELETE FROM formalin WHERE id = $1', [id]);

    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// server.ts (一部のみ抜粋)
app.post('/api/register', async (req: Request, res: Response) => {
  try {
    const { username, password, isAdmin } = req.body;

    // 1) ユーザー名の重複チェック
    const checkQuery = `SELECT id FROM users WHERE username = $1 LIMIT 1`;
    const checkResult = await pool.query(checkQuery, [username]);

    if (checkResult.rows.length > 0) {
      return res.json({ success: false, message: 'このユーザー名は既に使用されています。' });
    }

    // 2) 新規登録 (is_admin は false とする例)
    // 実際は bcrypt.hash() などでパスワードをハッシュ化するのが望ましい
    const insertQuery = `
      INSERT INTO users (username, password, is_admin)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const insertResult = await pool.query(insertQuery, [username, password, isAdmin]);

    // 成功レスポンス
    return res.json({ success: true, userId: insertResult.rows[0].id });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'サーバーエラー' });
  }
});


// ==============================
// 5) サーバー起動
// ==============================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
