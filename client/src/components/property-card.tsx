import { useState } from "react";
import { Link } from "wouter";
import { Heart, MapPin, Calendar, Ruler, Bath, BedDouble, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from "@shared/schema";

export interface PropertyWithDetails extends Property {
  images?: string[];
  locality?: string;
  city?: string;
}

interface PropertyCardProps {
  property: PropertyWithDetails;
  onShortlist?: (propertyId: string) => void;
  isShortlisted?: boolean;
}

function formatINR(amount: string | number | null | undefined): string {
  if (!amount) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 2)}Cr`;
  } else if (num >= 100000) {
    return `${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  }
  return num.toLocaleString("en-IN");
}

function formatAvailability(date: Date | string | null | undefined): string {
  if (!date) return "Available Now";
  const availableDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (availableDate <= today) return "Available Now";
  
  const diffDays = Math.ceil((availableDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "Available This Week";
  if (diffDays <= 15) return "Within 15 Days";
  if (diffDays <= 30) return "Within 30 Days";
  
  return availableDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getBhkLabel(bedrooms: number | null | undefined, propertyType: string): string {
  if (propertyType === "studio") return "Studio";
  if (!bedrooms) return "";
  if (bedrooms === 1 && propertyType === "apartment") return "1 RK";
  return `${bedrooms} BHK`;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop&auto=format";

export function PropertyCard({ property, onShortlist, isShortlisted = false }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const images = property.images && property.images.length > 0 
    ? property.images 
    : [PLACEHOLDER_IMAGE];
  
  const bhkLabel = getBhkLabel(property.bedrooms, property.propertyType);
  const isCommercial = property.isCommercial;
  const locality = property.locality || property.address?.split(",")[0] || "";

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    setImageLoaded(false);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    setImageLoaded(false);
  };

  const handleShortlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShortlist?.(property.id);
  };

  return (
    <Link href={`/properties/${property.id}`} data-testid={`card-property-${property.id}`}>
      <Card 
        className="overflow-visible group cursor-pointer hover-elevate active-elevate-2 transition-all duration-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-md bg-muted">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={imageError ? PLACEHOLDER_IMAGE : images[currentImageIndex]}
            alt={property.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            data-testid={`img-property-${property.id}`}
          />
          
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            <Badge variant="secondary" className="bg-green-600 text-white border-0 text-xs">
              Zero Brokerage
            </Badge>
            {property.isFeatured && (
              <Badge variant="secondary" className="bg-amber-500 text-white border-0 text-xs">
                Featured
              </Badge>
            )}
            {property.isPremium && (
              <Badge variant="secondary" className="bg-purple-600 text-white border-0 text-xs">
                Premium
              </Badge>
            )}
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className={`absolute top-2 right-2 bg-white/80 dark:bg-black/50 backdrop-blur-sm ${
              isShortlisted ? "text-red-500" : "text-muted-foreground"
            }`}
            onClick={handleShortlistClick}
            data-testid={`button-shortlist-${property.id}`}
          >
            <Heart className={`h-5 w-5 ${isShortlisted ? "fill-current" : ""}`} />
          </Button>

          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-opacity ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
                onClick={prevImage}
                data-testid={`button-prev-image-${property.id}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-opacity ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
                onClick={nextImage}
                data-testid={`button-next-image-${property.id}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_: string, idx: number) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentImageIndex ? "bg-white w-3" : "bg-white/60 w-1.5"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xl font-semibold text-foreground" data-testid={`text-rent-${property.id}`}>
                {property.rent ? (
                  <>
                    {"\u20B9"}{formatINR(property.rent)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </>
                ) : (
                  <span className="text-base">Price on request</span>
                )}
              </p>
              {property.securityDeposit && (
                <p className="text-sm text-muted-foreground" data-testid={`text-deposit-${property.id}`}>
                  {"\u20B9"}{formatINR(property.securityDeposit)} Deposit
                </p>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-sm text-muted-foreground">
            {bhkLabel && (
              <span className="flex items-center gap-1" data-testid={`text-bhk-${property.id}`}>
                <BedDouble className="h-4 w-4" />
                {bhkLabel}
              </span>
            )}
            {property.bathrooms && Number(property.bathrooms) > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                {property.bathrooms} Bath
              </span>
            )}
            {property.squareFeet && (
              <span className="flex items-center gap-1" data-testid={`text-area-${property.id}`}>
                <Ruler className="h-4 w-4" />
                {property.squareFeet.toLocaleString("en-IN")} sqft
              </span>
            )}
            {isCommercial && property.carpetArea && (
              <span className="flex items-center gap-1" data-testid={`text-carpet-area-${property.id}`}>
                <Ruler className="h-4 w-4" />
                {property.carpetArea.toLocaleString("en-IN")} carpet
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate" data-testid={`text-locality-${property.id}`}>
              {locality}
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span data-testid={`text-availability-${property.id}`}>
              {formatAvailability(property.availableFrom)}
            </span>
          </div>
          
          {property.furnishing && property.furnishing !== "unfurnished" && (
            <div className="mt-3">
              <Badge variant="outline" className="text-xs capitalize">
                {property.furnishing.replace(/_/g, " ")}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface PropertyCardSkeletonProps {
  count?: number;
}

export function PropertyCardSkeleton({ count = 1 }: PropertyCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-[4/3] bg-muted animate-pulse" />
          <CardContent className="p-4 space-y-3">
            <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}
