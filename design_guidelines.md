# Direct-Rentals Design Guidelines

## Design Approach
**Reference-Based Strategy**: Drawing inspiration from Airbnb (card design, imagery focus), Zillow (property details), and Realtor.com (search/filter patterns). This marketplace requires high visual appeal to showcase properties while maintaining excellent usability for search and discovery.

**Core Principles**:
- Image-first presentation to showcase properties effectively
- Clean, spacious layouts that let properties shine
- Intuitive search and filtering without overwhelming users
- Trust-building through professional, polished design

## Typography

**Font Families**:
- Primary: Inter (headings, UI elements)
- Secondary: System font stack for body text (optimal performance)

**Hierarchy**:
- Hero Headlines: text-5xl md:text-6xl, font-bold
- Section Titles: text-3xl md:text-4xl, font-semibold
- Property Titles: text-xl md:text-2xl, font-semibold
- Body Text: text-base, regular weight
- Property Details/Metadata: text-sm, medium weight
- Captions/Labels: text-xs, regular weight

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, and 12 consistently
- Component padding: p-4 to p-8
- Section spacing: py-12 md:py-20
- Card gaps: gap-4 to gap-6
- Container max-width: max-w-7xl

**Grid Patterns**:
- Property Listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Featured Properties: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Search Results: Flexible based on filters (list vs grid view toggle)

## Component Library

**Navigation**:
- Sticky header with logo, search bar, navigation links, user menu
- Secondary navigation for property type filters (Rent/Buy toggle for future)
- Mobile: Hamburger menu with slide-out drawer

**Hero Section**:
- Full-width hero (90vh) with large background image
- Centered search bar with location input, property type, price range
- Blurred-background overlay for search component
- Headline: "Find Your Perfect Rental" with supporting subtext

**Property Cards**:
- Image carousel (3-5 images per property)
- Heart icon (save/favorite) in top-right corner
- Property details overlay on image: price/night, rating
- Below image: Title, location, brief description, key features (beds/baths)
- Hover: Subtle lift effect (transform scale-105)

**Search & Filters**:
- Left sidebar (desktop) or top section (mobile)
- Filter categories: Price range, bedrooms, bathrooms, amenities, property type
- Active filters shown as dismissible chips
- Results count displayed prominently

**Property Detail Page**:
- Large image gallery (masonry or carousel)
- Two-column layout: Left (images, description, amenities), Right (booking card, host info)
- Sticky booking card on scroll
- Map showing property location
- Reviews section with ratings breakdown
- Similar properties carousel at bottom

**Forms**:
- Contact landlord/host form
- Booking request form with date picker
- User registration/login modals
- Clean, focused layouts with clear labels above inputs

**Footer**:
- Four-column layout: Company info, Support links, Legal, Social media
- Newsletter signup with email input
- Trust badges (secure payments, verified listings)

## Images

**Hero Image**: Large, aspirational lifestyle image showing a beautiful rental property or happy renters in a home setting. Should evoke comfort and aspiration.

**Property Cards**: High-quality photos of properties (exterior, interior, key rooms). Each card requires 3-5 images minimum.

**Trust Section**: Photos of verified hosts, customer testimonials with real faces.

**Feature Sections**: Lifestyle imagery showing the rental experience (moving in, family enjoying home, etc.).

**About/How It Works**: Illustrations or photos demonstrating the rental process steps.

All images should be high-resolution, professionally shot or curated, with consistent editing style (bright, warm, inviting tones).

## Key Sections (Homepage)

1. Hero with search
2. Featured properties grid (8-12 properties)
3. How it works (3-step process with icons)
4. Property categories (Houses, Apartments, Condos, etc.)
5. Trust section (verified listings, secure payments, customer support)
6. Testimonials (2-column grid with photos)
7. Newsletter signup
8. Comprehensive footer

**Admin Panel**: Minimal, data-focused design using table layouts, clear action buttons, dashboard cards for metrics. Prioritize functionality over aesthetics.