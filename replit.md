# Leaseo - Property Rental Platform

## Overview
A full-stack property rental platform connecting renters directly with landlords in India. Features property listings, search/filtering, enquiries, shortlists, and an admin panel. Supports role-based access control with role switching.

## Project Architecture

### Frontend (React + Vite)
- **Location**: `client/src/`
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter
- **Dark Mode**: Fully supported via ThemeProvider

### Backend (Express + Node.js)
- **Location**: `server/`
- **API**: RESTful endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL

### Shared Types
- **Location**: `shared/schema.ts`
- Contains Drizzle schema definitions and Zod validation schemas

## Key Files
- `shared/schema.ts` - Database schema and types
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database operations
- `server/db.ts` - Database connection
- `client/src/App.tsx` - Main app with routing
- `design_guidelines.md` - UI design specifications

## Database Schema

### Core Tables
| Table | Description |
|-------|-------------|
| **users** | User accounts with auth fields, roles, profile |
| **roles** | Role definitions (residential_owner, commercial_owner, residential_tenant, commercial_tenant, admin) |
| **user_roles** | Join table for user-role assignments |
| **properties** | Property listings with details |
| **property_images** | Property photos |
| **cities** | City master data (India) |
| **localities** | Localities/areas within cities |
| **enquiries** | Property enquiry messages |
| **shortlists** | User's saved/favorited properties |
| **reports** | Property abuse reports |
| **payments** | Payment transactions (optional) |
| **listing_boosts** | Premium listing features |
| **feature_flags** | System feature toggles |

### Auth Tables
| Table | Description |
|-------|-------------|
| **otp_requests** | OTP tokens with rate limiting |
| **refresh_tokens** | JWT refresh tokens |
| **login_attempts** | Login audit for rate limiting |

### Key Indexes
- `properties.city_id` - City-based filtering
- `properties.locality_id` - Locality-based filtering  
- `properties.rent` - Price range searches
- `properties.property_type` - Type filtering
- `properties.is_commercial` - Residential vs Commercial

## User Roles
- **Residential Owner** - Property owners (residential)
- **Commercial Owner** - Property owners (commercial)
- **Residential Tenant** - Property seekers (residential)
- **Commercial Tenant** - Property seekers (commercial)
- **Admin** - Full system access

**Note**: Broker/Agent roles are explicitly restricted.

## API Endpoints

### Properties
- `GET /api/properties` - List with filters
- `GET /api/properties/:id` - Single property
- `POST /api/properties` - Create listing
- `PATCH /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Auth (Pending Implementation)
- `POST /api/auth/otp/request` - Request OTP
- `POST /api/auth/otp/verify` - Verify OTP & login
- `POST /api/auth/email/login` - Email login
- `POST /api/auth/token/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `PATCH /api/auth/profile` - Complete profile
- `PATCH /api/auth/role` - Switch active role

### Enquiries
- `GET /api/enquiries` - List enquiries
- `POST /api/enquiries` - Submit enquiry

### Cities/Localities
- `GET /api/cities` - List cities
- `GET /api/cities/:id/localities` - List localities in city

## Development

### Running the App
```bash
npm run dev
```

### Database Operations
```bash
npm run db:push    # Push schema changes
npm run db:studio  # Open Drizzle Studio
```

## Required Secrets
For OTP functionality, the following secrets are required:
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `JWT_SECRET` - Secret for signing JWT tokens

## Pages
- `/` - Home page
- `/properties` - Property listings
- `/properties/:id` - Property detail
- `/about` - About page
- `/contact` - Contact form
- `/admin` - Admin panel
- `/login` - Login page (pending)
- `/profile` - User profile (pending)
- `/dashboard` - User dashboard with role switching (pending)

## Recent Changes (January 2026)
- Extended database schema with roles, cities, localities, property images
- Added user roles system (Residential/Commercial Owner/Tenant, Admin)
- Created tables for enquiries, shortlists, reports, payments, listing boosts
- Added indexes on city_id, locality_id, rent, property_type, is_commercial
- Seeded 10 Indian cities and 5 default roles
- Built NoBroker-style homepage with Rent/Commercial toggle search
- Added popular localities section (Mumbai, Delhi, Bangalore)
- Created "How It Works" owner-to-tenant flow section
- Added trust badges and SEO footer with city links
- Updated header with "Post Property" CTA (green button)
- Full mobile-responsive design with mobile-first approach

## Homepage Components
- `nobroker-search.tsx` - Main search with Rent/Commercial tabs, city/locality selectors, BHK/property type dropdowns
- `popular-localities.tsx` - Popular neighborhoods in major cities
- `owner-to-tenant.tsx` - How it works 4-step process
- `trust-badges.tsx` - Zero brokerage, verified listings badges
- `seo-footer.tsx` - City links and property type links for SEO

## User Preferences
- Design follows NoBroker/Airbnb-inspired aesthetics
- Dark mode support throughout
- Mobile-first responsive design
- India-focused (INR currency, +91 country code)
