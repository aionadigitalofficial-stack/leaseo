import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { SeoFooter } from "@/components/seo-footer";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Filter, 
  X, 
  MapPin, 
  Building2, 
  Home,
  ChevronLeft,
  ChevronRight,
  Loader2 
} from "lucide-react";
import type { Property } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  RENT_RANGES,
  BHK_OPTIONS,
  FURNISHING_OPTIONS,
  AVAILABILITY_OPTIONS,
  PREFERRED_TENANT,
  PARKING_OPTIONS,
  FLOOR_OPTIONS,
  PROPERTY_TYPES_RESIDENTIAL,
  PROPERTY_TYPES_COMMERCIAL,
  CARPET_AREA_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  POWER_LOAD_OPTIONS,
  SORT_OPTIONS,
} from "@/lib/constants";

interface Filters {
  rentMin?: number;
  rentMax?: number;
  bhk: string[];
  furnishing: string[];
  availability: string[];
  preferredTenant: string[];
  parking: string[];
  hasLift: boolean;
  petFriendly: boolean;
  floor: string[];
  propertyType: string[];
  carpetArea: string[];
  businessType: string[];
  hasWashroom: boolean;
  powerLoad: string[];
  roadFacing: boolean;
  gstApplicable: boolean;
}

const defaultFilters: Filters = {
  bhk: [],
  furnishing: [],
  availability: [],
  preferredTenant: [],
  parking: [],
  hasLift: false,
  petFriendly: false,
  floor: [],
  propertyType: [],
  carpetArea: [],
  businessType: [],
  hasWashroom: false,
  powerLoad: [],
  roadFacing: false,
  gstApplicable: false,
};

export default function RentalSearchPage() {
  const params = useParams<{ city?: string; locality?: string }>();
  const [location, setLocation] = useLocation();
  
  const city = params.city ? decodeURIComponent(params.city).replace(/-/g, " ") : "";
  const locality = params.locality ? decodeURIComponent(params.locality).replace(/-/g, " ") : "";
  
  const isBuyRoute = location.startsWith("/buy");
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialCommercial = urlParams.get("type") === "commercial";
  const initialSort = urlParams.get("sort") || "newest";
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  
  const [isCommercial, setIsCommercial] = useState(initialCommercial);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sortBy, setSortBy] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const itemsPerPage = 12;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const newFilters: Filters = { ...defaultFilters };
    
    const rentMin = params.get("rentMin");
    if (rentMin) newFilters.rentMin = parseInt(rentMin, 10);
    const rentMax = params.get("rentMax");
    if (rentMax) newFilters.rentMax = parseInt(rentMax, 10);
    
    const bhk = params.get("bhk");
    if (bhk) newFilters.bhk = bhk.split(",");
    const furnishing = params.get("furnishing");
    if (furnishing) newFilters.furnishing = furnishing.split(",");
    const propType = params.get("propertyType");
    if (propType) newFilters.propertyType = propType.split(",");
    const availability = params.get("availability");
    if (availability) newFilters.availability = availability.split(",");
    const tenant = params.get("tenant");
    if (tenant) newFilters.preferredTenant = tenant.split(",");
    const parking = params.get("parking");
    if (parking) newFilters.parking = parking.split(",");
    const floor = params.get("floor");
    if (floor) newFilters.floor = floor.split(",");
    const area = params.get("carpetArea");
    if (area) newFilters.carpetArea = area.split(",");
    const business = params.get("businessType");
    if (business) newFilters.businessType = business.split(",");
    const power = params.get("powerLoad");
    if (power) newFilters.powerLoad = power.split(",");
    
    if (params.get("lift") === "true") newFilters.hasLift = true;
    if (params.get("pet") === "true") newFilters.petFriendly = true;
    if (params.get("washroom") === "true") newFilters.hasWashroom = true;
    if (params.get("roadFacing") === "true") newFilters.roadFacing = true;
    if (params.get("gst") === "true") newFilters.gstApplicable = true;
    
    setFilters(newFilters);
    
    if (params.get("type") === "commercial") {
      setIsCommercial(true);
    }
    
    const sort = params.get("sort");
    if (sort) setSortBy(sort);
    
    const pageParam = params.get("page");
    if (pageParam) setPage(parseInt(pageParam, 10));
  }, []);

  const updateURL = (newFilters: Filters, newSort: string, newPage: number, newCommercial: boolean) => {
    const citySlug = params.city || "";
    const localitySlug = params.locality || "";
    const routeBase = isBuyRoute ? "/buy" : "/rent";
    const basePath = localitySlug ? `${routeBase}/${citySlug}/${localitySlug}` : `${routeBase}/${citySlug}`;
    
    const searchParams = new URLSearchParams();
    if (newCommercial) searchParams.set("type", "commercial");
    if (newSort !== "newest") searchParams.set("sort", newSort);
    if (newPage > 1) searchParams.set("page", newPage.toString());
    if (newFilters.rentMin) searchParams.set("rentMin", newFilters.rentMin.toString());
    if (newFilters.rentMax) searchParams.set("rentMax", newFilters.rentMax.toString());
    if (newFilters.bhk.length) searchParams.set("bhk", newFilters.bhk.join(","));
    if (newFilters.furnishing.length) searchParams.set("furnishing", newFilters.furnishing.join(","));
    if (newFilters.propertyType.length) searchParams.set("propertyType", newFilters.propertyType.join(","));
    if (newFilters.availability.length) searchParams.set("availability", newFilters.availability.join(","));
    if (newFilters.preferredTenant.length) searchParams.set("tenant", newFilters.preferredTenant.join(","));
    if (newFilters.parking.length) searchParams.set("parking", newFilters.parking.join(","));
    if (newFilters.floor.length) searchParams.set("floor", newFilters.floor.join(","));
    if (newFilters.hasLift) searchParams.set("lift", "true");
    if (newFilters.petFriendly) searchParams.set("pet", "true");
    if (newFilters.carpetArea.length) searchParams.set("carpetArea", newFilters.carpetArea.join(","));
    if (newFilters.businessType.length) searchParams.set("businessType", newFilters.businessType.join(","));
    if (newFilters.powerLoad.length) searchParams.set("powerLoad", newFilters.powerLoad.join(","));
    if (newFilters.hasWashroom) searchParams.set("washroom", "true");
    if (newFilters.roadFacing) searchParams.set("roadFacing", "true");
    if (newFilters.gstApplicable) searchParams.set("gst", "true");
    
    const queryString = searchParams.toString();
    const newPath = queryString ? `${basePath}?${queryString}` : basePath;
    window.history.replaceState({}, "", newPath);
  };

  const buildApiQuery = () => {
    const queryParams = new URLSearchParams();
    if (city) queryParams.set("city", city);
    if (locality) queryParams.set("locality", locality);
    if (isCommercial) queryParams.set("isCommercial", "true");
    if (isBuyRoute) queryParams.set("listingType", "sale");
    if (filters.rentMin) queryParams.set("minPrice", filters.rentMin.toString());
    if (filters.rentMax) queryParams.set("maxPrice", filters.rentMax.toString());
    if (filters.bhk.length) queryParams.set("bhk", filters.bhk.join(","));
    if (filters.furnishing.length) queryParams.set("furnishing", filters.furnishing.join(","));
    if (filters.propertyType.length) queryParams.set("propertyType", filters.propertyType.join(","));
    if (filters.availability.length) queryParams.set("availability", filters.availability.join(","));
    if (filters.preferredTenant.length) queryParams.set("tenant", filters.preferredTenant.join(","));
    if (filters.parking.length) queryParams.set("parking", filters.parking.join(","));
    if (filters.floor.length) queryParams.set("floor", filters.floor.join(","));
    if (filters.hasLift) queryParams.set("lift", "true");
    if (filters.petFriendly) queryParams.set("pet", "true");
    if (filters.carpetArea.length) queryParams.set("carpetArea", filters.carpetArea.join(","));
    if (filters.businessType.length) queryParams.set("businessType", filters.businessType.join(","));
    if (filters.powerLoad.length) queryParams.set("powerLoad", filters.powerLoad.join(","));
    if (filters.hasWashroom) queryParams.set("washroom", "true");
    if (filters.roadFacing) queryParams.set("roadFacing", "true");
    if (filters.gstApplicable) queryParams.set("gst", "true");
    
    if (sortBy === "rent_low") queryParams.set("sortBy", "price_asc");
    else if (sortBy === "rent_high") queryParams.set("sortBy", "price_desc");
    else queryParams.set("sortBy", "newest");
    
    queryParams.set("limit", itemsPerPage.toString());
    queryParams.set("offset", ((page - 1) * itemsPerPage).toString());
    return queryParams.toString();
  };

  const { data: propertiesData, isLoading, isFetching } = useQuery<Property[]>({
    queryKey: ["/api/properties", buildApiQuery()],
    staleTime: 0, // Always refetch fresh data
  });

  const properties = propertiesData || [];
  const hasMore = properties.length === itemsPerPage;

  const activeFilterCount = [
    filters.bhk.length,
    filters.furnishing.length,
    filters.availability.length,
    filters.preferredTenant.length,
    filters.parking.length,
    filters.hasLift ? 1 : 0,
    filters.petFriendly ? 1 : 0,
    filters.floor.length,
    filters.propertyType.length,
    filters.carpetArea.length,
    filters.businessType.length,
    filters.hasWashroom ? 1 : 0,
    filters.powerLoad.length,
    filters.roadFacing ? 1 : 0,
    filters.gstApplicable ? 1 : 0,
    filters.rentMin || filters.rentMax ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAllFilters = () => {
    setFilters(defaultFilters);
    setPage(1);
    updateURL(defaultFilters, sortBy, 1, isCommercial);
  };

  const toggleArrayFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      const newArr = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      const newFilters = { ...prev, [key]: newArr };
      updateURL(newFilters, sortBy, 1, isCommercial);
      return newFilters;
    });
    setPage(1);
  };

  const toggleBooleanFilter = (key: keyof Filters) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: !prev[key] };
      updateURL(newFilters, sortBy, 1, isCommercial);
      return newFilters;
    });
    setPage(1);
  };

  const setRentRange = (min?: number, max?: number) => {
    setFilters(prev => {
      const newFilters = { ...prev, rentMin: min, rentMax: max };
      updateURL(newFilters, sortBy, 1, isCommercial);
      return newFilters;
    });
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setPage(1);
    updateURL(filters, newSort, 1, isCommercial);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateURL(filters, sortBy, newPage, isCommercial);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCommercialToggle = (commercial: boolean) => {
    setIsCommercial(commercial);
    setFilters(defaultFilters);
    setPage(1);
    updateURL(defaultFilters, sortBy, 1, commercial);
  };

  const listingTypeLabel = isBuyRoute ? "Sale" : "Rent";
  const pageTitle = locality 
    ? `${isCommercial ? "Commercial" : "Residential"} Properties for ${listingTypeLabel} in ${locality}, ${city}`
    : city 
    ? `${isCommercial ? "Commercial" : "Residential"} Properties for ${listingTypeLabel} in ${city}`
    : `${isCommercial ? "Commercial" : "Residential"} Properties for ${listingTypeLabel}`;

  const FilterSection = ({ className }: { className?: string }) => (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
            Clear All
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={!isCommercial ? "default" : "outline"}
          size="sm"
          onClick={() => handleCommercialToggle(false)}
          className="flex-1"
          data-testid="filter-residential"
        >
          <Home className="h-4 w-4 mr-1" />
          Residential
        </Button>
        <Button
          variant={isCommercial ? "default" : "outline"}
          size="sm"
          onClick={() => handleCommercialToggle(true)}
          className="flex-1"
          data-testid="filter-commercial"
        >
          <Building2 className="h-4 w-4 mr-1" />
          Commercial
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={["rent", "propertyType"]} className="w-full">
        <AccordionItem value="rent">
          <AccordionTrigger className="text-sm font-medium">Rent Range</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2">
              {RENT_RANGES.map(range => (
                <label key={range.label} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={filters.rentMin === range.min && filters.rentMax === range.max}
                    onCheckedChange={(checked) => {
                      if (checked) setRentRange(range.min, range.max);
                      else setRentRange(undefined, undefined);
                    }}
                    data-testid={`checkbox-rent-${range.label.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  {range.label}
                </label>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {!isCommercial ? (
          <>
            <AccordionItem value="bhk">
              <AccordionTrigger className="text-sm font-medium">BHK Type</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {BHK_OPTIONS.map(bhk => (
                    <Badge
                      key={bhk}
                      variant={filters.bhk.includes(bhk) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter("bhk", bhk)}
                      data-testid={`badge-bhk-${bhk.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {bhk}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="propertyType">
              <AccordionTrigger className="text-sm font-medium">Property Type</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {PROPERTY_TYPES_RESIDENTIAL.map(type => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={filters.propertyType.includes(type.value)}
                        onCheckedChange={() => toggleArrayFilter("propertyType", type.value)}
                        data-testid={`checkbox-type-${type.value}`}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="furnishing">
              <AccordionTrigger className="text-sm font-medium">Furnishing</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {FURNISHING_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={filters.furnishing.includes(opt)}
                        onCheckedChange={() => toggleArrayFilter("furnishing", opt)}
                        data-testid={`checkbox-furnishing-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="availability">
              <AccordionTrigger className="text-sm font-medium">Availability</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={filters.availability.includes(opt)}
                        onCheckedChange={() => toggleArrayFilter("availability", opt)}
                        data-testid={`checkbox-availability-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tenant">
              <AccordionTrigger className="text-sm font-medium">Preferred Tenant</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {PREFERRED_TENANT.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={filters.preferredTenant.includes(opt)}
                        onCheckedChange={() => toggleArrayFilter("preferredTenant", opt)}
                        data-testid={`checkbox-tenant-${opt.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="amenities">
              <AccordionTrigger className="text-sm font-medium">Amenities</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={filters.hasLift} onCheckedChange={() => toggleBooleanFilter("hasLift")} data-testid="checkbox-lift" />
                    Lift Available
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={filters.petFriendly} onCheckedChange={() => toggleBooleanFilter("petFriendly")} data-testid="checkbox-pet-friendly" />
                    Pet Friendly
                  </label>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="parking">
              <AccordionTrigger className="text-sm font-medium">Parking</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {PARKING_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.parking.includes(opt)} onCheckedChange={() => toggleArrayFilter("parking", opt)} data-testid={`checkbox-parking-${opt.toLowerCase()}`} />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="floor">
              <AccordionTrigger className="text-sm font-medium">Floor</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {FLOOR_OPTIONS.map(floor => (
                    <Badge key={floor} variant={filters.floor.includes(floor) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayFilter("floor", floor)} data-testid={`badge-floor-${floor.toLowerCase().replace(/\+/g, "plus")}`}>
                      {floor}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        ) : (
          <>
            <AccordionItem value="propertyType">
              <AccordionTrigger className="text-sm font-medium">Property Type</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {PROPERTY_TYPES_COMMERCIAL.map(type => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.propertyType.includes(type.value)} onCheckedChange={() => toggleArrayFilter("propertyType", type.value)} data-testid={`checkbox-commercial-type-${type.value}`} />
                      {type.label}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="carpetArea">
              <AccordionTrigger className="text-sm font-medium">Carpet Area</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {CARPET_AREA_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.carpetArea.includes(opt)} onCheckedChange={() => toggleArrayFilter("carpetArea", opt)} data-testid={`checkbox-carpet-${opt.toLowerCase().replace(/\s+/g, "-")}`} />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="furnishing">
              <AccordionTrigger className="text-sm font-medium">Furnishing</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {FURNISHING_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.furnishing.includes(opt)} onCheckedChange={() => toggleArrayFilter("furnishing", opt)} data-testid={`checkbox-comm-furnishing-${opt.toLowerCase().replace(/\s+/g, "-")}`} />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="businessType">
              <AccordionTrigger className="text-sm font-medium">Suitable For</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {BUSINESS_TYPE_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.businessType.includes(opt)} onCheckedChange={() => toggleArrayFilter("businessType", opt)} data-testid={`checkbox-business-${opt.toLowerCase().replace(/\//g, "-")}`} />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="commercial-amenities">
              <AccordionTrigger className="text-sm font-medium">Amenities</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={filters.hasWashroom} onCheckedChange={() => toggleBooleanFilter("hasWashroom")} data-testid="checkbox-washroom" />
                    Private Washroom
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={filters.roadFacing} onCheckedChange={() => toggleBooleanFilter("roadFacing")} data-testid="checkbox-road-facing" />
                    Road Facing
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={filters.gstApplicable} onCheckedChange={() => toggleBooleanFilter("gstApplicable")} data-testid="checkbox-gst" />
                    GST Applicable
                  </label>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="powerLoad">
              <AccordionTrigger className="text-sm font-medium">Power Load</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {POWER_LOAD_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.powerLoad.includes(opt)} onCheckedChange={() => toggleArrayFilter("powerLoad", opt)} data-testid={`checkbox-power-${opt.toLowerCase().replace(/\s+/g, "-")}`} />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="parking">
              <AccordionTrigger className="text-sm font-medium">Parking</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {PARKING_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={filters.parking.includes(opt)} onCheckedChange={() => toggleArrayFilter("parking", opt)} data-testid={`checkbox-comm-parking-${opt.toLowerCase()}`} />
                      {opt}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="floor">
              <AccordionTrigger className="text-sm font-medium">Floor</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {FLOOR_OPTIONS.map(floor => (
                    <Badge key={floor} variant={filters.floor.includes(floor) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleArrayFilter("floor", floor)} data-testid={`badge-comm-floor-${floor.toLowerCase().replace(/\+/g, "plus")}`}>
                      {floor}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}
      </Accordion>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-muted/30 border-b py-4">
          <div className="container mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span>/</span>
              <Link href="/properties" className="hover:text-foreground">Rent</Link>
              {city && (
                <>
                  <span>/</span>
                  <Link href={`/rent/${params.city}`} className="hover:text-foreground capitalize">{city}</Link>
                </>
              )}
              {locality && (
                <>
                  <span>/</span>
                  <span className="text-foreground capitalize">{locality}</span>
                </>
              )}
            </nav>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">
              {pageTitle}
            </h1>
            {(city || locality) && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{locality ? `${locality}, ${city}` : city}</span>
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-20 bg-background border rounded-lg p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <FilterSection />
              </div>
            </aside>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden gap-2" data-testid="button-mobile-filters">
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] overflow-y-auto">
                      <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                      <div className="mt-4"><FilterSection /></div>
                    </SheetContent>
                  </Sheet>
                  <span className="text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : `${properties.length}+ properties found`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-40" data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filters.bhk.map(b => <Badge key={b} variant="secondary" className="gap-1">{b}<X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter("bhk", b)} /></Badge>)}
                  {filters.propertyType.map(t => <Badge key={t} variant="secondary" className="gap-1">{t}<X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter("propertyType", t)} /></Badge>)}
                  {filters.furnishing.map(f => <Badge key={f} variant="secondary" className="gap-1">{f}<X className="h-3 w-3 cursor-pointer" onClick={() => toggleArrayFilter("furnishing", f)} /></Badge>)}
                  {(filters.rentMin || filters.rentMax) && <Badge variant="secondary" className="gap-1">₹{filters.rentMin?.toLocaleString()} - ₹{filters.rentMax?.toLocaleString()}<X className="h-3 w-3 cursor-pointer" onClick={() => setRentRange(undefined, undefined)} /></Badge>}
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      <Skeleton className="h-48 w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : properties.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters or search in a different area</p>
                  <Button onClick={clearAllFilters} data-testid="button-clear-filters-empty">Clear All Filters</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {properties.map((property) => <PropertyCard key={property.id} property={property} />)}
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page === 1 || isFetching} data-testid="button-prev-page">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">Page {page}</span>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={!hasMore || isFetching} data-testid="button-next-page">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {isFetching && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <SeoFooter />
    </div>
  );
}
