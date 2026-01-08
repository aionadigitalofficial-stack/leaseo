import { useState } from "react";
import { useLocation } from "wouter";
import { Search, ChevronDown, Check, Building2, Home, Users, Bed } from "lucide-react";
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
  RENT_RANGES,
} from "@/lib/constants";

const RESIDENTIAL_TYPES = [
  { id: "full-house", label: "Full House", icon: Home },
  { id: "pg-hostel", label: "PG/Hostel", icon: Users },
  { id: "flatmates", label: "Flatmates", icon: Users },
];

type TabType = "rent" | "commercial";

export function NoBrokerSearch() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("rent");
  const [city, setCity] = useState("Mumbai");
  const [locality, setLocality] = useState("");
  const [residentialType, setResidentialType] = useState("full-house");
  const [selectedBhks, setSelectedBhks] = useState<string[]>([]);
  const [selectedCommercialTypes, setSelectedCommercialTypes] = useState<string[]>([]);
  const [rentRange, setRentRange] = useState("");

  const handleSearch = () => {
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");
    const localitySlug = locality.trim() ? locality.toLowerCase().replace(/\s+/g, "-") : "";
    
    const params = new URLSearchParams();
    if (activeTab === "commercial") {
      params.set("type", "commercial");
      if (selectedCommercialTypes.length > 0) {
        params.set("propertyType", selectedCommercialTypes.join(","));
      }
    } else {
      if (selectedBhks.length > 0) {
        params.set("bhk", selectedBhks.join(","));
      }
    }
    if (rentRange) {
      if (rentRange.endsWith("+")) {
        const min = rentRange.replace("+", "");
        params.set("rentMin", min);
        params.set("rentMax", "999999");
      } else {
        const [min, max] = rentRange.split("-");
        if (min) params.set("rentMin", min);
        if (max) params.set("rentMax", max);
      }
    }
    
    const basePath = localitySlug ? `/rent/${citySlug}/${localitySlug}` : `/rent/${citySlug}`;
    const queryString = params.toString();
    setLocation(queryString ? `${basePath}?${queryString}` : basePath);
  };

  const toggleBhk = (bhkId: string) => {
    setSelectedBhks(prev =>
      prev.includes(bhkId) ? prev.filter(b => b !== bhkId) : [...prev, bhkId]
    );
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

          {activeTab === "rent" ? (
            <div className="flex flex-wrap items-center gap-4">
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

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 gap-2"
                    data-testid="button-bhk-type"
                  >
                    <Bed className="h-4 w-4" />
                    {selectedBhks.length > 0
                      ? `${selectedBhks.length} BHK Selected`
                      : "BHK Type"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <div className="space-y-2">
                    {BHK_OPTIONS.map((bhk) => (
                      <label
                        key={bhk}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedBhks.includes(bhk)}
                          onCheckedChange={() => toggleBhk(bhk)}
                          data-testid={`checkbox-bhk-${bhk.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                        <span className="text-sm">{bhk}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={rentRange} onValueChange={setRentRange}>
                <SelectTrigger className="w-40 h-9" data-testid="select-rent-range">
                  <SelectValue placeholder="Rent Range" />
                </SelectTrigger>
                <SelectContent>
                  {RENT_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
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
                        key={type}
                        className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedCommercialTypes.includes(type)}
                          onCheckedChange={() => toggleCommercialType(type)}
                          data-testid={`checkbox-commercial-${type.toLowerCase().replace(/\s+/g, "-")}`}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={rentRange} onValueChange={setRentRange}>
                <SelectTrigger className="w-40 h-9" data-testid="select-rent-range-commercial">
                  <SelectValue placeholder="Rent Range" />
                </SelectTrigger>
                <SelectContent>
                  {RENT_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">Are you a Property Owner?</p>
        <Button
          variant="default"
          className="bg-green-600 hover:bg-green-700 text-white"
          data-testid="button-post-property"
        >
          Post Free Property Ad
        </Button>
      </div>
    </div>
  );
}
