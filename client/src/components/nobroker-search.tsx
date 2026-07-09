import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronDown, Building2, Home, Users, Bed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  INDIAN_CITIES,
  BHK_OPTIONS,
  PROPERTY_TYPES_COMMERCIAL,
} from "@/lib/constants";
import type { FeatureFlag } from "@shared/schema";

const RESIDENTIAL_TYPES = [
  { id: "full-house", label: "Full House", icon: Home },
  { id: "pg-hostel", label: "PG/Hostel", icon: Users },
  { id: "flatmates", label: "Flatmates", icon: Users },
];

type TabType = "rent" | "buy" | "commercial";

export function NoBrokerSearch() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("rent");
  const [city, setCity] = useState("Mumbai");
  const [locality, setLocality] = useState("");
  const [residentialType, setResidentialType] = useState("full-house");
  const [bhk, setBhk] = useState("");
  const [commercialListingType, setCommercialListingType] = useState<"rent" | "buy">("rent");
  const [selectedCommercialTypes, setSelectedCommercialTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data: featureFlags = [] } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/feature-flags"],
  });

  const showBuyTab = featureFlags.some(
    (flag) => flag.name === "sell_property" && flag.enabled
  );

  const handleSearch = () => {
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");
    const localitySlug = locality.trim() ? locality.toLowerCase().replace(/\s+/g, "-") : "";

    const params = new URLSearchParams();
    if (activeTab === "commercial") {
      params.set("type", "commercial");
      params.set("listingType", commercialListingType === "buy" ? "sale" : "rent");
      if (selectedCommercialTypes.length > 0) {
        params.set("propertyType", selectedCommercialTypes.join(","));
      }
    } else if (activeTab === "buy") {
      params.set("listingType", "sale");
      if (bhk) params.set("bhk", bhk);
    } else {
      if (bhk) params.set("bhk", bhk);
    }
    if (minPrice) params.set("rentMin", minPrice);
    if (maxPrice) params.set("rentMax", maxPrice);

    const listingPath = (activeTab === "buy" || (activeTab === "commercial" && commercialListingType === "buy")) ? "buy" : "rent";
    const basePath = localitySlug ? `/${listingPath}/${citySlug}/${localitySlug}` : `/${listingPath}/${citySlug}`;
    const queryString = params.toString();
    setLocation(queryString ? `${basePath}?${queryString}` : basePath);
  };

  const toggleCommercialType = (typeId: string) => {
    setSelectedCommercialTypes(prev =>
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-background rounded-lg shadow-lg border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("rent")}
            className={cn(
              "flex-1 py-3 px-6 text-center font-medium transition-colors relative",
              activeTab === "rent"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-rent"
          >
            Rent
            {activeTab === "rent" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          {showBuyTab && (
            <button
              onClick={() => setActiveTab("buy")}
              className={cn(
                "flex-1 py-3 px-6 text-center font-medium transition-colors relative",
                activeTab === "buy"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="tab-buy"
            >
              Buy
              {activeTab === "buy" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("commercial")}
            className={cn(
              "flex-1 py-3 px-6 text-center font-medium transition-colors relative",
              activeTab === "commercial"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-commercial"
          >
            Commercial
            {activeTab === "commercial" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-full md:w-40 h-12" data-testid="select-city">
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 relative">
              <Input
                placeholder="Search upto 3 localities or landmarks"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="h-12 pr-24"
                data-testid="input-locality"
              />
            </div>

            <Button
              onClick={handleSearch}
              className="h-12 px-8 bg-primary hover:bg-primary/90"
              data-testid="button-search"
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>

          {activeTab === "commercial" ? (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="commercial-listing-type"
                    checked={commercialListingType === "rent"}
                    onChange={() => setCommercialListingType("rent")}
                    className="w-4 h-4 text-primary"
                    data-testid="radio-commercial-rent"
                  />
                  <span className="text-sm">Rent</span>
                </label>
                {showBuyTab && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="commercial-listing-type"
                      checked={commercialListingType === "buy"}
                      onChange={() => setCommercialListingType("buy")}
                      className="w-4 h-4 text-primary"
                      data-testid="radio-commercial-buy"
                    />
                    <span className="text-sm">Buy</span>
                  </label>
                )}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 gap-2"
                    data-testid="button-property-type"
                  >
                    <Building2 className="h-4 w-4" />
                    {selectedCommercialTypes.length > 0
                      ? `${selectedCommercialTypes.length} Types Selected`
                      : "Property Type"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-2">
                    {PROPERTY_TYPES_COMMERCIAL.map((type) => (
                      <label
                        key={type.value}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedCommercialTypes.includes(type.value)}
                          onCheckedChange={() => toggleCommercialType(type.value)}
                          data-testid={`checkbox-commercial-${type.value}`}
                        />
                        <span className="text-sm">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-28 h-9"
                data-testid="input-min-price-commercial"
              />
              <Input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-28 h-9"
                data-testid="input-max-price-commercial"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              {activeTab === "rent" && (
                <div className="flex items-center gap-2">
                  {RESIDENTIAL_TYPES.map((type) => (
                    <label
                      key={type.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="residential-type"
                        value={type.id}
                        checked={residentialType === type.id}
                        onChange={(e) => setResidentialType(e.target.value)}
                        className="w-4 h-4 text-primary"
                        data-testid={`radio-${type.id}`}
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 gap-2"
                    data-testid="button-bhk-type"
                  >
                    <Bed className="h-4 w-4" />
                    {bhk || "BHK Type"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-1">
                    {BHK_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                      >
                        <input
                          type="radio"
                          name="bhk-type"
                          checked={bhk === option}
                          onChange={() => setBhk(option)}
                          className="w-4 h-4 text-primary"
                          data-testid={`radio-bhk-${option.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                    {bhk && (
                      <button
                        onClick={() => setBhk("")}
                        className="text-xs text-muted-foreground hover:text-foreground pl-2 pt-1"
                        data-testid="button-clear-bhk"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                type="number"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-28 h-9"
                data-testid="input-min-price"
              />
              <Input
                type="number"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-28 h-9"
                data-testid="input-max-price"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">Are you a Property Owner?</p>
        <Link href="/post-property">
          <Button
            variant="default"
            data-testid="button-post-property"
          >
            Post Free Property Ad
          </Button>
        </Link>
      </div>
    </div>
  );
}
