--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: formalin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formalin (
    id integer NOT NULL,
    key text NOT NULL,
    place text,
    status text,
    "timestamp" timestamp without time zone,
    size text,
    expired timestamp without time zone,
    lot_number text
);


ALTER TABLE public.formalin OWNER TO postgres;

--
-- Name: formalin_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formalin_history (
    history_id integer NOT NULL,
    formalin_id integer NOT NULL,
    updated_by text,
    updated_at timestamp without time zone,
    old_status text,
    new_status text,
    old_place text,
    new_place text
);


ALTER TABLE public.formalin_history OWNER TO postgres;

--
-- Name: formalin_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formalin_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formalin_history_history_id_seq OWNER TO postgres;

--
-- Name: formalin_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formalin_history_history_id_seq OWNED BY public.formalin_history.history_id;


--
-- Name: formalin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formalin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formalin_id_seq OWNER TO postgres;

--
-- Name: formalin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formalin_id_seq OWNED BY public.formalin.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: formalin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalin ALTER COLUMN id SET DEFAULT nextval('public.formalin_id_seq'::regclass);


--
-- Name: formalin_history history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalin_history ALTER COLUMN history_id SET DEFAULT nextval('public.formalin_history_history_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: formalin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formalin (id, key, place, status, "timestamp", size, expired, lot_number) FROM stdin;
1	testKey	testPlace	'入庫済み'	2024-12-28 16:02:15.049262	25mL	2025-01-01 00:00:00	240403
\.


--
-- Data for Name: formalin_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.formalin_history (history_id, formalin_id, updated_by, updated_at, old_status, new_status, old_place, new_place) FROM stdin;
1	1	user@example.com	2024-12-25 10:00:00		stored		roomA
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, is_admin) FROM stdin;
1	admin	3430	t
2	yasu	3430	f
3	oshima	3430	t
\.


--
-- Name: formalin_history_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formalin_history_history_id_seq', 50, true);


--
-- Name: formalin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.formalin_id_seq', 30, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: formalin_history formalin_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalin_history
    ADD CONSTRAINT formalin_history_pkey PRIMARY KEY (history_id);


--
-- Name: formalin formalin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalin
    ADD CONSTRAINT formalin_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: formalin_history formalin_history_formalin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalin_history
    ADD CONSTRAINT formalin_history_formalin_id_fkey FOREIGN KEY (formalin_id) REFERENCES public.formalin(id);


--
-- PostgreSQL database dump complete
--

