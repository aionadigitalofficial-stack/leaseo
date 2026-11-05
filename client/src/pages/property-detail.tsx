import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
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
  BadgeCheck,
  Clock,
  Users,
  X,
  Flag,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Property } from "@shared/schema";

// Issue #4: reasons a visitor can report a listing for, including a
// dedicated "posted by a broker" option per the brief.
const REPORT_REASONS = [
  { value: "broker_listing", label: "Posted by a broker/agent, not the owner" },
  { value: "fake_listing", label: "Fake Listing" },
  { value: "incorrect_info", label: "Incorrect Information" },
  { value: "already_rented", label: "Already Rented/Sold" },
  { value: "scam", label: "Suspected Scam" },
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "other", label: "Other" },
];

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

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&auto=format&fit=crop",
];

type ExtendedProperty = Omit<Property, "priceOptions"> & {
  images?: string[];
  locality?: string;
  ownerName?: string;
  priceOptions?: { label: string; amount: string }[];
  ownerPhone?: string;
  ownerVerified?: boolean;
  preferredTenant?: string[];
};

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [contactAction, setContactAction] = useState<"whatsapp" | "call" | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactConsent, setContactConsent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);
  const requestPropertyRef = useRef(id);
  const requestUserRef = useRef(user?.id ?? null);

  // Issue #4: "Report this listing" - visible on every public listing page
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    requestGenerationRef.current += 1;
    requestPropertyRef.current = id;
    requestUserRef.current = user?.id ?? null;
    setCurrentImageIndex(0);
    setIsFavorited(false);
    setShowGallery(false);
    setPhoneVerified(false);
    setRevealedPhone(null);
    setOtpSent(false);
    setOtp("");
    setContactAction(null);
    setContactBusy(false);
    setContactConsent(false);
    setOtpError(null);
    setContactSuccess(null);
    setShowContactDialog(false);
    setShowReportDialog(false);
    setReportReason("");
    setReportDescription("");
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [id, user?.id]);

  const { data: property, isLoading, error } = useQuery<ExtendedProperty>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/reports", {
        propertyId: id,
        reason: reportReason,
        description: reportDescription,
      });
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you - our team will review this listing.",
      });
      setShowReportDialog(false);
      setReportReason("");
      setReportDescription("");
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't submit report",
        description: err.message?.includes("401") ? "Please log in to report a listing." : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReportClick = () => {
    if (!isAuthenticated) {
      toast({ title: "Please log in", description: "You need an account to report a listing." });
      navigate(`/login?redirect=${encodeURIComponent(`/properties/${id}`)}`);
      return;
    }
    setShowReportDialog(true);
  };

  const handleSubmitReport = () => {
    if (!reportReason) {
      toast({ title: "Please select a reason", variant: "destructive" });
      return;
    }
    reportMutation.mutate();
  };

  const cityParam = property?.cityId || "";
  const { data: similarProperties = [] } = useQuery<ExtendedProperty[]>({
    queryKey: [`/api/properties?cityId=${encodeURIComponent(cityParam)}&limit=4&exclude=${id}`],
    enabled: !!cityParam && !!id,
  });

  const requestOtp = async () => {
    if (!user?.phone) {
      setOtpError("Add a mobile number to your account before requesting contact access.");
      return;
    }
    const generation = requestGenerationRef.current;
    setOtpError(null);
    setContactBusy(true);
    try {
      await apiRequest("POST", "/api/property-contact/otp/request", {});
      if (generation !== requestGenerationRef.current || requestPropertyRef.current !== id || requestUserRef.current !== user.id) return;
      setOtpSent(true);
    } catch (err: any) {
      if (generation === requestGenerationRef.current) setOtpError(err.message || "Could not send the verification code. Please try again.");
    } finally {
      if (generation === requestGenerationRef.current) setContactBusy(false);
    }
  };

  const createPropertyContact = async (action: "whatsapp" | "call", generation = requestGenerationRef.current) => {
    const propertyId = id;
    if (!contactConsent) {
      setOtpError("Please confirm consent to share your enquiry with the property owner.");
      return;
    }
    try {
      const response = await apiRequest("POST", `/api/properties/${propertyId}/contact`, { consentConfirmed: true });
      const contact = await response.json() as { enquiryId: string; created: boolean; ownerPhone: string; notificationStatus: "queued" | "existing" };
      if (generation !== requestGenerationRef.current || requestPropertyRef.current !== propertyId || requestUserRef.current !== (user?.id ?? null)) return;
      setRevealedPhone(contact.ownerPhone);
      setPhoneVerified(true);
      setContactSuccess(contact.created
        ? "Your interest has been registered. Notifications will be processed according to the enabled channel and template settings."
        : "Your interest is already registered. No duplicate notifications have been sent.");
      setShowContactDialog(false);
      setContactConsent(false);
      if (action === "call") {
        window.location.href = `tel:+${contact.ownerPhone}`;
      }
    } catch (err: any) {
      if (generation !== requestGenerationRef.current) return;
      setOtpSent(false);
      setOtpError(err.message || "Unable to create this property enquiry. Please try again.");
    }
  };

  const openContactFlow = (action: "whatsapp" | "call") => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/properties/${id}`)}`);
      return;
    }
    setContactAction(action);
    setOtp("");
    setOtpSent(false);
    setContactConsent(false);
    setOtpError(null);
    setContactSuccess(null);
    setShowContactDialog(true);
  };

  const handleContinueContact = async () => {
    if (!contactConsent || contactBusy || !contactAction) return;
    if (!user?.phone) {
      navigate(`/profile/complete?redirect=${encodeURIComponent(`/properties/${id}`)}`);
      return;
    }
    const action = contactAction;
    const generation = requestGenerationRef.current;
    setOtpError(null);
    setContactBusy(true);
    try {
      if (!phoneVerified) {
        const statusResponse = await apiRequest("GET", "/api/property-contact/status");
        const status = await statusResponse.json() as { verified: boolean; phone: string | null; verifiedAt: string | null; verificationExpiry: string | null };
        if (generation !== requestGenerationRef.current || requestPropertyRef.current !== id || requestUserRef.current !== user.id) return;
        if (!status.verified) {
          await apiRequest("POST", "/api/property-contact/otp/request", {});
          if (generation !== requestGenerationRef.current || requestPropertyRef.current !== id || requestUserRef.current !== user.id) return;
          setOtpSent(true);
          return;
        }
        setPhoneVerified(true);
      }
      await createPropertyContact(action, generation);
    } catch (err: any) {
      if (generation === requestGenerationRef.current) {
        setOtpError(err.message || "Unable to verify your account. Please try again.");
      }
    } finally {
      if (generation === requestGenerationRef.current) setContactBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || contactBusy || !contactAction) return;
    const generation = requestGenerationRef.current;
    const propertyId = id;
    setOtpError(null);
    setContactBusy(true);
    try {
      await apiRequest("POST", "/api/property-contact/otp/verify", { code: otp });
      if (generation !== requestGenerationRef.current || requestPropertyRef.current !== propertyId || requestUserRef.current !== user?.id) return;
      setPhoneVerified(true);
      await createPropertyContact(contactAction, generation);
    } catch (err: any) {
      if (generation === requestGenerationRef.current) setOtpError(err.message || "Invalid code. Please try again.");
    } finally {
      if (generation === requestGenerationRef.current) setContactBusy(false);
    }
  };

  const handleCallClick = () => openContactFlow("call");
  const handleWhatsAppClick = () => openContactFlow("whatsapp");

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
                    {property.title}
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleReportClick}
                    title="Report this listing"
                    data-testid="button-report-listing"
                  >
                    <Flag className="h-5 w-5" />
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

              {property.priceOptions && property.priceOptions.length > 0 && (
                <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-6">
                  <h3 className="text-sm font-semibold mb-3">Pricing Options</h3>
                  <div className="space-y-2">
                    {property.priceOptions.map((option, index) => {
                      const numericAmount = parseFloat(option.amount);
                      const isNumeric = option.amount.trim() !== "" && Number.isFinite(numericAmount);
                      return (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border/50">
                          <span className="text-sm text-muted-foreground">{option.label}</span>
                          <span className="font-semibold">
                            {isNumeric ? `${"\u20B9"}${formatINR(option.amount)}` : option.amount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                      disabled={contactBusy}
                      data-testid="button-call-owner"
                    >
                      <Phone className="h-4 w-4" />
                      {contactBusy && contactAction === "call" ? "Processing..." : revealedPhone ? "Call Owner" : "Show Phone Number"}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                      onClick={handleWhatsAppClick}
                      disabled={contactBusy}
                      data-testid="button-whatsapp"
                    >
                      <SiWhatsapp className="h-4 w-4" />
                      {contactBusy && contactAction === "whatsapp" ? "Processing..." : "WhatsApp"}
                    </Button>
                  </div>

                  {revealedPhone && (
                    <p className="text-sm text-center font-medium" data-testid="text-owner-contact">
                      Owner phone: {revealedPhone}
                    </p>
                  )}
                  {contactSuccess && (
                    <div className="space-y-2 text-center" role="status" data-testid="status-contact-success">
                      <p className="text-xs text-green-700 dark:text-green-400">{contactSuccess}</p>
                    </div>
                  )}

                  {!revealedPhone && (
                    <p className="text-xs text-center text-muted-foreground">
                      Verify your account mobile number and confirm your enquiry to contact the owner
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
        <DialogContent className="w-[92vw] max-w-md max-h-[90dvh] overflow-y-auto break-words">
          <DialogHeader>
            <DialogTitle>{otpSent ? "Verify your mobile number" : "Contact the property owner"}</DialogTitle>
            <DialogDescription>
              {otpSent
                ? `Enter the six-digit code sent to the mobile number on your account${user?.phone ? ` (${user.phone})` : ""}.`
                : "Confirm your enquiry. If your account mobile is not verified, we will send a one-time code to that number."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!user?.phone ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                Your account does not have a mobile number. Add one in your account profile to continue.
              </div>
            ) : otpSent ? (
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
                </div>
                {otpError && <p className="break-all text-sm text-red-500" role="alert" data-testid="text-contact-error">{otpError}</p>}
                <Button 
                  className="w-full" 
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || contactBusy}
                  data-testid="button-verify-otp"
                >
                  {contactBusy ? "Verifying and creating enquiry..." : "Verify and continue"}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={requestOtp}
                  disabled={contactBusy}
                  data-testid="button-resend-otp"
                >
                  Resend code
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 rounded-md border p-4">
                  <Checkbox
                    id="contact-consent"
                    checked={contactConsent}
                    onCheckedChange={(checked) => setContactConsent(checked === true)}
                    data-testid="checkbox-contact-consent"
                  />
                  <Label htmlFor="contact-consent" className="cursor-pointer text-sm leading-relaxed">
                    I agree to share my enquiry and account contact details with the property owner, and to receive related enquiry notifications.
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your account phone number is used for verification. It cannot be changed in this step.
                </p>
                {otpError && <p className="break-all text-sm text-red-500" role="alert" data-testid="text-contact-error">{otpError}</p>}
                <Button
                  className="w-full"
                  onClick={handleContinueContact}
                  disabled={!contactConsent || contactBusy}
                  data-testid="button-confirm-contact"
                >
                  {contactBusy ? "Checking account..." : "Continue"}
                </Button>
              </>
            )}
          </div>
          {!user?.phone && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowContactDialog(false)}>Cancel</Button>
              <Button onClick={() => navigate(`/profile/complete?redirect=${encodeURIComponent(`/properties/${id}`)}`)} data-testid="button-add-account-phone">
                Update account profile
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Property Gallery</DialogTitle>
          </DialogHeader>
          <div className="absolute inset-0 flex items-center justify-center">
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

      {/* Report Listing dialog - Issue #4 */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" />
              Report this listing
            </DialogTitle>
            <DialogDescription>
              Help us keep Leaseo brokerage-free by flagging suspicious or incorrect listings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason for reporting</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                placeholder={reportReason === "broker_listing" ? "What made you think this was posted by a broker?" : "Provide more details about the issue..."}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                data-testid="input-report-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
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
