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

### Email (SMTP) Configuration - Required for OTP
For email OTP to work, set these environment variables on your VPS:
- `SMTP_HOST` - SMTP server hostname (e.g., smtp.gmail.com, smtp.zoho.in)
- `SMTP_PORT` - SMTP port (587 for TLS, 465 for SSL)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password
- `SMTP_FROM_EMAIL` - From email address (default: noreply@leaseo.in)
- `SMTP_FROM_NAME` - From name (default: Leaseo)

### SMS OTP (Optional - Not yet implemented)
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

### Other Secrets
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

## Page Live Editor (Admin Feature)
The platform includes a live content editing system for administrators:
- **EditModeProvider**: Context provider managing edit state and pending changes
- **EditableText**: Component for inline text editing with rich text support (bold, italic, links)
- **FloatingEditToggle**: Floating button for admins to toggle edit mode and save changes
- **Pages table**: Stores page content as JSON, keyed by pageKey (e.g., "homepage", "about")
- **API**: `GET/PATCH /api/pages/:pageKey` for fetching and saving page content
- **Cache invalidation**: Automatic query invalidation after save for immediate updates

### How it works:
1. Admin enables edit mode via the floating toggle button
2. EditableText components become editable with rich text toolbar
3. Changes are tracked in EditModeProvider's pendingChanges map
4. On save, changes are batched by page and sent to API
5. Query cache is invalidated for immediate UI updates

## Recent Changes (January 2026)
- **OTP Property Submission Flow**: Fixed critical issue where properties submitted via OTP verification weren't linked to owner accounts
  - OTP verification now creates/finds owner accounts automatically
  - Assigns residential_owner or commercial_owner role based on property segment
  - Returns JWT token to log user in after verification
  - Property creation requires authentication - always links to ownerId
- Property type constants updated to use schema-compliant values (house, apartment, villa, etc.)
- Auto-verification for logged-in property owners in listing form
- Added Page Live Editor for admin content management
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
