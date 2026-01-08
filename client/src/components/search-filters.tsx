import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import type { PropertyFilters } from "@shared/schema";

const amenitiesList = [
  "Air Conditioning",
  "Heating",
  "Washer/Dryer",
  "Dishwasher",
  "Parking",
  "Gym",
  "Pool",
  "Pet Friendly",
  "Balcony",
  "Furnished",
  "Storage",
  "Elevator",
];

interface SearchFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  showSaleOption?: boolean;
  resultsCount?: number;
}

export function SearchFilters({ 
  filters, 
  onFiltersChange, 
  showSaleOption = false,
  resultsCount = 0 
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<PropertyFilters>(filters);
  const [searchTerm, setSearchTerm] = useState(filters.city || "");

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleApplyFilters = () => {
    onFiltersChange({ ...localFilters, city: searchTerm });
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const cleared: PropertyFilters = {};
    setLocalFilters(cleared);
    setSearchTerm("");
    onFiltersChange(cleared);
  };

  const removeFilter = (key: keyof PropertyFilters) => {
    const updated = { ...filters };
    delete updated[key];
    onFiltersChange(updated);
    setLocalFilters(updated);
  };

  const toggleAmenity = (amenity: string) => {
    const current = localFilters.amenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    setLocalFilters({ ...localFilters, amenities: updated });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar and Filter Button */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by city or location..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
            data-testid="input-filter-search"
          />
        </div>

        {/* Listing Type Toggle */}
        {showSaleOption && (
          <div className="flex gap-1 p-1 bg-muted rounded-md">
            <Button
              size="sm"
              variant={filters.listingType === "rent" || !filters.listingType ? "secondary" : "ghost"}
              onClick={() => onFiltersChange({ ...filters, listingType: "rent" })}
              data-testid="filter-rent"
            >
              Rent
            </Button>
            <Button
              size="sm"
              variant={filters.listingType === "sale" ? "secondary" : "ghost"}
              onClick={() => onFiltersChange({ ...filters, listingType: "sale" })}
              data-testid="filter-sale"
            >
              Buy
            </Button>
          </div>
        )}

        {/* Quick Filters */}
        <Select
          value={filters.propertyType || ""}
          onValueChange={(value) => onFiltersChange({ ...filters, propertyType: value || undefined })}
        >
          <SelectTrigger className="w-[140px]" data-testid="filter-property-type">
            <SelectValue placeholder="Type" />
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

        <Select
          value={filters.minBedrooms?.toString() || ""}
          onValueChange={(value) => onFiltersChange({ ...filters, minBedrooms: value ? parseInt(value) : undefined })}
        >
          <SelectTrigger className="w-[120px]" data-testid="filter-bedrooms">
            <SelectValue placeholder="Beds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1+ Bed</SelectItem>
            <SelectItem value="2">2+ Beds</SelectItem>
            <SelectItem value="3">3+ Beds</SelectItem>
            <SelectItem value="4">4+ Beds</SelectItem>
            <SelectItem value="5">5+ Beds</SelectItem>
          </SelectContent>
        </Select>

        {/* More Filters Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-more-filters">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Properties</SheetTitle>
              <SheetDescription>
                Refine your search with advanced filters
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-6">
              {/* Price Range */}
              <div className="space-y-3">
                <Label>Price Range (per month)</Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={localFilters.minPrice || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, minPrice: e.target.value ? parseInt(e.target.value) : undefined })}
                    data-testid="input-min-price"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={localFilters.maxPrice || ""}
                    onChange={(e) => setLocalFilters({ ...localFilters, maxPrice: e.target.value ? parseInt(e.target.value) : undefined })}
                    data-testid="input-max-price"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div className="space-y-3">
                <Label>Bedrooms</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      size="sm"
                      variant={localFilters.minBedrooms === num ? "default" : "outline"}
                      onClick={() => setLocalFilters({ ...localFilters, minBedrooms: localFilters.minBedrooms === num ? undefined : num })}
                    >
                      {num}+
                    </Button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div className="space-y-3">
                <Label>Bathrooms</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((num) => (
                    <Button
                      key={num}
                      size="sm"
                      variant={localFilters.minBathrooms === num ? "default" : "outline"}
                      onClick={() => setLocalFilters({ ...localFilters, minBathrooms: localFilters.minBathrooms === num ? undefined : num })}
                    >
                      {num}+
                    </Button>
                  ))}
                </div>
              </div>

              {/* Property Type */}
              <div className="space-y-3">
                <Label>Property Type</Label>
                <Select
                  value={localFilters.propertyType || ""}
                  onValueChange={(value) => setLocalFilters({ ...localFilters, propertyType: value || undefined })}
                >
                  <SelectTrigger data-testid="filter-modal-property-type">
                    <SelectValue placeholder="Any" />
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
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 gap-3">
                  {amenitiesList.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <Checkbox
                        id={amenity}
                        checked={(localFilters.amenities || []).includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                        data-testid={`checkbox-amenity-${amenity.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      <Label htmlFor={amenity} className="text-sm font-normal cursor-pointer">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="flex gap-2">
              <Button variant="outline" onClick={handleClearFilters} className="flex-1" data-testid="button-clear-filters">
                Clear All
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1" data-testid="button-apply-filters">
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Button onClick={handleApplyFilters} data-testid="button-search">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
          </span>
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              {filters.city}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('city')} />
            </Badge>
          )}
          {filters.propertyType && (
            <Badge variant="secondary" className="gap-1 capitalize">
              {filters.propertyType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('propertyType')} />
            </Badge>
          )}
          {filters.minBedrooms && (
            <Badge variant="secondary" className="gap-1">
              {filters.minBedrooms}+ beds
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('minBedrooms')} />
            </Badge>
          )}
          {filters.minPrice && (
            <Badge variant="secondary" className="gap-1">
              Min ${filters.minPrice}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('minPrice')} />
            </Badge>
          )}
          {filters.maxPrice && (
            <Badge variant="secondary" className="gap-1">
              Max ${filters.maxPrice}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('maxPrice')} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleClearFilters} data-testid="button-clear-all">
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
