import { useState } from "react";
import { Link } from "wouter";
import { Heart, Bed, Bath, Square, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@shared/schema";

interface PropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export function PropertyCard({ property, onFavorite, isFavorited = false }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const images = property.images && property.images.length > 0 
    ? property.images 
    : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop"];

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFavorite?.(property.id);
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  return (
    <Link href={`/property/${property.id}`} data-testid={`card-property-${property.id}`}>
      <Card 
        className="overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={images[currentImageIndex]}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          
          {/* Favorite Button */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-sm"
            onClick={handleFavorite}
            data-testid={`button-favorite-${property.id}`}
          >
            <Heart 
              className={`h-5 w-5 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
            />
          </Button>

          {/* Image Navigation */}
          {images.length > 1 && isHovered && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                onClick={prevImage}
                data-testid={`button-prev-image-${property.id}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                onClick={nextImage}
                data-testid={`button-next-image-${property.id}`}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Image Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Status Badge */}
          {property.status !== 'active' && (
            <Badge 
              variant="secondary" 
              className="absolute top-3 left-3 capitalize"
            >
              {property.status}
            </Badge>
          )}
          
          {/* Featured Badge */}
          {property.isFeatured && (
            <Badge 
              className="absolute top-3 left-3 bg-primary"
            >
              Featured
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <CardContent className="p-4">
          {/* Price */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-xl font-bold" data-testid={`text-price-${property.id}`}>
              {formatPrice(property.price)}
            </span>
            {property.listingType === 'rent' && (
              <span className="text-muted-foreground text-sm">
                /{property.priceUnit || 'month'}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-1 mb-1" data-testid={`text-title-${property.id}`}>
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{property.city}, {property.state}</span>
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms} {Number(property.bathrooms) === 1 ? 'bath' : 'baths'}</span>
            </div>
            {property.squareFeet && (
              <div className="flex items-center gap-1.5">
                <Square className="h-4 w-4" />
                <span>{property.squareFeet.toLocaleString()} sqft</span>
              </div>
            )}
          </div>

          {/* Property Type Badge */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
            <Badge variant="outline" className="capitalize text-xs">
              {property.propertyType}
            </Badge>
            <Badge 
              variant={property.listingType === 'rent' ? 'secondary' : 'default'} 
              className="text-xs capitalize"
            >
              For {property.listingType}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
