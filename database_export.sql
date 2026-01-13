--
-- PostgreSQL database dump
--

\restrict bUKXHAc5kiulH5vUbTYB82majmhgY3KBsiNJaTbKYdmMrC6HJpawoLyIj56PTbR

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: boost_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.boost_status AS ENUM (
    'pending_payment',
    'pending_approval',
    'approved',
    'rejected',
    'expired',
    'cancelled'
);


--
-- Name: boost_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.boost_type AS ENUM (
    'featured',
    'premium',
    'spotlight',
    'urgent'
);


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'active',
    'pending',
    'rented',
    'sold',
    'inactive'
);


--
-- Name: listing_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_type AS ENUM (
    'rent',
    'sale'
);


--
-- Name: otp_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.otp_purpose AS ENUM (
    'login',
    'verify_phone',
    'verify_email',
    'password_reset'
);


--
-- Name: page_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.page_status AS ENUM (
    'draft',
    'published'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


--
-- Name: property_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.property_type AS ENUM (
    'house',
    'apartment',
    'condo',
    'townhouse',
    'studio',
    'villa',
    'office',
    'shop',
    'warehouse',
    'land'
);


--
-- Name: report_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_reason AS ENUM (
    'fake_listing',
    'incorrect_info',
    'already_rented',
    'scam',
    'inappropriate_content',
    'other'
);


--
-- Name: report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_status AS ENUM (
    'pending',
    'reviewed',
    'resolved',
    'dismissed'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'residential_owner',
    'commercial_owner',
    'residential_tenant',
    'commercial_tenant',
    'admin'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id character varying DEFAULT (gen_random_uuid())::character varying NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text NOT NULL,
    featured_image text,
    author_id character varying,
    status text DEFAULT 'draft'::text,
    tags text[] DEFAULT ARRAY[]::text[],
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    meta_title text,
    meta_description text,
    meta_keywords text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    country text DEFAULT 'India'::text,
    is_active boolean DEFAULT true,
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying NOT NULL,
    user_id character varying,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    status text DEFAULT 'new'::text,
    responded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT false,
    description text
);


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    status text DEFAULT 'new'::text,
    created_at timestamp without time zone DEFAULT now(),
    user_id character varying
);


--
-- Name: listing_boosts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_boosts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying NOT NULL,
    user_id character varying NOT NULL,
    boost_type public.boost_type NOT NULL,
    payment_id character varying,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    is_active boolean DEFAULT true,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    status public.boost_status DEFAULT 'pending_payment'::public.boost_status,
    amount numeric(10,2),
    admin_notes text,
    approved_by character varying(255),
    approved_at timestamp without time zone
);


--
-- Name: localities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.localities (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    city_id character varying NOT NULL,
    pincode text,
    is_active boolean DEFAULT true,
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    identifier_type text NOT NULL,
    ip_address text,
    success boolean DEFAULT false,
    failure_reason text,
    occurred_at timestamp without time zone DEFAULT now()
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    is_active boolean DEFAULT true,
    source text DEFAULT 'website'::text,
    subscribed_at timestamp without time zone DEFAULT now(),
    unsubscribed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notification_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_providers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    provider_name text NOT NULL,
    display_name text NOT NULL,
    provider_type text DEFAULT 'sms'::text NOT NULL,
    is_active boolean DEFAULT false,
    mode text DEFAULT 'sandbox'::text,
    account_sid text,
    auth_token text,
    api_key text,
    from_number text,
    sandbox_account_sid text,
    sandbox_auth_token text,
    sandbox_api_key text,
    sandbox_from_number text,
    config_json jsonb,
    updated_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: otp_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    phone text,
    email text,
    country_code text DEFAULT '+91'::text,
    code_hash text NOT NULL,
    purpose public.otp_purpose DEFAULT 'login'::public.otp_purpose NOT NULL,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    expires_at timestamp without time zone NOT NULL,
    consumed_at timestamp without time zone,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: page_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_contents (
    id character varying DEFAULT (gen_random_uuid())::character varying NOT NULL,
    page_key text NOT NULL,
    title text NOT NULL,
    content jsonb NOT NULL,
    last_edited_by character varying,
    updated_at timestamp without time zone DEFAULT now(),
    meta_title text,
    meta_description text,
    status public.page_status DEFAULT 'published'::public.page_status,
    created_at timestamp without time zone DEFAULT now(),
    meta_keywords text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: page_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_versions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    page_id character varying NOT NULL,
    content jsonb NOT NULL,
    meta_title text,
    meta_description text,
    version_number integer NOT NULL,
    edited_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    meta_keywords text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: payment_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_providers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    provider_name text NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT false,
    mode text DEFAULT 'sandbox'::text,
    api_key text,
    auth_token text,
    webhook_secret text,
    sandbox_api_key text,
    sandbox_auth_token text,
    config_json jsonb,
    updated_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    property_id character varying,
    boost_id character varying,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'INR'::text,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    payment_method text,
    transaction_id text,
    gateway_response jsonb,
    description text,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    payment_request_id text
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    property_type public.property_type DEFAULT 'apartment'::public.property_type NOT NULL,
    listing_type public.listing_type DEFAULT 'rent'::public.listing_type NOT NULL,
    status public.listing_status DEFAULT 'active'::public.listing_status NOT NULL,
    price numeric(12,2) NOT NULL,
    price_unit text DEFAULT 'month'::text,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text,
    country text DEFAULT 'USA'::text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    bedrooms integer DEFAULT 1 NOT NULL,
    bathrooms numeric(3,1) DEFAULT '1'::numeric NOT NULL,
    square_feet integer,
    year_built integer,
    images text[] DEFAULT ARRAY[]::text[],
    amenities text[] DEFAULT ARRAY[]::text[],
    is_featured boolean DEFAULT false,
    owner_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_commercial boolean DEFAULT false,
    city_id character varying,
    locality_id character varying,
    rent numeric(12,2),
    sale_price numeric(14,2),
    security_deposit numeric(12,2),
    maintenance_charges numeric(10,2),
    balconies integer DEFAULT 0,
    carpet_area integer,
    floor_number integer,
    total_floors integer,
    furnishing text DEFAULT 'unfurnished'::text,
    facing text,
    is_premium boolean DEFAULT false,
    view_count integer DEFAULT 0,
    available_from timestamp without time zone,
    expires_at timestamp without time zone,
    pincode text
);


--
-- Name: property_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    parent_id character varying,
    segment text DEFAULT 'rent'::text,
    supports_rent boolean DEFAULT true,
    supports_sale boolean DEFAULT false,
    is_commercial boolean DEFAULT false
);


--
-- Name: property_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_images (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying NOT NULL,
    url text NOT NULL,
    caption text,
    display_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    is_approved boolean DEFAULT false,
    is_video boolean DEFAULT false,
    file_size integer
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    issued_at timestamp without time zone DEFAULT now(),
    revoked_at timestamp without time zone,
    ip_address text,
    user_agent text
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    property_id character varying NOT NULL,
    reporter_id character varying NOT NULL,
    reason public.report_reason NOT NULL,
    description text,
    status public.report_status DEFAULT 'pending'::public.report_status,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    resolution text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    role_id character varying NOT NULL,
    permission_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    permissions text[] DEFAULT ARRAY[]::text[],
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: saved_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_properties (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    property_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: shortlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shortlists (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    property_id character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key character varying(100) NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    role_id character varying NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    assigned_by character varying
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text,
    password text,
    email text,
    phone text,
    role text DEFAULT 'user'::text,
    avatar_url text,
    country_code text DEFAULT '+91'::text,
    phone_verified_at timestamp without time zone,
    email_verified_at timestamp without time zone,
    password_hash text,
    first_name text,
    last_name text,
    active_role public.user_role DEFAULT 'residential_tenant'::public.user_role,
    available_roles text[] DEFAULT ARRAY['residential_tenant'::text],
    is_active boolean DEFAULT true,
    profile_completed boolean DEFAULT false,
    metadata jsonb,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    active_role_id character varying
);


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blog_posts (id, title, slug, excerpt, content, featured_image, author_id, status, tags, published_at, created_at, updated_at, meta_title, meta_description, meta_keywords) FROM stdin;
8e3fd54a-0dfc-46b2-ab6b-57d7ccc3cc7d	10 Tips for First-Time Renters in Mumbai	tips-first-time-renters-mumbai	Essential tips for finding your perfect rental home in Mumbai without paying brokerage.	Finding your first rental home in Mumbai can be overwhelming. Here are 10 essential tips to make your search easier and help you avoid common pitfalls. From verifying landlord documents to negotiating rent, we cover everything you need to know.	\N	\N	published	{}	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	\N	\N	{}
9d58f485-42cf-4703-8af0-4c197e5d70a8	Commercial Real Estate Trends 2026	commercial-real-estate-trends-2026	Explore the latest trends shaping commercial real estate in India.	The commercial real estate market in India is evolving rapidly. From co-working spaces to sustainable buildings, discover the trends that are reshaping how businesses choose their office spaces. This comprehensive guide covers everything from rental prices to location preferences.	\N	\N	published	{}	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	\N	\N	{}
cfe6c718-f8f3-49b8-a1ec-618782bc5dc6	How to Verify Property Documents Before Renting	verify-property-documents-renting	A complete guide to ensuring your rental property is legally compliant.	Before signing any rental agreement, it is crucial to verify the property documents. This article walks you through the essential documents to check, including ownership proof, NOC from society, and rental agreement terms. Protect yourself from rental frauds with these tips.	\N	\N	published	{}	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	\N	\N	{}
b7fd5ade-856f-4ca1-be44-921cc17cd7ed	Best Localities for IT Professionals in Pune	best-localities-it-professionals-pune	Top neighborhoods near tech hubs in Pune for working professionals.	Pune has become the second IT hub of India after Bangalore. If you are an IT professional looking for a rental in Pune, these localities offer the best connectivity, amenities, and value for money. From Hinjewadi to Kharadi, we cover all the top areas.	\N	\N	draft	{}	\N	2026-01-08 11:54:17.46976	2026-01-08 11:54:17.46976	\N	\N	{}
134994de-d477-4e6d-a649-a3bbacd26edb	Why Choosing the Right Real Estate Broker Can Change Your Property Journey	Why Choosing the Right Real Estate Broker Can Change Your Property Journey	Why Choosing the Right Real Estate Broker Can Change Your Property Journey	Buying or selling a property is not just a transaction—it’s a life decision. Whether you are investing for the future, upgrading your lifestyle, or selling a valuable asset, the right real estate broker can make the entire journey smooth, transparent, and profitable.\n\nUnderstanding the Real Value of a Broker\n\nA professional real estate broker does much more than show properties. They understand local market trends, price movements, legal processes, and negotiation strategies. Their expertise helps you avoid costly mistakes and ensures you get the best value for your money.\n\nLocal Market Knowledge Matters\n\nEvery locality has its own pricing logic, demand cycle, and future growth potential. A well-connected broker knows which areas are emerging, which projects are reliable, and where your investment will appreciate over time. This insight is especially valuable in fast-growing urban markets.\n\nSaving Time, Effort, and Stress\n\nProperty searches can be overwhelming—multiple site visits, paperwork, follow-ups, and negotiations. A trusted broker filters the best options based on your needs, budget, and goals, saving you countless hours and unnecessary stress.\n\nTransparency and Legal Guidance\n\nFrom agreement clauses to documentation and compliance, real estate transactions involve critical legal steps. An experienced broker ensures transparency, verifies property details, and guides you through paperwork so you can make informed decisions with confidence.\n\nStrong Negotiation for Better Deals\n\nOne of the biggest advantages of working with a broker is negotiation. With market experience and deal exposure, brokers know when and how to negotiate—helping buyers get the right price and sellers maximize returns.\n\nBuilding Long-Term Relationships\n\nA reliable broker focuses on long-term trust, not quick sales. Many clients return for future investments or recommend brokers who deliver honest advice, professional service, and consistent results.\n\nFinal Thoughts\n\nIn real estate, the right guidance can make all the difference. Choosing a knowledgeable and ethical real estate broker means gaining a partner who understands your goals and works tirelessly to achieve them. Whether you’re buying, selling, or investing—expert support ensures peace of mind and smarter decisions.	\N	\N	published	{}	2026-01-12 13:41:11.707	2026-01-12 10:40:18.313682	2026-01-12 13:41:11.707	\N	\N	{}
\.


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cities (id, name, state, country, is_active, latitude, longitude, created_at) FROM stdin;
8a82bf75-77cb-457d-9054-0a33b71f6b11	Mumbai	Maharashtra	India	t	\N	\N	2026-01-08 08:27:24.871981
8814b7dd-8a2d-4e29-968b-039fb94b12aa	Delhi	Delhi	India	t	\N	\N	2026-01-08 08:27:24.871981
9bd50b93-2b43-4b4a-8f18-4003da2eb420	Bangalore	Karnataka	India	t	\N	\N	2026-01-08 08:27:24.871981
1f60a61a-8bb7-49ba-9de4-919ae4b7a8e4	Hyderabad	Telangana	India	t	\N	\N	2026-01-08 08:27:24.871981
4e0c80ad-b9bb-455c-8e3c-c735f488ce05	Chennai	Tamil Nadu	India	t	\N	\N	2026-01-08 08:27:24.871981
82c782f0-a512-44a5-ad43-903eb7068ba0	Kolkata	West Bengal	India	t	\N	\N	2026-01-08 08:27:24.871981
099c6eb9-4088-4a44-80f7-9a74364d8f61	Pune	Maharashtra	India	t	\N	\N	2026-01-08 08:27:24.871981
fd671890-4d1a-42d3-8642-bf2fe9a724c6	Ahmedabad	Gujarat	India	t	\N	\N	2026-01-08 08:27:24.871981
c2279283-b7ca-4f30-987b-5e2bff9577b1	Jaipur	Rajasthan	India	t	\N	\N	2026-01-08 08:27:24.871981
896cf873-7785-4873-8098-ceb8d89889e9	Lucknow	Uttar Pradesh	India	t	\N	\N	2026-01-08 08:27:24.871981
03cc7efd-e857-4802-9272-10748d213151	Surat	Gujrat	India	t	\N	\N	2026-01-12 09:54:19.148686
\.


--
-- Data for Name: enquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enquiries (id, property_id, user_id, name, email, phone, message, status, responded_at, created_at) FROM stdin;
dd42244b-df64-44bd-a650-ecb5fcb08a77	d100341e-1c78-47e8-84ce-5d2684b228f1	\N	Rahul Sharma	rahul@gmail.com	+91 98765 43210	I am interested in this property. Please share more details.	new	\N	2026-01-08 11:54:07.580772
f54b82b6-d400-4f26-a0de-1bd9f52ed158	1b327ff2-6bd9-410d-8ed3-dfd34c55a8dd	\N	Priya Patel	priya.patel@outlook.com	+91 87654 32109	Is this property still available? I want to schedule a visit.	new	\N	2026-01-08 11:54:07.580772
00f56423-8f49-4725-8640-9d941cdab930	cee009e9-4b92-4131-9f7d-4265e7cf56cb	\N	Vikram Singh	vikram.s@yahoo.com	+91 99887 76655	Looking for immediate possession. Can we discuss rent negotiation?	responded	\N	2026-01-08 11:54:07.580772
bb3d520a-b1b5-493d-b668-70e98b94c41a	ba42d627-0aca-479e-be38-710b6bd78d3c	\N	Sneha Kulkarni	sneha.k@gmail.com	+91 88990 01122	Great property! When can I schedule a site visit?	new	\N	2026-01-08 11:54:07.580772
35b56f41-d52b-4ebc-ab09-167b85a867c5	cd69bb65-5e73-43f4-8d81-7b88dc7850b3	\N	Amit Desai	amit.desai@company.com	+91 77889 90011	This looks perfect for our office. Need more information about amenities.	contacted	\N	2026-01-08 11:54:07.580772
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.feature_flags (id, name, enabled, description) FROM stdin;
fd988f34-ebb2-4f90-a3ab-936564a71db3	sell_property	t	Enable the ability to list properties for sale in addition to rentals
\.


--
-- Data for Name: inquiries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inquiries (id, property_id, name, email, phone, message, status, created_at, user_id) FROM stdin;
\.


--
-- Data for Name: listing_boosts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.listing_boosts (id, property_id, user_id, boost_type, payment_id, start_date, end_date, is_active, impressions, clicks, created_at, status, amount, admin_notes, approved_by, approved_at) FROM stdin;
\.


--
-- Data for Name: localities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.localities (id, name, city_id, pincode, is_active, latitude, longitude, created_at) FROM stdin;
2d41e200-1791-431d-82d7-620d162463cc	Andheri West	8a82bf75-77cb-457d-9054-0a33b71f6b11	400053	t	\N	\N	2026-01-08 11:07:43.005079
69732631-0a0e-4212-b9e6-6ed95ff72859	Bandra West	8a82bf75-77cb-457d-9054-0a33b71f6b11	400050	t	\N	\N	2026-01-08 11:07:43.005079
eb6f387e-06ef-45c8-a6d8-7db2f0e64e0f	Powai	8a82bf75-77cb-457d-9054-0a33b71f6b11	400076	t	\N	\N	2026-01-08 11:07:43.005079
4450d09f-556e-4e05-b7c1-180f43382884	Lower Parel	8a82bf75-77cb-457d-9054-0a33b71f6b11	400013	t	\N	\N	2026-01-08 11:07:43.005079
f8a40e58-0a13-4e46-959c-2409b2cc8762	Worli	8a82bf75-77cb-457d-9054-0a33b71f6b11	400018	t	\N	\N	2026-01-08 11:07:43.005079
d19b8e62-4c64-449d-85e7-50d67b9400b6	Koregaon Park	099c6eb9-4088-4a44-80f7-9a74364d8f61	411001	t	\N	\N	2026-01-08 11:07:43.005079
dd9895b1-0a13-4583-9f19-8c5421eccd8c	Hinjewadi	099c6eb9-4088-4a44-80f7-9a74364d8f61	411057	t	\N	\N	2026-01-08 11:07:43.005079
b2883d11-728d-4b92-a0e3-e4a0875524f3	Kharadi	099c6eb9-4088-4a44-80f7-9a74364d8f61	411014	t	\N	\N	2026-01-08 11:07:43.005079
92c8b748-8c18-49a4-aee8-8967885ce8ef	Wakad	099c6eb9-4088-4a44-80f7-9a74364d8f61	411057	t	\N	\N	2026-01-08 11:07:43.005079
32373f67-702c-46ce-af90-b6235743e238	Viman Nagar	099c6eb9-4088-4a44-80f7-9a74364d8f61	411014	t	\N	\N	2026-01-08 11:07:43.005079
\.


--
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.login_attempts (id, identifier, identifier_type, ip_address, success, failure_reason, occurred_at) FROM stdin;
\.


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.newsletter_subscribers (id, email, name, is_active, source, subscribed_at, unsubscribed_at, created_at) FROM stdin;
\.


--
-- Data for Name: notification_providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_providers (id, provider_name, display_name, provider_type, is_active, mode, account_sid, auth_token, api_key, from_number, sandbox_account_sid, sandbox_auth_token, sandbox_api_key, sandbox_from_number, config_json, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: otp_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otp_requests (id, user_id, phone, email, country_code, code_hash, purpose, attempt_count, max_attempts, expires_at, consumed_at, ip_address, user_agent, created_at) FROM stdin;
cef5c2b8-58d5-4039-91e4-7ced1c763846	\N	\N	namrata@creativebrain.co.in	+91	$2b$12$VifeYARzZqHxwIkGJiJVyOE7Llc6xH15RVd2xMeCl0zwhFk2FagpS	verify_email	0	3	2026-01-08 12:34:44.092	2026-01-08 12:24:49.244	\N	\N	2026-01-08 12:24:44.104004
9e78e9d3-31bc-4ee5-a056-7b9509d54fd3	\N	\N	mdjalgaonkar@gmail.com	+91	$2b$12$sE86KGieq.zKSufDKH3VBeNJ7bhzCyg03uKVXRPJWoqMQ9m/bkoVG	verify_email	0	3	2026-01-10 08:10:38.4	2026-01-10 08:00:46.075	\N	\N	2026-01-10 08:00:38.436704
\.


--
-- Data for Name: page_contents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.page_contents (id, page_key, title, content, last_edited_by, updated_at, meta_title, meta_description, status, created_at, meta_keywords) FROM stdin;
4bbe6f23-b8a8-4680-9e73-bd3c6588f5c7	homepage	Homepage	{"heroSubtitle": "Find your perfect rental home directly from verified owners. No brokers, no hidden fee."}	\N	2026-01-09 18:07:21.62837	\N	\N	published	2026-01-09 18:07:21.62837	{}
9554de33-cc85-4ef8-a79e-81efa7bc6bee	blog	Blog	{"text": "Add your content here..."}	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-12 11:09:44.048884	Blog		published	2026-01-12 11:09:44.048884	{}
4829f64a-a03e-47e7-80f9-20d1acea780a	services	services	{"text": "Add your content here..."}	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-12 13:41:30.394413	services		published	2026-01-12 13:41:30.394413	{}
82de79a4-0ccc-415a-a8a5-2386cfe843f9	test	test	{"text": "Add your content here..."}	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-12 12:38:20.720405	test		published	2026-01-12 12:38:20.720405	{}
4daa5bf1-f238-4b9c-ab66-3b59d0e97d06	service	service	{"text": "Add your content here..."}	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-12 13:52:41.166572	service		published	2026-01-12 13:52:41.166572	{}
\.


--
-- Data for Name: page_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.page_versions (id, page_id, content, meta_title, meta_description, version_number, edited_by, created_at, meta_keywords) FROM stdin;
\.


--
-- Data for Name: payment_providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_providers (id, provider_name, display_name, is_active, mode, api_key, auth_token, webhook_secret, sandbox_api_key, sandbox_auth_token, config_json, updated_by, created_at, updated_at) FROM stdin;
ab2e8987-270c-4ce5-a4a3-51f3bc195ae9	instamojo	Instamojo	t	sandbox	\N	\N	\N	\N	\N	\N	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-09 14:33:21.811269	2026-01-09 18:06:08.713
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, user_id, property_id, boost_id, amount, currency, status, payment_method, transaction_id, gateway_response, description, paid_at, created_at, payment_request_id) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, name, display_name, description, category, is_active, created_at) FROM stdin;
d9fed80d-2ba8-4ce6-a0d7-0251da4f3648	manage_properties	Manage Properties	Create, edit, and delete property listings	properties	t	2026-01-09 18:16:02.337876
f80e2bed-d0d0-408e-a0ef-a38b0b1324b3	view_properties	View Properties	View all property listings	properties	t	2026-01-09 18:16:02.337876
24f1cb4e-3065-47bb-83f7-a3f32cb4fdc7	approve_properties	Approve Properties	Approve or reject property listings	properties	t	2026-01-09 18:16:02.337876
b952245a-da85-4fec-8252-10edaec7d716	manage_users	Manage Users	Create, edit, and manage user accounts	users	t	2026-01-09 18:16:02.337876
cea15008-8519-43fd-9da2-51d89fd3cc07	view_users	View Users	View user information	users	t	2026-01-09 18:16:02.337876
30bc2d3c-cab6-4891-82e2-4e00ad0d0408	manage_roles	Manage Roles	Create and manage user roles	roles	t	2026-01-09 18:16:02.337876
4fc5df79-fc53-4482-af25-e0986e7dff90	assign_roles	Assign Roles	Assign roles to users	roles	t	2026-01-09 18:16:02.337876
37412e01-d4bd-4fa6-a928-d50ce5e72c23	manage_enquiries	Manage Enquiries	View and respond to property enquiries	enquiries	t	2026-01-09 18:16:02.337876
50b2126d-802b-470f-a9e2-3ab1bd9acb58	manage_payments	Manage Payments	View and manage payment transactions	payments	t	2026-01-09 18:16:02.337876
d5db6f7e-a3e2-4fcd-8802-561beced4fc3	manage_boosts	Manage Boosts	Approve and manage listing boosts	boosts	t	2026-01-09 18:16:02.337876
af9b5cf1-0317-40f9-ad2e-4233bcb246d1	manage_cities	Manage Cities	Add and edit cities and localities	locations	t	2026-01-09 18:16:02.337876
7e17e45b-5f4b-4d35-ac55-8791f80007e3	manage_blog	Manage Blog	Create and edit blog posts	content	t	2026-01-09 18:16:02.337876
d76a1155-985d-45b4-bf75-4c603b86aa72	manage_pages	Manage Pages	Edit website pages	content	t	2026-01-09 18:16:02.337876
d7d2e9e5-eb0e-44e7-a4d1-7852ef0b4f15	manage_seo	Manage SEO	Configure SEO settings	settings	t	2026-01-09 18:16:02.337876
d70407c9-5870-4fb4-b689-078e44e29f0d	manage_settings	Manage Settings	Configure system settings	settings	t	2026-01-09 18:16:02.337876
c1a8fe19-454f-4e8d-b209-4c4a07b6dd32	view_dashboard	View Dashboard	Access admin dashboard	general	t	2026-01-09 18:16:02.337876
f0f8d248-708b-4f38-8d3b-c17c6d17a5be	manage_newsletter	Manage Newsletter	Manage newsletter subscribers	content	t	2026-01-09 18:16:02.337876
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.properties (id, title, description, property_type, listing_type, status, price, price_unit, address, city, state, zip_code, country, latitude, longitude, bedrooms, bathrooms, square_feet, year_built, images, amenities, is_featured, owner_id, created_at, updated_at, is_commercial, city_id, locality_id, rent, sale_price, security_deposit, maintenance_charges, balconies, carpet_area, floor_number, total_floors, furnishing, facing, is_premium, view_count, available_from, expires_at, pincode) FROM stdin;
d100341e-1c78-47e8-84ce-5d2684b228f1	Modern Downtown Apartment	Beautiful 2-bedroom apartment in the heart of downtown. Features floor-to-ceiling windows, modern kitchen with stainless steel appliances, in-unit washer/dryer, and stunning city views. Walking distance to restaurants, shops, and public transit.	apartment	rent	active	2500.00	month	123 Main Street, Unit 4B	New York	NY	10001	USA	\N	\N	2	2.0	1200	2019	{https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop}	{"Air Conditioning",Washer/Dryer,Dishwasher,Gym,Elevator}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
1b327ff2-6bd9-410d-8ed3-dfd34c55a8dd	Cozy Studio in Brooklyn	Charming studio apartment perfect for young professionals. Recently renovated with modern finishes, hardwood floors, and plenty of natural light. Quiet neighborhood with easy access to subway.	studio	rent	active	1800.00	month	456 Brooklyn Ave	Brooklyn	NY	11201	USA	\N	\N	0	1.0	550	2015	{https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&auto=format&fit=crop}	{"Air Conditioning",Heating,"Pet Friendly"}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
cee009e9-4b92-4131-9f7d-4265e7cf56cb	Spacious Family Home	Beautiful 4-bedroom house perfect for families. Features a large backyard, updated kitchen, hardwood floors throughout, and a 2-car garage. Located in a quiet neighborhood near excellent schools.	house	rent	active	3800.00	month	789 Oak Lane	Los Angeles	CA	90001	USA	\N	\N	4	2.5	2400	2005	{https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop}	{"Air Conditioning",Heating,Washer/Dryer,Parking,"Pet Friendly",Balcony}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
ba42d627-0aca-479e-be38-710b6bd78d3c	Luxury Condo with Ocean Views	Stunning oceanfront condo with panoramic views. This 3-bedroom unit features high-end finishes, gourmet kitchen, spa-like bathrooms, and a private balcony overlooking the water.	condo	rent	active	5500.00	month	100 Ocean Drive, PH2	Miami	FL	33139	USA	\N	\N	3	3.0	2000	2020	{https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop}	{"Air Conditioning",Pool,Gym,Elevator,Balcony,Storage}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
cd69bb65-5e73-43f4-8d81-7b88dc7850b3	Charming Townhouse	Lovely 3-level townhouse in a historic neighborhood. Features exposed brick, original hardwood floors, updated kitchen and bathrooms, and a private patio garden.	townhouse	rent	active	2800.00	month	222 Historic Row	Boston	MA	02108	USA	\N	\N	3	2.0	1800	1890	{https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&auto=format&fit=crop}	{Heating,Washer/Dryer,Dishwasher,Storage}	f	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
2e5634f7-6cca-462a-8e36-5f03e3e2a249	Modern Villa with Pool	Exquisite modern villa featuring clean lines and open living spaces. Includes a private pool, outdoor kitchen, smart home technology, and stunning mountain views.	villa	rent	active	8000.00	month	999 Hilltop Road	Scottsdale	AZ	85251	USA	\N	\N	5	4.0	4500	2021	{https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop}	{"Air Conditioning",Pool,Gym,Parking,Furnished,Balcony}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
01e6dd38-306c-4b5f-90e7-fc41497d2de4	Urban Loft with Industrial Charm	Unique loft-style apartment in converted warehouse. Features soaring ceilings, exposed ductwork, polished concrete floors, and an open floor plan perfect for creative professionals.	apartment	rent	active	3200.00	month	50 Warehouse District	Chicago	IL	60607	USA	\N	\N	1	1.5	1400	2010	{https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop}	{"Air Conditioning",Heating,Elevator,Storage}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
88b9229b-f065-49e7-8b22-81f3cbbbea0c	Suburban Family House	Comfortable 3-bedroom house in family-friendly suburb. Features a large fenced yard, updated kitchen, finished basement, and attached garage. Close to parks and schools.	house	rent	active	2200.00	month	888 Maple Street	Austin	TX	78701	USA	\N	\N	3	2.0	1800	1995	{https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop,https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop}	{"Air Conditioning",Heating,Washer/Dryer,Parking,"Pet Friendly"}	t	\N	2026-01-08 08:11:27.169476	2026-01-08 08:11:27.169476	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
ff6b5a6e-6c92-45cf-98d0-11c952667354	1 BHK Apartment in Andheri West	Spacious 1 BHK apartment with modern amenities. Close to metro station and shopping areas. Well-ventilated with natural light.	apartment	rent	active	25000.00	month	15, Shanti Nagar, Andheri West, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	1	1.0	550	\N	{}	{Lift,Security,Parking,"Water Supply"}	f	\N	2026-01-08 11:09:32.289269	2026-01-08 11:09:32.289269	f	8a82bf75-77cb-457d-9054-0a33b71f6b11	2d41e200-1791-431d-82d7-620d162463cc	25000.00	\N	75000.00	2500.00	1	480	3	7	semi_furnished	East	f	0	\N	\N	\N
5920b416-8913-424c-8934-54b0b24c9df4	2 BHK Flat in Bandra West	Premium 2 BHK flat in prime Bandra location. Walking distance to Linking Road and Bandstand. Sea-facing with stunning views.	apartment	rent	active	65000.00	month	42, Hill Road, Bandra West, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	2	2.0	1100	\N	{}	{Lift,Security,Parking,Gym,"Swimming Pool","Power Backup"}	f	\N	2026-01-08 11:09:32.289269	2026-01-08 11:09:32.289269	f	8a82bf75-77cb-457d-9054-0a33b71f6b11	69732631-0a0e-4212-b9e6-6ed95ff72859	65000.00	\N	195000.00	5000.00	2	950	8	12	fully_furnished	West	f	0	\N	\N	\N
d4526163-a1de-4f86-a9e3-c91cbd56161e	3 BHK Villa in Powai	Luxurious 3 BHK villa in Powai with private garden. Gated community with 24x7 security. Near Hiranandani Gardens.	villa	rent	active	85000.00	month	78, Hiranandani Gardens, Powai, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	3	3.0	2200	\N	{}	{Garden,Parking,Security,Clubhouse,Gym,"Swimming Pool","Power Backup"}	f	\N	2026-01-08 11:09:32.289269	2026-01-08 11:09:32.289269	f	8a82bf75-77cb-457d-9054-0a33b71f6b11	eb6f387e-06ef-45c8-a6d8-7db2f0e64e0f	85000.00	\N	255000.00	8000.00	2	1850	0	2	fully_furnished	North	f	0	\N	\N	\N
35a47b7a-36f9-45a8-bbd3-e97b63fdad5e	Studio Apartment in Lower Parel	Compact studio apartment perfect for young professionals. Near Phoenix Mills and Kamala Mills. Well-connected to central suburbs.	studio	rent	active	35000.00	month	23, Marathon Futurex, Lower Parel, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	0	1.0	400	\N	{}	{Lift,Security,Parking,Gym,"Power Backup"}	f	\N	2026-01-08 11:09:32.289269	2026-01-08 11:09:32.289269	f	8a82bf75-77cb-457d-9054-0a33b71f6b11	4450d09f-556e-4e05-b7c1-180f43382884	35000.00	\N	105000.00	3000.00	1	350	15	25	fully_furnished	South	f	0	\N	\N	\N
80f68985-9d27-4e8a-9aa9-749786e3c238	4 BHK Penthouse in Worli	Ultra-luxury 4 BHK penthouse with terrace. Panoramic sea view from every room. Premium fittings and Italian marble flooring.	apartment	rent	active	350000.00	month	1, Worli Sea Face, Worli, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	4	4.0	4500	\N	{}	{Lift,Security,Parking,Gym,"Swimming Pool","Power Backup",Terrace,"Servant Quarters"}	f	\N	2026-01-08 11:09:32.289269	2026-01-08 11:09:32.289269	f	8a82bf75-77cb-457d-9054-0a33b71f6b11	f8a40e58-0a13-4e46-959c-2409b2cc8762	350000.00	\N	1050000.00	25000.00	3	3800	35	35	fully_furnished	West	f	0	\N	\N	\N
3c472d4f-1d48-4295-95af-caa8587179c5	1 BHK Flat in Koregaon Park	Modern 1 BHK in the heart of Koregaon Park. Close to restaurants, cafes, and nightlife. Perfect for young professionals.	apartment	rent	active	18000.00	month	25, Lane 7, Koregaon Park, Pune	Pune	Maharashtra	\N	USA	\N	\N	1	1.0	650	\N	{}	{Lift,Security,Parking,"Power Backup"}	f	\N	2026-01-08 11:10:05.499894	2026-01-08 11:10:05.499894	f	099c6eb9-4088-4a44-80f7-9a74364d8f61	d19b8e62-4c64-449d-85e7-50d67b9400b6	18000.00	\N	54000.00	2000.00	1	580	4	6	fully_furnished	North	f	0	\N	\N	\N
0e21246d-8205-416a-9eba-3ad1960d50d2	2 BHK Apartment in Hinjewadi	Spacious 2 BHK near IT Park. Ideal for software professionals. Well-connected with BRTS and close to all major tech companies.	apartment	rent	active	22000.00	month	101, Blue Ridge Township, Hinjewadi Phase 1, Pune	Pune	Maharashtra	\N	USA	\N	\N	2	2.0	1050	\N	{}	{Lift,Security,Parking,Gym,Clubhouse,"Power Backup"}	f	\N	2026-01-08 11:10:05.499894	2026-01-08 11:10:05.499894	f	099c6eb9-4088-4a44-80f7-9a74364d8f61	dd9895b1-0a13-4583-9f19-8c5421eccd8c	22000.00	\N	66000.00	3000.00	1	920	5	15	semi_furnished	East	f	0	\N	\N	\N
e468d0cc-b08b-4be1-9ae3-f78ceaa933a0	3 BHK Flat in Kharadi	Premium 3 BHK apartment in Kharadi IT corridor. Modern design with large windows. Near EON Free Zone and World Trade Center.	apartment	rent	active	38000.00	month	45, Nyati Elegance, Kharadi, Pune	Pune	Maharashtra	\N	USA	\N	\N	3	3.0	1650	\N	{}	{Lift,Security,Parking,Gym,"Swimming Pool",Clubhouse,"Power Backup",Garden}	f	\N	2026-01-08 11:10:05.499894	2026-01-08 11:10:05.499894	f	099c6eb9-4088-4a44-80f7-9a74364d8f61	b2883d11-728d-4b92-a0e3-e4a0875524f3	38000.00	\N	114000.00	4500.00	2	1450	12	20	fully_furnished	West	f	0	\N	\N	\N
04e3e19f-9904-4a78-b346-b626b484fecf	2 BHK Apartment in Wakad	Well-maintained 2 BHK in Wakad. Family-friendly neighborhood with schools and hospitals nearby. Excellent public transport.	apartment	rent	active	16000.00	month	88, Pristine Prolife, Wakad, Pune	Pune	Maharashtra	\N	USA	\N	\N	2	2.0	900	\N	{}	{Lift,Security,Parking,"Power Backup"}	f	\N	2026-01-08 11:10:05.499894	2026-01-08 11:10:05.499894	f	099c6eb9-4088-4a44-80f7-9a74364d8f61	92c8b748-8c18-49a4-aee8-8967885ce8ef	16000.00	\N	48000.00	2000.00	1	780	7	12	unfurnished	South	f	0	\N	\N	\N
472edb2f-0367-4059-9a0a-f578585571fc	1 BHK in Viman Nagar	Cozy 1 BHK near Phoenix Market City. Close to airport and all major amenities. Ideal for bachelors or working professionals.	apartment	rent	active	15000.00	month	12, Ganga Elika, Viman Nagar, Pune	Pune	Maharashtra	\N	USA	\N	\N	1	1.0	550	\N	{}	{Lift,Security,Parking,"Power Backup","Water Supply"}	f	\N	2026-01-08 11:10:05.499894	2026-01-08 11:10:05.499894	f	099c6eb9-4088-4a44-80f7-9a74364d8f61	32373f67-702c-46ce-af90-b6235743e238	15000.00	\N	45000.00	1500.00	1	480	2	8	semi_furnished	East	f	0	\N	\N	\N
529a4ab3-d02d-4462-861c-bf51a0a5ddaf	Office Space in Lower Parel	Premium furnished office space in Lower Parel business district. Plug and play ready with meeting rooms. Near Phoenix Mills.	office	rent	active	150000.00	month	Peninsula Business Park, Lower Parel, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	0	2.0	2500	\N	{}	{AC,Parking,Lift,Security,Cafeteria,"Power Backup","Conference Room"}	f	\N	2026-01-08 11:11:30.138226	2026-01-08 11:11:30.138226	t	8a82bf75-77cb-457d-9054-0a33b71f6b11	4450d09f-556e-4e05-b7c1-180f43382884	150000.00	\N	450000.00	15000.00	0	2200	10	25	fully_furnished	\N	f	0	\N	\N	\N
50f19b64-d580-4762-8365-c460a5b1c556	Retail Shop in Bandra	High-footfall retail space on Linking Road. Perfect for boutique, showroom, or retail outlet. Ground floor with glass frontage.	shop	rent	active	200000.00	month	Linking Road, Bandra West, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	0	1.0	800	\N	{}	{Security,"Power Backup","Water Supply","Glass Frontage"}	f	\N	2026-01-08 11:11:30.138226	2026-01-08 11:11:30.138226	t	8a82bf75-77cb-457d-9054-0a33b71f6b11	69732631-0a0e-4212-b9e6-6ed95ff72859	200000.00	\N	600000.00	10000.00	0	750	0	3	unfurnished	\N	f	0	\N	\N	\N
f9dac48e-386f-4001-8c00-08cef47cba70	Warehouse in Andheri	Large warehouse space suitable for storage and logistics. Easy access to Western Express Highway. Loading dock available.	warehouse	rent	active	120000.00	month	MIDC Industrial Area, Andheri East, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	0	2.0	8000	\N	{}	{"Loading Dock",Security,"Power Backup","Fire Safety",Parking}	f	\N	2026-01-08 11:11:30.138226	2026-01-08 11:11:30.138226	t	8a82bf75-77cb-457d-9054-0a33b71f6b11	2d41e200-1791-431d-82d7-620d162463cc	120000.00	\N	360000.00	8000.00	0	7500	0	1	unfurnished	\N	f	0	\N	\N	\N
c6cafb30-bf63-401c-a689-55444fe28eb0	Co-working Space in Powai	Modern co-working space with hot desks and dedicated cabins. High-speed internet, meeting rooms, and pantry included.	office	rent	active	8000.00	month	Hiranandani Business Park, Powai, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	0	2.0	150	\N	{}	{AC,"High-Speed Internet",Parking,Lift,Security,Cafeteria,"Meeting Room"}	f	\N	2026-01-08 11:11:30.138226	2026-01-08 11:11:30.138226	t	8a82bf75-77cb-457d-9054-0a33b71f6b11	eb6f387e-06ef-45c8-a6d8-7db2f0e64e0f	8000.00	\N	24000.00	0.00	0	150	8	15	fully_furnished	\N	f	0	\N	\N	\N
8342a13b-ed70-468c-b8d1-b25a6aed8d69	Commercial Shop in Worli	Prime commercial space in Worli business hub. Suitable for restaurant, cafe, or retail business. High visibility location.	shop	rent	active	280000.00	month	Worli Naka, Worli, Mumbai	Mumbai	Maharashtra	\N	USA	\N	\N	0	2.0	1200	\N	{}	{Security,"Power Backup","Water Supply",Parking,"AC Provision"}	f	\N	2026-01-08 11:11:30.138226	2026-01-08 11:11:30.138226	t	8a82bf75-77cb-457d-9054-0a33b71f6b11	f8a40e58-0a13-4e46-959c-2409b2cc8762	280000.00	\N	840000.00	15000.00	0	1100	0	2	unfurnished	\N	f	0	\N	\N	\N
15097c26-fb29-45e4-952d-f94eead34720	Office Space in Hinjewadi IT Park	Fully furnished office space in Hinjewadi Phase 2. Ready to move with workstations for 50 employees. Near Infosys and Wipro campuses.	office	rent	active	85000.00	month	Rajiv Gandhi Infotech Park, Hinjewadi Phase 2, Pune	Pune	Maharashtra	\N	USA	\N	\N	0	4.0	3000	\N	{}	{AC,Parking,Lift,Security,Cafeteria,"Power Backup","Conference Room","Server Room"}	f	\N	2026-01-08 11:12:02.940029	2026-01-08 11:12:02.940029	t	099c6eb9-4088-4a44-80f7-9a74364d8f61	dd9895b1-0a13-4583-9f19-8c5421eccd8c	85000.00	\N	255000.00	10000.00	0	2700	5	10	fully_furnished	\N	f	0	\N	\N	\N
b7b78596-f6a8-41eb-b350-00e98002e944	Retail Shop in Koregaon Park	Premium retail space in trendy Koregaon Park. Ideal for cafe, boutique, or lifestyle store. High footfall area near German Bakery.	shop	rent	active	75000.00	month	Lane 6, Koregaon Park, Pune	Pune	Maharashtra	\N	USA	\N	\N	0	1.0	600	\N	{}	{Security,"Power Backup","Water Supply","AC Provision"}	f	\N	2026-01-08 11:12:02.940029	2026-01-08 11:12:02.940029	t	099c6eb9-4088-4a44-80f7-9a74364d8f61	d19b8e62-4c64-449d-85e7-50d67b9400b6	75000.00	\N	225000.00	5000.00	0	550	0	2	unfurnished	\N	f	0	\N	\N	\N
04e2337c-bead-4dfa-8aac-9d416954ee6b	Warehouse in Kharadi	Industrial warehouse space in Kharadi business zone. Suitable for manufacturing, storage, or distribution. 24x7 access available.	warehouse	rent	active	95000.00	month	EON Free Zone, Kharadi, Pune	Pune	Maharashtra	\N	USA	\N	\N	0	2.0	6000	\N	{}	{"Loading Dock",Security,"Power Backup","Fire Safety",Parking,"24x7 Access"}	f	\N	2026-01-08 11:12:02.940029	2026-01-08 11:12:02.940029	t	099c6eb9-4088-4a44-80f7-9a74364d8f61	b2883d11-728d-4b92-a0e3-e4a0875524f3	95000.00	\N	285000.00	6000.00	0	5500	0	1	unfurnished	\N	f	0	\N	\N	\N
ef72b198-1883-437e-8673-2638a6c1ac71	Office in Viman Nagar	Compact office space near Pune Airport. Ideal for startups and small businesses. Close to Phoenix Marketcity.	office	rent	active	35000.00	month	Nagar Road, Viman Nagar, Pune	Pune	Maharashtra	\N	USA	\N	\N	0	2.0	800	\N	{}	{AC,Parking,Lift,Security,"Power Backup"}	f	\N	2026-01-08 11:12:02.940029	2026-01-08 11:12:02.940029	t	099c6eb9-4088-4a44-80f7-9a74364d8f61	32373f67-702c-46ce-af90-b6235743e238	35000.00	\N	105000.00	4000.00	0	720	3	8	semi_furnished	\N	f	0	\N	\N	\N
4bb186c0-0a94-4399-98bc-ff0bcd520ab5	Commercial Space in Wakad	Versatile commercial space suitable for showroom, clinic, or office. Ground floor with main road visibility. Near Wakad Bridge.	shop	rent	active	45000.00	month	Mumbai-Pune Highway, Wakad, Pune	Pune	Maharashtra	\N	USA	\N	\N	0	2.0	1000	\N	{}	{Security,"Power Backup","Water Supply",Parking,"Road Facing"}	f	\N	2026-01-08 11:12:02.940029	2026-01-08 11:12:02.940029	t	099c6eb9-4088-4a44-80f7-9a74364d8f61	92c8b748-8c18-49a4-aee8-8967885ce8ef	45000.00	\N	135000.00	3500.00	0	900	0	3	unfurnished	\N	f	0	\N	\N	\N
d41b0200-691c-4ca5-8cd0-07c55e0490a8	2 BHK Apartment for Rent in andheri		apartment	rent	active	25000.00	month	test	Mumbai	Maharashtra	\N	USA	\N	\N	2	2.0	900	\N	{}	{"Swimming Pool",Lift}	f	e64e025e-a3e7-47f5-928a-a97d537c61ac	2026-01-09 09:59:29.646453	2026-01-09 09:59:29.646453	f	\N	\N	25000.00	\N	150000.00	\N	1	700	9	12	semi_furnished	north-west	f	0	2026-01-31 00:00:00	\N	400093
6cd158f8-485c-4dc8-a192-492171f9bbdf	2 BHK Apartment for Rent in fdddf		apartment	rent	active	35000.00	month	dvfff	Mumbai	Maharashtra	\N	USA	\N	\N	2	2.0	900	\N	{}	{Security,Garden}	f	\N	2026-01-09 18:49:20.571722	2026-01-09 18:49:20.571722	f	\N	\N	35000.00	\N	10000.00	\N	1	500	10	1	semi_furnished		f	0	2026-01-10 00:00:00	\N	400093
e994f97c-6e04-4f31-af37-160037b5bff9	2 BHK apartment for Rent in andheri		apartment	rent	active	35000.00	month	midc Ackruti	Mumbai	Maharashtra	\N	USA	\N	\N	2	2.0	800	\N	{}	{"Power Backup",Lift,Parking,Garden,Security,CCTV,"Club House",Gym,"Gas Pipeline"}	f	\N	2026-01-10 06:12:12.410418	2026-01-10 06:12:12.410418	f	\N	\N	35000.00	\N	150000.00	\N	1	700	5	12	semi_furnished	north-east	f	0	2026-01-10 00:00:00	\N	400009
7d91ce9d-ca36-48be-adac-9e8112eea2f7	2 BHK apartment for Rent in Indiana nagar		apartment	rent	active	66000.00	month	jkajkj	Delhi	Delhi	\N	USA	\N	\N	2	3.0	900	\N	{}	{Lift,Parking}	f	\N	2026-01-10 06:14:18.370498	2026-01-10 06:14:18.370498	f	\N	\N	66000.00	\N	3000000.00	\N	2	700	5	1	fully_furnished	north-east	f	0	\N	\N	400060
df789db3-5858-4b75-9e71-2a98291f1d5f	3 BHK apartment for Rent in Bandra		apartment	rent	active	55000.00	month	Ackruti star	Mumbai	Maharashtra	\N	USA	\N	\N	3	2.0	1200	\N	{}	{"Power Backup",Lift,"Swimming Pool",Parking,Security,CCTV,"Club House",Garden}	f	e64e025e-a3e7-47f5-928a-a97d537c61ac	2026-01-10 08:00:48.818041	2026-01-10 08:00:48.818041	f	\N	\N	55000.00	\N	200000.00	\N	2	850	6	11	fully_furnished	north-east	f	0	2026-01-10 00:00:00	\N	400060
c5e53ae6-b015-4b38-b028-f55a78b38c48	1 BHK Vile Parle	1 BHK property	house	rent	active	9000.00	month	Hanuman Road SO (Vile Parle East): 400057	Mumbai	Maharashtra	\N	USA	\N	\N	2	2.0	250	\N	{}	{}	t	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-12 10:08:44.927252	2026-01-12 10:09:19.904	f	\N	\N	\N	\N	\N	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
2db0ca8e-c984-4ffc-91a1-7c099dba9cc7	3BHK Apartment	Spacious apartment with balcony and modern amenities. Located near metro station.	apartment	rent	active	30000.00	month	123 Main Street, Koregaon Park	Pune	Maharashtra	\N	USA	\N	\N	2	2.0	1200	\N	{}	{parking,gym,security}	f	07b60a58-4ded-423f-9a59-088a259c5c98	2026-01-12 11:37:53.928752	2026-01-12 11:37:53.928752	f	\N	\N	30000.00	\N	50000.00	\N	0	\N	\N	\N	unfurnished	\N	f	0	\N	\N	\N
\.


--
-- Data for Name: property_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.property_categories (id, name, slug, description, icon, display_order, is_active, created_at, parent_id, segment, supports_rent, supports_sale, is_commercial) FROM stdin;
cat-rent	Rent	rent	Residential properties available for rent	Home	1	t	2026-01-09 08:10:38.773814	\N	rent	t	f	f
cat-buy	Buy	buy	Residential properties available for sale	Key	2	t	2026-01-09 08:10:38.773814	\N	buy	f	t	f
cat-commercial	Commercial	commercial	Commercial properties for rent or sale	Building2	3	t	2026-01-09 08:10:38.773814	\N	commercial	t	t	t
63f249e0-9067-4f98-aa36-89ef97a3117c	Apartment	rent-apartment	Flats and apartments for rent	Building	1	t	2026-01-09 08:10:38.779258	cat-rent	rent	t	f	f
4491418a-cb43-48d4-97d8-624b8f674c13	House	rent-house	Independent houses for rent	Home	2	t	2026-01-09 08:10:38.782785	cat-rent	rent	t	f	f
934fb842-2510-47a8-9e5f-717394325f8b	Villa	rent-villa	Luxury villas for rent	Castle	3	t	2026-01-09 08:10:38.786088	cat-rent	rent	t	f	f
125aec45-a3f7-4a10-ad58-145f8bbf0fdf	PG/Hostel	rent-pg	Paying guest and hostel accommodations	Users	4	t	2026-01-09 08:10:38.788296	cat-rent	rent	t	f	f
7dd7dc4c-b551-445d-85bb-84910f0ce00a	Studio	rent-studio	Studio apartments for rent	Square	5	t	2026-01-09 08:10:38.794899	cat-rent	rent	t	f	f
96e5fe09-6c51-4d86-bebe-c31b8fa537b8	Penthouse	rent-penthouse	Luxury penthouses for rent	Crown	6	t	2026-01-09 08:10:38.797635	cat-rent	rent	t	f	f
764668ec-d2b0-4c34-919b-8b430a308f9a	Apartment	buy-apartment	Flats and apartments for sale	Building	1	t	2026-01-09 08:10:38.805943	cat-buy	buy	f	t	f
6c69eff2-df82-4363-bf58-a92c9ed37c8b	House	buy-house	Independent houses for sale	Home	2	t	2026-01-09 08:10:38.809399	cat-buy	buy	f	t	f
3d606e1e-81de-46e2-831b-54d9b9484cab	Villa	buy-villa	Luxury villas for sale	Castle	3	t	2026-01-09 08:10:38.816677	cat-buy	buy	f	t	f
6f4cc105-d093-4e51-99b7-bb64eecbbd49	Plot/Land	buy-plot	Residential plots and land for sale	Map	4	t	2026-01-09 08:10:38.820839	cat-buy	buy	f	t	f
94aa370a-c8de-4770-8421-e03166fb5c79	Studio	buy-studio	Studio apartments for sale	Square	5	t	2026-01-09 08:10:38.825199	cat-buy	buy	f	t	f
844dadaf-1d26-4d51-b2b2-71bc00d96cd9	Penthouse	buy-penthouse	Luxury penthouses for sale	Crown	6	t	2026-01-09 08:10:38.828655	cat-buy	buy	f	t	f
0202a332-d41b-4b19-bfa9-9b5ee426c106	Office Space	commercial-office	Office spaces for rent or sale	Briefcase	1	t	2026-01-09 08:10:38.834298	cat-commercial	commercial	t	t	t
69b0d90f-6a2d-4101-91d1-019496e10d9c	Shop/Showroom	commercial-shop	Retail shops and showrooms	Store	2	t	2026-01-09 08:10:38.840361	cat-commercial	commercial	t	t	t
5ad23e9b-c997-4943-8b2b-826900de884e	Warehouse	commercial-warehouse	Warehouses and storage spaces	Warehouse	3	t	2026-01-09 08:10:38.843243	cat-commercial	commercial	t	t	t
c143a9b7-b32d-4e90-8a37-a76c5fe375ae	Co-working	commercial-coworking	Co-working spaces	Users	4	t	2026-01-09 08:10:38.846078	cat-commercial	commercial	t	t	t
02941749-4726-40f8-aabd-afe4fd7275de	Industrial	commercial-industrial	Industrial buildings and factories	Factory	5	t	2026-01-09 08:10:38.849422	cat-commercial	commercial	t	t	t
3269f3b6-ac76-4f83-a2ae-a414c2204545	Commercial Land	commercial-land	Commercial plots for sale	Map	6	t	2026-01-09 08:10:38.852549	cat-commercial	commercial	t	t	t
\.


--
-- Data for Name: property_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.property_images (id, property_id, url, caption, display_order, is_primary, created_at, is_approved, is_video, file_size) FROM stdin;
a5f8af70-8d89-4f38-981d-aca08f817683	c5e53ae6-b015-4b38-b028-f55a78b38c48	/objects/uploads/6502b85c-be87-488b-a6f0-16fbc12376e2	service banner (1).jpg	0	f	2026-01-12 10:09:07.156719	t	f	\N
bd7741a7-19cc-4f92-840f-b7dc9fe56d07	c5e53ae6-b015-4b38-b028-f55a78b38c48	/objects/uploads/e5a4ed8b-18d1-4cfa-9d24-bae403016b8d	service banner (2).jpg	1	f	2026-01-12 10:09:11.300708	t	f	\N
33da5be6-1089-4654-a37d-dc70f1d130a6	c5e53ae6-b015-4b38-b028-f55a78b38c48	/objects/uploads/8b4dca38-5958-4a3b-8d01-dd5c4a7231d8	rmc.jpg	2	f	2026-01-12 10:09:14.947415	t	f	\N
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, issued_at, revoked_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, property_id, reporter_id, reason, description, status, reviewed_by, reviewed_at, resolution, created_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, role_id, permission_id, created_at) FROM stdin;
c36960c4-ada6-4309-b024-9d40b113d6a0	89362a8d-6b09-4d42-bf31-646dc7ae4c87	d9fed80d-2ba8-4ce6-a0d7-0251da4f3648	2026-01-12 11:10:46.718621
439e8154-41f5-4f77-98b0-082829a94e97	89362a8d-6b09-4d42-bf31-646dc7ae4c87	24f1cb4e-3065-47bb-83f7-a3f32cb4fdc7	2026-01-12 11:10:47.369989
bc34afd8-f2a4-4408-ae51-991d8a4efd70	89362a8d-6b09-4d42-bf31-646dc7ae4c87	b952245a-da85-4fec-8252-10edaec7d716	2026-01-12 11:10:48.105397
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, display_name, description, permissions, is_active, created_at) FROM stdin;
089b1d6c-5c7d-4afb-b5d5-7045bb109da6	residential_owner	Residential Owner	Owner of residential properties	{property:create,property:update,property:delete,enquiry:view,enquiry:respond}	t	2026-01-08 08:27:24.871981
4c41f17a-7c3e-46ec-9d10-5d6f1e2c51b9	commercial_owner	Commercial Owner	Owner of commercial properties	{property:create,property:update,property:delete,enquiry:view,enquiry:respond}	t	2026-01-08 08:27:24.871981
89362a8d-6b09-4d42-bf31-646dc7ae4c87	residential_tenant	Residential Tenant	Looking for residential rental properties	{property:view,enquiry:create,shortlist:manage}	t	2026-01-08 08:27:24.871981
ae8b0d68-5941-4faf-8cf2-aecd07fb799c	commercial_tenant	Commercial Tenant	Looking for commercial rental properties	{property:view,enquiry:create,shortlist:manage}	t	2026-01-08 08:27:24.871981
a6089300-45fc-4670-b52a-bee0bbbe2b49	admin	Administrator	Full system access	{admin:all,property:all,user:all,report:all,payment:all}	t	2026-01-08 08:27:24.871981
\.


--
-- Data for Name: saved_properties; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saved_properties (id, user_id, property_id, created_at) FROM stdin;
\.


--
-- Data for Name: shortlists; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shortlists (id, user_id, property_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, role_id, assigned_at, assigned_by) FROM stdin;
d39c7195-31fe-47cc-9ce4-e40698dd4220	07b60a58-4ded-423f-9a59-088a259c5c98	a6089300-45fc-4670-b52a-bee0bbbe2b49	2026-01-08 10:39:48.930865	\N
b7612c82-43cc-412c-8316-2959632b494f	e64e025e-a3e7-47f5-928a-a97d537c61ac	89362a8d-6b09-4d42-bf31-646dc7ae4c87	2026-01-09 08:38:35.351258	\N
69c1eb75-f56c-4d32-91c8-67b8ef318c06	2c645869-77b6-4198-97e2-bbd65d7cdaa4	089b1d6c-5c7d-4afb-b5d5-7045bb109da6	2026-01-09 18:29:11.798467	\N
850cff52-5cae-4193-91d5-6ce95655b239	44202c7b-ae38-42c5-9d7f-5d6e65cd84a1	89362a8d-6b09-4d42-bf31-646dc7ae4c87	2026-01-09 18:29:11.898431	\N
c0fe82f2-0295-483f-b658-f4ad2d319668	e64e025e-a3e7-47f5-928a-a97d537c61ac	089b1d6c-5c7d-4afb-b5d5-7045bb109da6	2026-01-10 08:00:46.094103	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, email, phone, role, avatar_url, country_code, phone_verified_at, email_verified_at, password_hash, first_name, last_name, active_role, available_roles, is_active, profile_completed, metadata, last_login_at, created_at, updated_at, active_role_id) FROM stdin;
2c645869-77b6-4198-97e2-bbd65d7cdaa4	\N	\N	owner@leaseo.in	\N	user	\N	+91	\N	2026-01-09 18:29:11.776	$2b$10$czVTQs9S4D4/ei6ayAu3b.ohxo8ANM53XBAri0kK9vTqq8zJMewWi	Test	Owner	residential_tenant	{residential_tenant}	t	f	\N	2026-01-10 06:10:13.337	2026-01-09 18:29:11.778212	2026-01-09 18:29:11.778212	\N
e64e025e-a3e7-47f5-928a-a97d537c61ac	\N	\N	mdjalgaonkar@gmail.com	9819832759	user	\N	+91	\N	2026-01-10 06:14:16.175	$2b$12$r6aexJnyUiDbQwPmZOru6eEp4PJS9tMp2.L0OB8xRAVcwoIgwjvei	mahesh	Jalgaonkar	residential_tenant	{residential_tenant}	t	f	\N	\N	2026-01-09 08:38:35.344826	2026-01-09 08:38:35.344826	89362a8d-6b09-4d42-bf31-646dc7ae4c87
44202c7b-ae38-42c5-9d7f-5d6e65cd84a1	\N	\N	tenant@leaseo.in	\N	user	\N	+91	\N	2026-01-09 18:29:11.891	$2b$10$vXti4x5apg7lTqmsVZ2Bm.zNmIbI.Z5eLnvS0yHmRZVwSIhixkuJa	Test	Tenant	residential_tenant	{residential_tenant}	f	f	\N	\N	2026-01-09 18:29:11.892733	2026-01-09 18:29:11.892733	\N
07b60a58-4ded-423f-9a59-088a259c5c98	admin	$2b$10$yvfRTa3MYjvCBAYE2kCSteeUjpIacb.Ca2.h6Ipb9i3fNuJUYUctm	admin@leaseo.in	\N	admin	\N	+91	\N	2026-01-08 10:31:24.835472	$2b$10$yvfRTa3MYjvCBAYE2kCSteeUjpIacb.Ca2.h6Ipb9i3fNuJUYUctm	Super	Admin	admin	{admin}	t	t	\N	2026-01-12 13:51:34.166	2026-01-08 10:31:24.835472	2026-01-08 10:31:24.835472	\N
\.


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: cities cities_name_state_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_state_key UNIQUE (name, state);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_name_unique UNIQUE (name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: listing_boosts listing_boosts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_boosts
    ADD CONSTRAINT listing_boosts_pkey PRIMARY KEY (id);


--
-- Name: localities localities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localities
    ADD CONSTRAINT localities_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notification_providers notification_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_providers
    ADD CONSTRAINT notification_providers_pkey PRIMARY KEY (id);


--
-- Name: notification_providers notification_providers_provider_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_providers
    ADD CONSTRAINT notification_providers_provider_name_key UNIQUE (provider_name);


--
-- Name: otp_requests otp_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_requests
    ADD CONSTRAINT otp_requests_pkey PRIMARY KEY (id);


--
-- Name: page_contents page_contents_page_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_contents
    ADD CONSTRAINT page_contents_page_key_key UNIQUE (page_key);


--
-- Name: page_contents page_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_contents
    ADD CONSTRAINT page_contents_pkey PRIMARY KEY (id);


--
-- Name: page_versions page_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_versions
    ADD CONSTRAINT page_versions_pkey PRIMARY KEY (id);


--
-- Name: payment_providers payment_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT payment_providers_pkey PRIMARY KEY (id);


--
-- Name: payment_providers payment_providers_provider_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT payment_providers_provider_name_key UNIQUE (provider_name);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_categories property_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_categories
    ADD CONSTRAINT property_categories_pkey PRIMARY KEY (id);


--
-- Name: property_images property_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: saved_properties saved_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_pkey PRIMARY KEY (id);


--
-- Name: shortlists shortlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_pkey PRIMARY KEY (id);


--
-- Name: shortlists shortlists_user_id_property_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_user_id_property_id_key UNIQUE (user_id, property_id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: blog_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_published_idx ON public.blog_posts USING btree (published_at);


--
-- Name: blog_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_slug_idx ON public.blog_posts USING btree (slug);


--
-- Name: blog_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blog_status_idx ON public.blog_posts USING btree (status);


--
-- Name: boosts_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boosts_active_idx ON public.listing_boosts USING btree (is_active);


--
-- Name: boosts_property_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boosts_property_idx ON public.listing_boosts USING btree (property_id);


--
-- Name: boosts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX boosts_user_idx ON public.listing_boosts USING btree (user_id);


--
-- Name: cities_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cities_name_idx ON public.cities USING btree (name);


--
-- Name: enquiries_property_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enquiries_property_idx ON public.enquiries USING btree (property_id);


--
-- Name: enquiries_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enquiries_user_idx ON public.enquiries USING btree (user_id);


--
-- Name: localities_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX localities_city_idx ON public.localities USING btree (city_id);


--
-- Name: localities_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX localities_name_idx ON public.localities USING btree (name);


--
-- Name: login_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_identifier_idx ON public.login_attempts USING btree (identifier);


--
-- Name: login_ip_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_ip_idx ON public.login_attempts USING btree (ip_address);


--
-- Name: login_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_occurred_idx ON public.login_attempts USING btree (occurred_at);


--
-- Name: newsletter_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX newsletter_active_idx ON public.newsletter_subscribers USING btree (is_active);


--
-- Name: newsletter_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX newsletter_email_idx ON public.newsletter_subscribers USING btree (email);


--
-- Name: notification_providers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_providers_name_idx ON public.notification_providers USING btree (provider_name);


--
-- Name: notification_providers_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_providers_type_idx ON public.notification_providers USING btree (provider_type);


--
-- Name: otp_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_email_idx ON public.otp_requests USING btree (email);


--
-- Name: otp_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_expires_idx ON public.otp_requests USING btree (expires_at);


--
-- Name: otp_phone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otp_phone_idx ON public.otp_requests USING btree (phone);


--
-- Name: page_versions_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_versions_number_idx ON public.page_versions USING btree (version_number);


--
-- Name: page_versions_page_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_versions_page_idx ON public.page_versions USING btree (page_id);


--
-- Name: payment_providers_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_providers_name_idx ON public.payment_providers USING btree (provider_name);


--
-- Name: payments_property_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_property_idx ON public.payments USING btree (property_id);


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payments_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_user_idx ON public.payments USING btree (user_id);


--
-- Name: permissions_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permissions_category_idx ON public.permissions USING btree (category);


--
-- Name: permissions_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permissions_name_idx ON public.permissions USING btree (name);


--
-- Name: properties_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_city_idx ON public.properties USING btree (city_id);


--
-- Name: properties_commercial_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_commercial_idx ON public.properties USING btree (is_commercial);


--
-- Name: properties_locality_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_locality_idx ON public.properties USING btree (locality_id);


--
-- Name: properties_rent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_rent_idx ON public.properties USING btree (rent);


--
-- Name: properties_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX properties_type_idx ON public.properties USING btree (property_type);


--
-- Name: property_categories_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX property_categories_parent_idx ON public.property_categories USING btree (parent_id);


--
-- Name: property_categories_segment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX property_categories_segment_idx ON public.property_categories USING btree (segment);


--
-- Name: property_categories_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX property_categories_slug_idx ON public.property_categories USING btree (slug);


--
-- Name: property_images_property_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX property_images_property_idx ON public.property_images USING btree (property_id);


--
-- Name: refresh_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_token_idx ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_user_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: reports_property_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_property_idx ON public.reports USING btree (property_id);


--
-- Name: reports_reporter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_reporter_idx ON public.reports USING btree (reporter_id);


--
-- Name: reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reports_status_idx ON public.reports USING btree (status);


--
-- Name: shortlists_property_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shortlists_property_idx ON public.shortlists USING btree (property_id);


--
-- Name: shortlists_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shortlists_user_idx ON public.shortlists USING btree (user_id);


--
-- Name: blog_posts blog_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: enquiries enquiries_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: enquiries enquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: inquiries inquiries_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: inquiries inquiries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: listing_boosts listing_boosts_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_boosts
    ADD CONSTRAINT listing_boosts_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: listing_boosts listing_boosts_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_boosts
    ADD CONSTRAINT listing_boosts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: listing_boosts listing_boosts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_boosts
    ADD CONSTRAINT listing_boosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: localities localities_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localities
    ADD CONSTRAINT localities_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: notification_providers notification_providers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_providers
    ADD CONSTRAINT notification_providers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: otp_requests otp_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_requests
    ADD CONSTRAINT otp_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: page_contents page_contents_last_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_contents
    ADD CONSTRAINT page_contents_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.users(id);


--
-- Name: page_versions page_versions_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_versions
    ADD CONSTRAINT page_versions_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.users(id);


--
-- Name: page_versions page_versions_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_versions
    ADD CONSTRAINT page_versions_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.page_contents(id);


--
-- Name: payment_providers payment_providers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT payment_providers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: payments payments_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: properties properties_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: properties properties_locality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_locality_id_fkey FOREIGN KEY (locality_id) REFERENCES public.localities(id);


--
-- Name: properties properties_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: property_images property_images_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reports reports_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: reports reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: saved_properties saved_properties_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: saved_properties saved_properties_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_properties
    ADD CONSTRAINT saved_properties_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: shortlists shortlists_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: shortlists shortlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shortlists
    ADD CONSTRAINT shortlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_active_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_active_role_id_fkey FOREIGN KEY (active_role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict bUKXHAc5kiulH5vUbTYB82majmhgY3KBsiNJaTbKYdmMrC6HJpawoLyIj56PTbR

