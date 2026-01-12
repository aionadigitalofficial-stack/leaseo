import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Home, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeroSectionProps {
  showSaleOption?: boolean;
}

export function HeroSection({ showSaleOption = false }: HeroSectionProps) {
  const [, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState({
    location: "",
    propertyType: "",
    listingType: "rent",
    priceRange: "",
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchParams.location) params.set("city", searchParams.location);
    if (searchParams.propertyType) params.set("type", searchParams.propertyType);
    if (searchParams.listingType) params.set("listing", searchParams.listingType);
    if (searchParams.priceRange) params.set("price", searchParams.priceRange);
    
    setLocation(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-muted/50 to-background">
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-4xl mx-auto leading-tight">
          Find Your Perfect Rental Home
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Discover thousands of rental properties directly from verified landlords. 
          No middlemen, no hidden fees.
        </p>

        {/* Search Box */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/95 dark:bg-background/95 backdrop-blur-md rounded-lg p-4 md:p-6 shadow-2xl">
            {/* Listing Type Tabs - Show sale option only if enabled */}
            {showSaleOption && (
              <div className="flex gap-2 mb-4">
                <Button
                  variant={searchParams.listingType === "rent" ? "default" : "outline"}
                  onClick={() => setSearchParams({ ...searchParams, listingType: "rent" })}
                  className="flex-1 md:flex-none"
                  data-testid="button-search-rent"
                >
                  Rent
                </Button>
                <Button
                  variant={searchParams.listingType === "sale" ? "default" : "outline"}
                  onClick={() => setSearchParams({ ...searchParams, listingType: "sale" })}
                  className="flex-1 md:flex-none"
                  data-testid="button-search-sale"
                >
                  Buy
                </Button>
              </div>
            )}

            {/* Search Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Location Input */}
              <div className="relative md:col-span-2">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter city, neighborhood, or ZIP"
                  className="pl-10 h-12"
                  value={searchParams.location}
                  onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                  data-testid="input-search-location"
                />
              </div>

              {/* Property Type */}
              <Select
                value={searchParams.propertyType}
                onValueChange={(value) => setSearchParams({ ...searchParams, propertyType: value })}
              >
                <SelectTrigger className="h-12" data-testid="select-property-type">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Property Type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                </SelectContent>
              </Select>

              {/* Price Range */}
              <Select
                value={searchParams.priceRange}
                onValueChange={(value) => setSearchParams({ ...searchParams, priceRange: value })}
              >
                <SelectTrigger className="h-12" data-testid="select-price-range">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Price Range" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1000">Under $1,000</SelectItem>
                  <SelectItem value="1000-2000">$1,000 - $2,000</SelectItem>
                  <SelectItem value="2000-3000">$2,000 - $3,000</SelectItem>
                  <SelectItem value="3000-5000">$3,000 - $5,000</SelectItem>
                  <SelectItem value="5000+">$5,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button 
              className="w-full md:w-auto mt-4 h-12 px-8 text-base"
              onClick={handleSearch}
              data-testid="button-search-properties"
            >
              <Search className="h-5 w-5 mr-2" />
              Search Properties
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
            <div className="text-sm md:text-base text-muted-foreground">Active Listings</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">200+</div>
            <div className="text-sm md:text-base text-muted-foreground">Verified Landlords</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-primary">50+</div>
            <div className="text-sm md:text-base text-muted-foreground">Cities Covered</div>
          </div>
        </div>
      </div>
    </section>
  );
}
