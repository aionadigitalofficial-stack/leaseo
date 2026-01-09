import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PropertyGrid } from "@/components/property-grid";
import { SearchFilters } from "@/components/search-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Property, PropertyFilters } from "@shared/schema";

export default function PropertiesPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Parse URL params into filters
  const parseFiltersFromUrl = (): PropertyFilters & { segment?: string } => {
    const params = new URLSearchParams(search);
    const filters: PropertyFilters & { segment?: string } = {};
    
    if (params.get("city")) filters.city = params.get("city") || undefined;
    if (params.get("propertyType")) filters.propertyType = params.get("propertyType") || undefined;
    if (params.get("type")) filters.propertyType = params.get("type") || undefined;
    if (params.get("listing")) filters.listingType = params.get("listing") as "rent" | "sale" | undefined;
    if (params.get("segment")) filters.segment = params.get("segment") || undefined;
    if (params.get("minPrice")) filters.minPrice = parseInt(params.get("minPrice") || "0");
    if (params.get("maxPrice")) filters.maxPrice = parseInt(params.get("maxPrice") || "0");
    if (params.get("beds")) filters.minBedrooms = parseInt(params.get("beds") || "0");
    
    return filters;
  };

  const [filters, setFilters] = useState<PropertyFilters>(parseFiltersFromUrl);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    const filtersWithSegment = filters as PropertyFilters & { segment?: string };
    if (filtersWithSegment.segment) params.set("segment", filtersWithSegment.segment);
    if (filters.city) params.set("city", filters.city);
    if (filters.propertyType) params.set("propertyType", filters.propertyType);
    if (filters.listingType) params.set("listing", filters.listingType);
    if (filters.minPrice) params.set("minPrice", filters.minPrice.toString());
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
    if (filters.minBedrooms) params.set("beds", filters.minBedrooms.toString());
    
    const queryString = params.toString();
    setLocation(`/properties${queryString ? `?${queryString}` : ""}`, { replace: true });
  }, [filters, setLocation]);

  // Build API URL with filters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    const filtersWithSegment = filters as PropertyFilters & { segment?: string };
    if (filtersWithSegment.segment) params.set("segment", filtersWithSegment.segment);
    if (filters.city) params.set("city", filters.city);
    if (filters.propertyType) params.set("propertyType", filters.propertyType);
    if (filters.listingType) params.set("listingType", filters.listingType);
    if (filters.minPrice) params.set("minPrice", filters.minPrice.toString());
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
    if (filters.minBedrooms) params.set("minBedrooms", filters.minBedrooms.toString());
    if (filters.minBathrooms) params.set("minBathrooms", filters.minBathrooms.toString());
    if (sortBy) params.set("sortBy", sortBy);
    const queryString = params.toString();
    return `/api/properties${queryString ? `?${queryString}` : ""}`;
  };

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: [buildApiUrl()],
  });

  const { data: featureFlags = [] } = useQuery<{ name: string; enabled: boolean }[]>({
    queryKey: ["/api/feature-flags"],
  });

  const showSaleOption = featureFlags.some(
    (flag) => flag.name === "sell_property" && flag.enabled
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-muted/30 py-8 border-b">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {(() => {
                const filtersWithSegment = filters as PropertyFilters & { segment?: string };
                if (filtersWithSegment.segment === "buy") return "Properties for Sale";
                if (filtersWithSegment.segment === "commercial") return "Commercial Properties";
                if (filters.listingType === "sale") return "Properties for Sale";
                return "Rental Properties";
              })()}
            </h1>
            <p className="text-muted-foreground">
              {isLoading ? "Searching..." : `${properties.length} properties found`}
            </p>
          </div>
        </div>

        {/* Filters and Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Search and Filters */}
          <div className="mb-8">
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              showSaleOption={showSaleOption}
              resultsCount={properties.length}
            />
          </div>

          {/* Sort and View Options */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="beds-desc">Most Bedrooms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-1 p-1 bg-muted rounded-md">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Property Grid */}
          <PropertyGrid
            properties={properties}
            isLoading={isLoading}
            emptyMessage="No properties match your search criteria. Try adjusting your filters."
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
