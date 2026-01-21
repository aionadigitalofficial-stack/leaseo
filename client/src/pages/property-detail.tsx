import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";
import { PropertyCard, PropertyCardSkeleton, type PropertyWithDetails } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BedDouble,
  Bath,
  Ruler,
  MapPin,
  Calendar,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Phone,
  Shield,
  Building2,
  Layers,
  Compass,
  Sofa,
  Car,
  Home,
  ArrowLeft,
  MessageCircle,
  Mail,
  BadgeCheck,
  Clock,
  Users,
  X,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Property } from "@shared/schema";

function formatINR(amount: string | number | null | undefined): string {
  if (!amount) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 2)} Cr`;
  } else if (num >= 100000) {
    return `${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)} L`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)} K`;
  }
  return num.toLocaleString("en-IN");
}

function formatAvailability(date: Date | string | null | undefined): string {
  if (!date) return "Immediate";
  const availableDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (availableDate <= today) return "Immediate";
  
  const diffDays = Math.ceil((availableDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return "Within 1 Week";
  if (diffDays <= 15) return "Within 15 Days";
  if (diffDays <= 30) return "Within 30 Days";
  
  return availableDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getBhkLabel(bedrooms: number | null | undefined, propertyType: string): string {
  if (propertyType === "studio") return "Studio Apartment";
  if (!bedrooms) return "";
  if (bedrooms === 1) return "1 RK/1 BHK";
  return `${bedrooms} BHK`;
}

function maskPhoneNumber(phone: string): string {
  if (!phone) return "+91 XXXXXX1234";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `+91 XXXXXX${digits.slice(-4)}`;
  }
  return "+91 XXXXXX1234";
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop",
];

interface ExtendedProperty extends Property {
  images?: string[];
  locality?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerVerified?: boolean;
  preferredTenant?: string[];
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<"phone" | "email">("phone");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const { data: property, isLoading, error } = useQuery<ExtendedProperty>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const cityParam = property?.cityId || "";
  const { data: similarProperties = [] } = useQuery<ExtendedProperty[]>({
    queryKey: [`/api/properties?cityId=${encodeURIComponent(cityParam)}&limit=4&exclude=${id}`],
    enabled: !!cityParam && !!id,
  });

  const handleSendOtp = async () => {
    setOtpError(null);
    setOtpLoading(true);
    try {
      const payload = verifyMethod === "phone" 
        ? { phone: phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`, purpose: "contact_owner" }
        : { email, purpose: "contact_owner" };
      
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }
      setOtpSent(true);
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const isValidContact = verifyMethod === "phone" 
    ? phoneNumber.length >= 10 
    : email.includes("@") && email.includes(".");

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    
    setOtpError(null);
    setOtpLoading(true);
    try {
      const payload = verifyMethod === "phone" 
        ? { phone: phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`, code: otp }
        : { email, code: otp };
      
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid OTP");
      }
      
      setOtpVerified(true);
      setRevealedPhone(property?.ownerPhone || "+91 98765 43210");
      setShowContactDialog(false);
    } catch (err: any) {
      setOtpError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCallClick = () => {
    if (otpVerified && revealedPhone) {
      window.location.href = `tel:${revealedPhone}`;
    } else {
      setShowContactDialog(true);
    }
  };

  const handleWhatsAppClick = () => {
    if (otpVerified && revealedPhone) {
      const cleanPhone = revealedPhone.replace(/\D/g, "");
      const message = encodeURIComponent(`Hi, I'm interested in this property: ${property?.title}`);
      window.open(`https://wa.me/91${cleanPhone}?text=${message}`, "_blank");
    } else {
      setShowContactDialog(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <PropertyDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The property you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/properties">
              <Button>Browse All Properties</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const images = property.images && property.images.length > 0 ? property.images : PLACEHOLDER_IMAGES;
  const bhkLabel = getBhkLabel(property.bedrooms, property.propertyType);
  const amenities = property.amenities || [];
  const isCommercial = property.isCommercial;
  const locality = property.locality || property.address?.split(",")[0] || "";
  const city = property.city || "";
  const preferredTenants = property.preferredTenant || ["Family", "Bachelor", "Company"];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${property.title} - ${bhkLabel} for ${property.listingType === "sale" ? "Sale" : "Rent"} in ${city} | Leaseo`}
        description={property.description?.substring(0, 160) || `${bhkLabel} available for ${property.listingType} in ${locality}, ${city}. Zero brokerage, verified owner.`}
        keywords={[property.propertyType, bhkLabel, city, locality, property.listingType || "rent", "zero brokerage", "property rental"].filter(Boolean) as string[]}
      />
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-4">
          <Link href="/properties" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Link>
        </div>

        <section className="container mx-auto px-4 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div 
              className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setShowGallery(true)}
            >
              <img
                src={images[currentImageIndex]}
                alt={property.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <Badge className="bg-green-600 text-white border-0">
                  Zero Brokerage
                </Badge>
                {property.isFeatured && (
                  <Badge className="bg-amber-500 text-white border-0">Featured</Badge>
                )}
                {property.ownerVerified && (
                  <Badge className="bg-blue-600 text-white border-0 gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    Verified Owner
                  </Badge>
                )}
              </div>
              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                    }}
                    data-testid="button-prev-image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70 shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => (prev + 1) % images.length);
                    }}
                    data-testid="button-next-image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-3 right-3">
                    <Badge variant="secondary" className="bg-black/70 text-white border-0">
                      {currentImageIndex + 1} / {images.length}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {images.slice(1, 5).map((img, idx) => (
                <div
                  key={idx}
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all hover-elevate ${
                    currentImageIndex === idx + 1 ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setCurrentImageIndex(idx + 1)}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {idx === 3 && images.length > 5 && (
                    <div 
                      className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGallery(true);
                      }}
                    >
                      <span className="text-white font-semibold">+{images.length - 5} Photos</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-property-title">
                    {bhkLabel} {property.propertyType === "apartment" ? "Apartment" : property.propertyType} for Rent
                  </h1>
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{locality}, {city}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {property.propertyType}
                    </Badge>
                    {property.furnishing && (
                      <Badge variant="outline" className="capitalize">
                        {property.furnishing.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {isCommercial && (
                      <Badge variant="outline">Commercial</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsFavorited(!isFavorited)}
                    data-testid="button-favorite"
                  >
                    <Heart className={`h-5 w-5 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button variant="outline" size="icon" data-testid="button-share">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rent</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-rent">
                      {"\u20B9"}{formatINR(property.rent)}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Security Deposit</p>
                    <p className="text-xl font-semibold" data-testid="text-deposit">
                      {property.securityDeposit ? `\u20B9${formatINR(property.securityDeposit)}` : "Negotiable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Maintenance</p>
                    <p className="text-xl font-semibold" data-testid="text-maintenance">
                      {property.maintenanceCharges ? `\u20B9${formatINR(property.maintenanceCharges)}/month` : "Included"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Property Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {bhkLabel && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <BedDouble className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{property.bedrooms || "Studio"}</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.squareFeet && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Ruler className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Super Built-up</p>
                        <p className="font-medium">{property.squareFeet.toLocaleString("en-IN")} sqft</p>
                      </div>
                    </div>
                  )}
                  {property.carpetArea && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Carpet Area</p>
                        <p className="font-medium">{property.carpetArea.toLocaleString("en-IN")} sqft</p>
                      </div>
                    </div>
                  )}
                  {property.floorNumber !== null && property.floorNumber !== undefined && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Floor</p>
                        <p className="font-medium">
                          {property.floorNumber === 0 ? "Ground" : property.floorNumber}
                          {property.totalFloors ? ` of ${property.totalFloors}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.facing && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Compass className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Facing</p>
                        <p className="font-medium capitalize">{property.facing}</p>
                      </div>
                    </div>
                  )}
                  {property.furnishing && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Sofa className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Furnishing</p>
                        <p className="font-medium capitalize">{property.furnishing.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  )}
                  {property.balconies !== null && property.balconies !== undefined && property.balconies > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Balconies</p>
                        <p className="font-medium">{property.balconies}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="text-xl font-semibold mb-4">About This Property</h2>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-description">
                  {property.description}
                </p>
              </div>

              {amenities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Amenities & Features</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center gap-2 p-2">
                          <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-sm">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Availability
                  </h2>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{formatAvailability(property.availableFrom)}</p>
                          <p className="text-sm text-muted-foreground">Move-in Date</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Preferred Tenants
                  </h2>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {preferredTenants.map((tenant) => (
                          <Badge key={tenant} variant="outline" className="py-1.5">
                            {tenant}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10">
                        <User className="h-7 w-7 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{property.ownerName || "Property Owner"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {property.ownerVerified ? (
                          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 gap-1 text-xs">
                            <BadgeCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Owner</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Zero Brokerage Property</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                      Deal directly with the owner - No middlemen!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      className="w-full gap-2" 
                      onClick={handleCallClick}
                      data-testid="button-call-owner"
                    >
                      <Phone className="h-4 w-4" />
                      {otpVerified ? "Call Owner" : maskPhoneNumber(property.ownerPhone || "")}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                      onClick={handleWhatsAppClick}
                      data-testid="button-whatsapp"
                    >
                      <SiWhatsapp className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>

                  {!otpVerified && (
                    <p className="text-xs text-center text-muted-foreground">
                      Verify your phone number to see owner contact
                    </p>
                  )}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span>Typically responds within 2 hours</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="h-4 w-4" />
                      <span>Site visit available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {similarProperties.length > 0 && (
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-8">Similar Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {similarProperties.slice(0, 4).map((prop) => (
                  <PropertyCard 
                    key={prop.id} 
                    property={prop as PropertyWithDetails}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify to View Contact</DialogTitle>
            <DialogDescription>
              Enter your phone number or email to view the owner's contact details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!otpSent ? (
              <Tabs value={verifyMethod} onValueChange={(v) => { setVerifyMethod(v as "phone" | "email"); setOtpError(null); }} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="phone" data-testid="tab-phone-verify">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email-verify">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="phone" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 border rounded-md bg-muted text-sm">
                        +91
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="flex-1"
                        data-testid="input-phone-verify"
                      />
                    </div>
                  </div>
                  {otpError && (
                    <p className="text-sm text-red-500">{otpError}</p>
                  )}
                  <Button 
                    className="w-full" 
                    onClick={handleSendOtp}
                    disabled={phoneNumber.length < 10 || otpLoading}
                    data-testid="button-send-otp-phone"
                  >
                    {otpLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </TabsContent>
                <TabsContent value="email" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email-verify"
                    />
                  </div>
                  {otpError && (
                    <p className="text-sm text-red-500">{otpError}</p>
                  )}
                  <Button 
                    className="w-full" 
                    onClick={handleSendOtp}
                    disabled={!email.includes("@") || !email.includes(".") || otpLoading}
                    data-testid="button-send-otp-email"
                  >
                    {otpLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-lg tracking-widest"
                    data-testid="input-otp"
                  />
                  <p className="text-sm text-muted-foreground">
                    OTP sent to {verifyMethod === "phone" ? `+91 ${phoneNumber}` : email}
                  </p>
                </div>
                {otpError && (
                  <p className="text-sm text-red-500">{otpError}</p>
                )}
                <Button 
                  className="w-full" 
                  onClick={handleVerifyOtp}
                  disabled={otp.length < 6 || otpLoading}
                  data-testid="button-verify-otp"
                >
                  {otpLoading ? "Verifying..." : "Verify & View Contact"}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setOtpSent(false)}
                >
                  Change {verifyMethod === "phone" ? "Number" : "Email"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Property Gallery</DialogTitle>
          </DialogHeader>
          <div className="relative h-full flex items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10"
              onClick={() => setShowGallery(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <img
              src={images[currentImageIndex]}
              alt={`Image ${currentImageIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70"
              onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/70"
              onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Badge variant="secondary">{currentImageIndex + 1} / {images.length}</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function PropertyDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="aspect-[4/3] rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    </div>
  );
}
