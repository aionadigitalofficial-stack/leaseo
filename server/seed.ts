import { db } from "./db";
import { properties, featureFlags } from "@shared/schema";

const sampleProperties = [
  {
    title: "Modern Downtown Apartment",
    description: "Beautiful 2-bedroom apartment in the heart of downtown. Features floor-to-ceiling windows, modern kitchen with stainless steel appliances, in-unit washer/dryer, and stunning city views. Walking distance to restaurants, shops, and public transit.",
    propertyType: "apartment" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "2500.00",
    priceUnit: "month",
    address: "123 Main Street, Unit 4B",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    bedrooms: 2,
    bathrooms: "2",
    squareFeet: 1200,
    yearBuilt: 2019,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Washer/Dryer", "Dishwasher", "Gym", "Elevator"],
    isFeatured: true,
  },
  {
    title: "Cozy Studio in Brooklyn",
    description: "Charming studio apartment perfect for young professionals. Recently renovated with modern finishes, hardwood floors, and plenty of natural light. Quiet neighborhood with easy access to subway.",
    propertyType: "studio" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "1800.00",
    priceUnit: "month",
    address: "456 Brooklyn Ave",
    city: "Brooklyn",
    state: "NY",
    zipCode: "11201",
    bedrooms: 0,
    bathrooms: "1",
    squareFeet: 550,
    yearBuilt: 2015,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Heating", "Pet Friendly"],
    isFeatured: true,
  },
  {
    title: "Spacious Family Home",
    description: "Beautiful 4-bedroom house perfect for families. Features a large backyard, updated kitchen, hardwood floors throughout, and a 2-car garage. Located in a quiet neighborhood near excellent schools.",
    propertyType: "house" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "3800.00",
    priceUnit: "month",
    address: "789 Oak Lane",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    bedrooms: 4,
    bathrooms: "2.5",
    squareFeet: 2400,
    yearBuilt: 2005,
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Heating", "Washer/Dryer", "Parking", "Pet Friendly", "Balcony"],
    isFeatured: true,
  },
  {
    title: "Luxury Condo with Ocean Views",
    description: "Stunning oceanfront condo with panoramic views. This 3-bedroom unit features high-end finishes, gourmet kitchen, spa-like bathrooms, and a private balcony overlooking the water.",
    propertyType: "condo" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "5500.00",
    priceUnit: "month",
    address: "100 Ocean Drive, PH2",
    city: "Miami",
    state: "FL",
    zipCode: "33139",
    bedrooms: 3,
    bathrooms: "3",
    squareFeet: 2000,
    yearBuilt: 2020,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Pool", "Gym", "Elevator", "Balcony", "Storage"],
    isFeatured: true,
  },
  {
    title: "Charming Townhouse",
    description: "Lovely 3-level townhouse in a historic neighborhood. Features exposed brick, original hardwood floors, updated kitchen and bathrooms, and a private patio garden.",
    propertyType: "townhouse" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "2800.00",
    priceUnit: "month",
    address: "222 Historic Row",
    city: "Boston",
    state: "MA",
    zipCode: "02108",
    bedrooms: 3,
    bathrooms: "2",
    squareFeet: 1800,
    yearBuilt: 1890,
    images: [
      "https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&auto=format&fit=crop"
    ],
    amenities: ["Heating", "Washer/Dryer", "Dishwasher", "Storage"],
    isFeatured: false,
  },
  {
    title: "Modern Villa with Pool",
    description: "Exquisite modern villa featuring clean lines and open living spaces. Includes a private pool, outdoor kitchen, smart home technology, and stunning mountain views.",
    propertyType: "villa" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "8000.00",
    priceUnit: "month",
    address: "999 Hilltop Road",
    city: "Scottsdale",
    state: "AZ",
    zipCode: "85251",
    bedrooms: 5,
    bathrooms: "4",
    squareFeet: 4500,
    yearBuilt: 2021,
    images: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Pool", "Gym", "Parking", "Furnished", "Balcony"],
    isFeatured: true,
  },
  {
    title: "Urban Loft with Industrial Charm",
    description: "Unique loft-style apartment in converted warehouse. Features soaring ceilings, exposed ductwork, polished concrete floors, and an open floor plan perfect for creative professionals.",
    propertyType: "apartment" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "3200.00",
    priceUnit: "month",
    address: "50 Warehouse District",
    city: "Chicago",
    state: "IL",
    zipCode: "60607",
    bedrooms: 1,
    bathrooms: "1.5",
    squareFeet: 1400,
    yearBuilt: 2010,
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Heating", "Elevator", "Storage"],
    isFeatured: true,
  },
  {
    title: "Suburban Family House",
    description: "Comfortable 3-bedroom house in family-friendly suburb. Features a large fenced yard, updated kitchen, finished basement, and attached garage. Close to parks and schools.",
    propertyType: "house" as const,
    listingType: "rent" as const,
    status: "active" as const,
    price: "2200.00",
    priceUnit: "month",
    address: "888 Maple Street",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    bedrooms: 3,
    bathrooms: "2",
    squareFeet: 1800,
    yearBuilt: 1995,
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&auto=format&fit=crop"
    ],
    amenities: ["Air Conditioning", "Heating", "Washer/Dryer", "Parking", "Pet Friendly"],
    isFeatured: true,
  },
];

const defaultFeatureFlags = [
  {
    name: "sell_property",
    enabled: false,
    description: "Enable the ability to list properties for sale in addition to rentals",
  },
];

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Check if properties already exist
    const existingProperties = await db.select().from(properties).limit(1);
    
    if (existingProperties.length === 0) {
      console.log("📦 Inserting sample properties...");
      await db.insert(properties).values(sampleProperties);
      console.log(`✅ Inserted ${sampleProperties.length} sample properties`);
    } else {
      console.log("⏭️ Properties already exist, skipping...");
    }

    // Check if feature flags exist
    const existingFlags = await db.select().from(featureFlags).limit(1);
    
    if (existingFlags.length === 0) {
      console.log("🚩 Inserting feature flags...");
      await db.insert(featureFlags).values(defaultFeatureFlags);
      console.log(`✅ Inserted ${defaultFeatureFlags.length} feature flags`);
    } else {
      console.log("⏭️ Feature flags already exist, skipping...");
    }

    console.log("🎉 Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
