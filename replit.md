# Direct Rentals - Property Rental Platform

## Overview
A full-stack property rental platform that connects renters directly with landlords. Features property listings, search/filtering, inquiries, and an admin panel with a feature flag system for future "sell property" functionality.

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

### Tables
1. **properties** - Property listings with details, images, amenities
2. **users** - User accounts (landlords/renters)
3. **inquiries** - Property inquiry messages
4. **savedProperties** - User's saved/favorited properties
5. **featureFlags** - System feature toggles

### Key Fields
- `listingType`: Supports both "rent" and "sale" (sale currently disabled via feature flag)
- `propertyType`: apartment, house, condo, villa, studio
- `status`: active, pending, rented, sold

## API Endpoints

### Properties
- `GET /api/properties` - List with filters (city, type, price, bedrooms, etc.)
- `GET /api/properties/:id` - Single property details
- `POST /api/properties` - Create new listing
- `PATCH /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Inquiries
- `GET /api/inquiries` - List all inquiries
- `POST /api/inquiries` - Submit inquiry
- `PATCH /api/inquiries/:id` - Update status

### Feature Flags
- `GET /api/feature-flags` - List all flags
- `PATCH /api/feature-flags/:id` - Toggle flag

## Feature Flags
- **sell_property**: When enabled, shows "For Sale" listing option (currently disabled)

## Development

### Running the App
```bash
npm run dev
```
This starts both the Express server and Vite dev server on port 5000.

### Database Operations
```bash
npm run db:push    # Push schema changes
npm run db:studio  # Open Drizzle Studio
```

## Pages
- `/` - Home page with hero, featured properties, categories
- `/properties` - Property listings with search/filter
- `/properties/:id` - Property detail page
- `/about` - About page
- `/contact` - Contact form
- `/admin` - Admin panel (property management, inquiries, feature flags)

## Recent Changes (January 2026)
- Fixed API query parameter construction for property fetching
- Database seeded with 8 sample properties across different cities
- Feature flag system implemented for future "sell property" feature

## User Preferences
- Design follows Airbnb/Zillow-inspired aesthetics per design_guidelines.md
- Dark mode support throughout the application
- Mobile-responsive design
