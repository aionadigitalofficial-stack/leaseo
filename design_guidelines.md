# Leaseo Design Guidelines

## Brand Identity
**Brand Name**: Leaseo  
**Tagline**: Direct Rentals - Zero Brokerage  
**Target Market**: India (residential and commercial property rentals)

**Logo**: The Leaseo logo features an orange house outline with white "Leaseo" text. Use the provided logo asset for all branding.

## Color Palette

### Primary Colors
- **Leaseo Blue** (Primary): HSL 217 91% 50% - #0B6EF3
  - Used for primary buttons, links, and key interactive elements
- **Leaseo Orange** (Accent): HSL 30 100% 50% - #FF8000
  - Used for "Post Property" CTAs, highlights, and brand accents

### Supporting Colors
- **Deep Blue** (Dark variation): HSL 217 60% 40%
- **Light Blue** (Hover/Light): HSL 217 70% 65%
- **Burnt Orange**: HSL 30 90% 45%

### Semantic Colors
- **Success**: Green tones for verified listings, successful actions
- **Warning**: Yellow/amber for alerts
- **Error**: Red for destructive actions, form errors

### Neutral Palette
- Use blue-tinted grays (hue 220) for backgrounds and text
- Light mode: White background with subtle blue-gray cards
- Dark mode: Deep blue-gray backgrounds

## Typography

**Font Families**:
- Primary: Inter (headings, UI elements)
- Secondary: System font stack for body text

**Hierarchy**:
- Hero Headlines: text-5xl md:text-6xl, font-bold
- Section Titles: text-3xl md:text-4xl, font-semibold
- Property Titles: text-xl md:text-2xl, font-semibold
- Body Text: text-base, regular weight
- Property Details: text-sm, medium weight
- Captions/Labels: text-xs, regular weight

## Layout System

**Spacing Primitives**: Use Tailwind units 2, 4, 6, 8, 12
- Component padding: p-4 to p-8
- Section spacing: py-12 md:py-20
- Card gaps: gap-4 to gap-6
- Container: max-w-7xl mx-auto

**Grid Patterns**:
- Property Listings: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Featured Properties: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Component Styling

### Buttons
- **Primary (Blue)**: Default variant - for main actions
- **Post Property (Orange)**: bg-orange-500 hover:bg-orange-600 - prominent CTA
- **Secondary**: Ghost or outline variants for secondary actions
- **Destructive**: Red for delete/remove actions

### Cards
- Subtle card background with very light border
- Hover effect using hover-elevate utility
- Property cards: Image carousel + details below

### Forms
- Clean labels above inputs
- Blue focus rings matching brand
- Clear validation states

### Navigation
- Sticky header with Leaseo logo
- Orange "Post Property" button as prominent CTA
- Blue links for navigation items

## India-Specific Elements
- INR currency formatting (Rs. or INR symbol)
- +91 country code for phone numbers
- Indian cities and localities in dropdowns
- Hindi/regional language support (future)

## Mobile-First Approach
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly tap targets (min 44px)
- Bottom-sheet patterns for filters on mobile
- Hamburger menu for navigation

## Trust & Credibility
- Verified owner badges (blue checkmark)
- Zero brokerage messaging throughout
- Direct contact emphasis
- No broker/agent terminology

## Dark Mode
- Full dark mode support
- Orange accent remains vibrant
- Blue primary slightly lighter for dark backgrounds
- Maintain sufficient contrast ratios
