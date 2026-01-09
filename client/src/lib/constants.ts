export const RENT_RANGES = [
  { min: 0, max: 10000, label: "Under 10K", value: "0-10000" },
  { min: 10000, max: 20000, label: "10K - 20K", value: "10000-20000" },
  { min: 20000, max: 30000, label: "20K - 30K", value: "20000-30000" },
  { min: 30000, max: 50000, label: "30K - 50K", value: "30000-50000" },
  { min: 50000, max: 100000, label: "50K - 1L", value: "50000-100000" },
  { min: 100000, max: 999999, label: "1L+", value: "100000+" },
];

export const BHK_OPTIONS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"];

export const FURNISHING_OPTIONS = ["Fully Furnished", "Semi Furnished", "Unfurnished"];

export const AVAILABILITY_OPTIONS = ["Immediate", "Within 15 Days", "Within 30 Days", "After 30 Days"];

export const PREFERRED_TENANT = ["Family", "Bachelor Male", "Bachelor Female", "Company", "Any"];

export const PARKING_OPTIONS = ["Car", "Bike", "Both", "None"];

export const FLOOR_OPTIONS = ["Ground", "1-3", "4-7", "8-12", "13+"];

export const PROPERTY_TYPES_RESIDENTIAL = [
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Villa", value: "villa" },
  { label: "Townhouse", value: "townhouse" },
  { label: "Condo", value: "condo" },
  { label: "Studio", value: "studio" },
];

export const PROPERTY_TYPES_COMMERCIAL = [
  { label: "Office Space", value: "office" },
  { label: "Shop/Showroom", value: "shop" },
  { label: "Warehouse", value: "warehouse" },
  { label: "Land", value: "land" },
];

export const CARPET_AREA_OPTIONS = ["Under 500 sqft", "500-1000 sqft", "1000-2000 sqft", "2000-5000 sqft", "5000+ sqft"];

export const BUSINESS_TYPE_OPTIONS = ["IT/Software", "Retail", "Manufacturing", "Healthcare", "Education", "Hospitality", "Any"];

export const POWER_LOAD_OPTIONS = ["Under 5 KW", "5-10 KW", "10-25 KW", "25-50 KW", "50+ KW"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "rent_low", label: "Rent: Low to High" },
  { value: "rent_high", label: "Rent: High to Low" },
];

export const INDIAN_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
];

export const CITY_STATE_MAP: Record<string, string> = {
  "Mumbai": "Maharashtra",
  "Delhi": "Delhi",
  "Bangalore": "Karnataka",
  "Hyderabad": "Telangana",
  "Chennai": "Tamil Nadu",
  "Kolkata": "West Bengal",
  "Pune": "Maharashtra",
  "Ahmedabad": "Gujarat",
  "Jaipur": "Rajasthan",
  "Lucknow": "Uttar Pradesh",
};
