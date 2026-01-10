import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2,
  Home,
  MapPin,
  Ruler,
  IndianRupee,
  Calendar,
  Camera,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  X,
  Phone,
} from "lucide-react";
import { INDIAN_CITIES, BHK_OPTIONS, FURNISHING_OPTIONS, PROPERTY_TYPES_RESIDENTIAL, PROPERTY_TYPES_COMMERCIAL, CITY_STATE_MAP } from "@/lib/constants";

const STEPS = [
  { id: 1, title: "Property Type", icon: Building2 },
  { id: 2, title: "Location", icon: MapPin },
  { id: 3, title: "Property Details", icon: Home },
  { id: 4, title: "Pricing", icon: IndianRupee },
  { id: 5, title: "Availability", icon: Calendar },
  { id: 6, title: "Photos", icon: Camera },
  { id: 7, title: "Review", icon: FileCheck },
];

const AMENITIES = [
  "Lift", "Power Backup", "Security", "CCTV", "Gym", "Swimming Pool",
  "Parking", "Garden", "Club House", "Children Play Area", "Gas Pipeline",
  "Water Supply 24x7", "Intercom", "Fire Safety", "Rainwater Harvesting",
];

const PREFERRED_TENANTS = ["Family", "Bachelor Male", "Bachelor Female", "Company", "Any"];

interface PropertyFormData {
  segment: "rent" | "buy" | "commercial";
  listingType: "rent" | "sale";
  propertyCategory: "residential" | "commercial";
  propertyType: string;
  city: string;
  locality: string;
  address: string;
  pincode: string;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  squareFeet: number;
  carpetArea: number;
  floorNumber: number;
  totalFloors: number;
  facing: string;
  furnishing: string;
  amenities: string[];
  rent: number;
  price: number;
  securityDeposit: number;
  maintenanceCharges: number;
  availableFrom: string;
  preferredTenants: string[];
  description: string;
  images: File[];
  videoUrl: string;
}

const initialFormData: PropertyFormData = {
  segment: "rent",
  listingType: "rent",
  propertyCategory: "residential",
  propertyType: "",
  city: "",
  locality: "",
  address: "",
  pincode: "",
  bedrooms: 2,
  bathrooms: 2,
  balconies: 1,
  squareFeet: 0,
  carpetArea: 0,
  floorNumber: 0,
  totalFloors: 1,
  facing: "",
  furnishing: "unfurnished",
  amenities: [],
  rent: 0,
  price: 0,
  securityDeposit: 0,
  maintenanceCharges: 0,
  availableFrom: "",
  preferredTenants: ["Any"],
  description: "",
  images: [],
  videoUrl: "",
};

export default function PostPropertyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<"email" | "phone">("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const isOwnerRole = user?.activeRoleId?.includes("owner") || false;

  useEffect(() => {
    if (isAuthenticated && isOwnerRole) {
      setIsVerified(true);
    }
  }, [isAuthenticated, isOwnerRole]);

  const getPropertyTypeLabel = (value: string) => {
    const allTypes = [...PROPERTY_TYPES_RESIDENTIAL, ...PROPERTY_TYPES_COMMERCIAL];
    return allTypes.find(t => t.value === value)?.label || value;
  };

  const progress = (currentStep / STEPS.length) * 100;

  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      const isForSale = data.listingType === "sale";
      const titleType = isForSale ? "Sale" : "Rent";
      const propertyData = {
        title: data.segment === "commercial" 
          ? `${data.propertyType} for ${titleType} in ${data.locality}`
          : `${data.bedrooms} BHK ${data.propertyType} for ${titleType} in ${data.locality}`,
        description: data.description,
        propertyType: data.propertyType,
        listingType: data.listingType,
        isCommercial: data.segment === "commercial",
        price: isForSale ? data.price.toString() : data.rent.toString(),
        rent: !isForSale ? data.rent.toString() : undefined,
        salePrice: isForSale ? data.price.toString() : undefined,
        securityDeposit: !isForSale && data.securityDeposit > 0 ? data.securityDeposit.toString() : undefined,
        maintenanceCharges: data.maintenanceCharges > 0 ? data.maintenanceCharges.toString() : undefined,
        address: data.address,
        city: data.city,
        state: CITY_STATE_MAP[data.city] || "Maharashtra",
        pincode: data.pincode,
        bedrooms: data.segment !== "commercial" ? data.bedrooms : undefined,
        bathrooms: data.bathrooms.toString(),
        balconies: data.segment !== "commercial" ? data.balconies : undefined,
        squareFeet: data.squareFeet,
        carpetArea: data.carpetArea,
        floorNumber: data.floorNumber,
        totalFloors: data.totalFloors,
        facing: data.facing,
        furnishing: data.furnishing,
        amenities: data.amenities,
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
      };
      return apiRequest("POST", "/api/properties", propertyData);
    },
    onSuccess: () => {
      toast({
        title: "Property Listed Successfully!",
        description: "Your property has been submitted for review.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to list property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateFormData = <K extends keyof PropertyFormData>(
    field: K,
    value: PropertyFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const togglePreferredTenant = (tenant: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredTenants: prev.preferredTenants.includes(tenant)
        ? prev.preferredTenants.filter((t) => t !== tenant)
        : [...prev.preferredTenants, tenant],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.images.length > 10) {
      toast({
        title: "Too many images",
        description: "Maximum 10 images allowed",
        variant: "destructive",
      });
      return;
    }
    
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls((prev) => [...prev, ...newUrls]);
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...files] }));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSendOtp = async () => {
    if (verifyMethod === "email" && !email) {
      toast({ title: "Email Required", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    if (verifyMethod === "phone" && phoneNumber.length < 10) {
      toast({ title: "Phone Required", description: "Please enter a valid phone number", variant: "destructive" });
      return;
    }

    setIsOtpLoading(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyMethod === "email" ? email : undefined,
          phone: verifyMethod === "phone" ? phoneNumber : undefined,
          purpose: verifyMethod === "email" ? "verify_email" : "verify_phone",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.devCode) setDevCode(data.devCode);
      setOtpSent(true);
      toast({
        title: "Verification Code Sent",
        description: `Code sent to ${verifyMethod === "email" ? email : `+91 ${phoneNumber}`}`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send code", variant: "destructive" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: "Invalid Code", description: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }

    setIsOtpLoading(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyMethod === "email" ? email : undefined,
          phone: verifyMethod === "phone" ? phoneNumber : undefined,
          code: otp,
          segment: formData.segment,
          createAccount: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // If account was created/found, log the user in
      if (data.token && data.user) {
        login(data.token, data.user);
        toast({
          title: "Account Created",
          description: "Your owner account has been created and verified.",
        });
      } else {
        toast({
          title: "Verified",
          description: `Your ${verifyMethod === "email" ? "email" : "phone"} has been verified successfully.`,
        });
      }

      setIsVerified(true);
      setShowVerifyDialog(false);
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message || "Invalid code", variant: "destructive" });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.segment && !!formData.propertyType;
      case 2:
        return !!formData.city && !!formData.locality && !!formData.address;
      case 3:
        return formData.squareFeet > 0;
      case 4:
        return formData.listingType === "sale" ? formData.price > 0 : formData.rent > 0;
      case 5:
        return formData.listingType === "sale" || formData.preferredTenants.length > 0;
      case 6:
        return formData.images.length >= 3;
      case 7:
        return isVerified;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!isVerified) {
      setShowVerifyDialog(true);
      return;
    }
    createPropertyMutation.mutate(formData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">What do you want to list?</Label>
              <RadioGroup
                value={formData.segment}
                onValueChange={(value: "rent" | "buy" | "commercial") => {
                  updateFormData("segment", value);
                  updateFormData("propertyType", "");
                  updateFormData("propertyCategory", value === "commercial" ? "commercial" : "residential");
                  updateFormData("listingType", value === "buy" ? "sale" : "rent");
                }}
                className="grid grid-cols-3 gap-4"
              >
                <Label
                  htmlFor="rent"
                  className={`flex flex-col items-center gap-2 p-6 border rounded-lg cursor-pointer transition-all ${
                    formData.segment === "rent"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="rent" id="rent" className="sr-only" />
                  <Home className="h-10 w-10 text-primary" />
                  <span className="font-medium">For Rent</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Residential properties
                  </span>
                </Label>
                <Label
                  htmlFor="buy"
                  className={`flex flex-col items-center gap-2 p-6 border rounded-lg cursor-pointer transition-all ${
                    formData.segment === "buy"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="buy" id="buy" className="sr-only" />
                  <Home className="h-10 w-10 text-primary" />
                  <span className="font-medium">For Sale</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Residential properties
                  </span>
                </Label>
                <Label
                  htmlFor="commercial"
                  className={`flex flex-col items-center gap-2 p-6 border rounded-lg cursor-pointer transition-all ${
                    formData.segment === "commercial"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="commercial" id="commercial" className="sr-only" />
                  <Building2 className="h-10 w-10 text-primary" />
                  <span className="font-medium">Commercial</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Office, Shop, Warehouse
                  </span>
                </Label>
              </RadioGroup>
            </div>

            {formData.segment === "commercial" && (
              <div>
                <Label className="text-base font-medium mb-3 block">Listing type</Label>
                <RadioGroup
                  value={formData.listingType}
                  onValueChange={(value: "rent" | "sale") => {
                    updateFormData("listingType", value);
                  }}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="commercial-rent"
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.listingType === "rent"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="rent" id="commercial-rent" className="sr-only" />
                    <span className="font-medium">For Rent</span>
                    <span className="text-xs text-muted-foreground">Monthly/Yearly lease</span>
                  </Label>
                  <Label
                    htmlFor="commercial-sale"
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.listingType === "sale"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="sale" id="commercial-sale" className="sr-only" />
                    <span className="font-medium">For Sale</span>
                    <span className="text-xs text-muted-foreground">Buy/Sell outright</span>
                  </Label>
                </RadioGroup>
              </div>
            )}

            <div>
              <Label className="text-base font-medium mb-3 block">Select property type</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(formData.segment === "commercial"
                  ? PROPERTY_TYPES_COMMERCIAL
                  : PROPERTY_TYPES_RESIDENTIAL
                ).map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.propertyType === type.value ? "default" : "outline"}
                    className="h-auto py-3"
                    onClick={() => updateFormData("propertyType", type.value)}
                    data-testid={`button-type-${type.value}`}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => updateFormData("city", value)}
                >
                  <SelectTrigger id="city" data-testid="select-city">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locality">Locality / Area</Label>
                <Input
                  id="locality"
                  placeholder="e.g., Bandra West"
                  value={formData.locality}
                  onChange={(e) => updateFormData("locality", e.target.value)}
                  data-testid="input-locality"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Complete Address</Label>
              <Textarea
                id="address"
                placeholder="Building name, street, landmark..."
                value={formData.address}
                onChange={(e) => updateFormData("address", e.target.value)}
                rows={3}
                data-testid="input-address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                placeholder="400050"
                value={formData.pincode}
                onChange={(e) => updateFormData("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-40"
                data-testid="input-pincode"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {formData.propertyCategory === "residential" && (
              <div>
                <Label className="text-base font-medium mb-3 block">Configuration</Label>
                <div className="flex flex-wrap gap-2">
                  {BHK_OPTIONS.map((bhk) => (
                    <Button
                      key={bhk}
                      type="button"
                      variant={
                        (bhk === "1 RK" && formData.bedrooms === 0) ||
                        (bhk.includes("BHK") && formData.bedrooms === parseInt(bhk))
                          ? "default"
                          : "outline"
                      }
                      onClick={() => {
                        const beds = bhk === "1 RK" ? 0 : parseInt(bhk) || 4;
                        updateFormData("bedrooms", beds);
                      }}
                      data-testid={`button-bhk-${bhk.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {bhk}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.propertyCategory === "residential" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Select
                      value={formData.bathrooms.toString()}
                      onValueChange={(v) => updateFormData("bathrooms", parseInt(v))}
                    >
                      <SelectTrigger id="bathrooms">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="balconies">Balconies</Label>
                    <Select
                      value={formData.balconies.toString()}
                      onValueChange={(v) => updateFormData("balconies", parseInt(v))}
                    >
                      <SelectTrigger id="balconies">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="squareFeet">Built-up Area (sqft)</Label>
                <Input
                  id="squareFeet"
                  type="number"
                  placeholder="1200"
                  value={formData.squareFeet || ""}
                  onChange={(e) => updateFormData("squareFeet", parseInt(e.target.value) || 0)}
                  data-testid="input-sqft"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carpetArea">Carpet Area (sqft)</Label>
                <Input
                  id="carpetArea"
                  type="number"
                  placeholder="900"
                  value={formData.carpetArea || ""}
                  onChange={(e) => updateFormData("carpetArea", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floorNumber">Floor Number</Label>
                <Select
                  value={formData.floorNumber.toString()}
                  onValueChange={(v) => updateFormData("floorNumber", parseInt(v))}
                >
                  <SelectTrigger id="floorNumber">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Ground</SelectItem>
                    {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalFloors">Total Floors</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  min="1"
                  value={formData.totalFloors}
                  onChange={(e) => updateFormData("totalFloors", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facing">Facing</Label>
                <Select
                  value={formData.facing}
                  onValueChange={(v) => updateFormData("facing", v)}
                >
                  <SelectTrigger id="facing">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"].map((d) => (
                      <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Furnishing Status</Label>
              <div className="flex flex-wrap gap-2">
                {FURNISHING_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={formData.furnishing === option.toLowerCase().replace(/\s+/g, "_") ? "default" : "outline"}
                    onClick={() => updateFormData("furnishing", option.toLowerCase().replace(/\s+/g, "_"))}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {AMENITIES.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <span className="text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {formData.listingType === "sale" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price">Sale Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {"\u20B9"}
                    </span>
                    <Input
                      id="price"
                      type="number"
                      placeholder="5000000"
                      value={formData.price || ""}
                      onChange={(e) => updateFormData("price", parseInt(e.target.value) || 0)}
                      className="pl-8"
                      data-testid="input-price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total sale price in INR
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance">Maintenance (per month)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {"\u20B9"}
                    </span>
                    <Input
                      id="maintenance"
                      type="number"
                      placeholder="2500"
                      value={formData.maintenanceCharges || ""}
                      onChange={(e) => updateFormData("maintenanceCharges", parseInt(e.target.value) || 0)}
                      className="pl-8"
                      data-testid="input-maintenance"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Monthly society/maintenance charges
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="rent">Monthly Rent</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {"\u20B9"}
                    </span>
                    <Input
                      id="rent"
                      type="number"
                      placeholder="25000"
                      value={formData.rent || ""}
                      onChange={(e) => updateFormData("rent", parseInt(e.target.value) || 0)}
                      className="pl-8"
                      data-testid="input-rent"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Security Deposit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {"\u20B9"}
                    </span>
                    <Input
                      id="deposit"
                      type="number"
                      placeholder="100000"
                      value={formData.securityDeposit || ""}
                      onChange={(e) => updateFormData("securityDeposit", parseInt(e.target.value) || 0)}
                      className="pl-8"
                      data-testid="input-deposit"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance">Maintenance (per month)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {"\u20B9"}
                    </span>
                    <Input
                      id="maintenance"
                      type="number"
                      placeholder="2500"
                      value={formData.maintenanceCharges || ""}
                      onChange={(e) => updateFormData("maintenanceCharges", parseInt(e.target.value) || 0)}
                      className="pl-8"
                      data-testid="input-maintenance"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {formData.listingType === "sale" 
                  ? "Tip: Properties priced competitively sell faster. Research similar properties in your area before setting the price."
                  : "Tip: Properties priced competitively get 3x more enquiries. Check similar properties in your area before setting the rent."
                }
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="availableFrom">Available From</Label>
              <Input
                id="availableFrom"
                type="date"
                value={formData.availableFrom}
                onChange={(e) => updateFormData("availableFrom", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-48"
                data-testid="input-available-from"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty if available immediately
              </p>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Preferred Tenants</Label>
              <div className="flex flex-wrap gap-2">
                {PREFERRED_TENANTS.map((tenant) => (
                  <Button
                    key={tenant}
                    type="button"
                    variant={formData.preferredTenants.includes(tenant) ? "default" : "outline"}
                    onClick={() => togglePreferredTenant(tenant)}
                    data-testid={`button-tenant-${tenant.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {tenant}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Property Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your property - features, nearby amenities, transport links, etc."
                value={formData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={5}
                data-testid="input-description"
              />
              <p className="text-sm text-muted-foreground">
                A good description helps tenants understand your property better
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">
                Upload Photos (Minimum 3, Maximum 10)
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Add clear photos of your property. First photo will be the cover image.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={url} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <Badge className="absolute bottom-2 left-2 text-xs">Cover</Badge>
                    )}
                  </div>
                ))}
                
                {formData.images.length < 10 && (
                  <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      data-testid="input-images"
                    />
                  </label>
                )}
              </div>

              {formData.images.length < 3 && (
                <p className="text-sm text-destructive mt-2">
                  Please upload at least 3 photos
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (Optional)</Label>
              <Input
                id="videoUrl"
                placeholder="YouTube or Vimeo link"
                value={formData.videoUrl}
                onChange={(e) => updateFormData("videoUrl", e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Properties with videos get 40% more views
              </p>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Listing</CardTitle>
                <CardDescription>Please verify all details before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Property Type</p>
                    <p className="font-medium capitalize">{getPropertyTypeLabel(formData.propertyType)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium capitalize">{formData.propertyCategory}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{formData.locality}, {formData.city}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Configuration</p>
                    <p className="font-medium">
                      {formData.bedrooms === 0 ? "1 RK" : `${formData.bedrooms} BHK`} | {formData.bathrooms} Bath
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Area</p>
                    <p className="font-medium">{formData.squareFeet} sqft</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Furnishing</p>
                    <p className="font-medium capitalize">{formData.furnishing.replace(/_/g, " ")}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rent</p>
                    <p className="font-medium text-lg">{"\u20B9"}{formData.rent.toLocaleString("en-IN")}/mo</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deposit</p>
                    <p className="font-medium">{"\u20B9"}{formData.securityDeposit.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Maintenance</p>
                    <p className="font-medium">{"\u20B9"}{formData.maintenanceCharges.toLocaleString("en-IN")}/mo</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground text-sm mb-2">Photos ({formData.images.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imagePreviewUrls.slice(0, 5).map((url, i) => (
                      <img key={i} src={url} alt="" className="h-16 w-16 rounded object-cover shrink-0" />
                    ))}
                    {formData.images.length > 5 && (
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center shrink-0">
                        <span className="text-sm text-muted-foreground">+{formData.images.length - 5}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {isVerified ? (
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">Ready to Publish</p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {isAuthenticated && isOwnerRole ? "You're logged in as a property owner" : "Your identity has been verified"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                      <Check className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Verification Required</p>
                      <p className="text-xs text-muted-foreground">
                        Verify your email or phone to publish the listing
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setShowVerifyDialog(true)}>
                      Verify Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Post Your Property</h1>
            <p className="text-muted-foreground">List your property for free - No brokerage, no middlemen</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
              <span className="text-sm text-muted-foreground">{STEPS[currentStep - 1].title}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="hidden md:flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-6 md:p-8">
              {renderStepContent()}

              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                {currentStep === STEPS.length ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceed() || createPropertyMutation.isPending}
                    className="gap-2"
                    data-testid="button-submit-listing"
                  >
                    {createPropertyMutation.isPending ? "Submitting..." : "Submit Listing"}
                    <Check className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="gap-2"
                    data-testid="button-next-step"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Identity</DialogTitle>
            <DialogDescription>
              We need to verify your email or phone before publishing the listing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!otpSent ? (
              <>
                <div className="flex gap-2 p-1 bg-muted rounded-md">
                  <Button
                    variant={verifyMethod === "email" ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => setVerifyMethod("email")}
                    data-testid="button-verify-email-tab"
                  >
                    Email
                  </Button>
                  <Button
                    variant={verifyMethod === "phone" ? "default" : "ghost"}
                    className="flex-1"
                    onClick={() => setVerifyMethod("phone")}
                    data-testid="button-verify-phone-tab"
                  >
                    Phone
                  </Button>
                </div>

                {verifyMethod === "email" ? (
                  <div className="space-y-2">
                    <Label htmlFor="verify-email">Email Address</Label>
                    <Input
                      id="verify-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-verify-email"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="verify-phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 border rounded-md bg-muted text-sm">
                        +91
                      </div>
                      <Input
                        id="verify-phone"
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="flex-1"
                        data-testid="input-verify-phone"
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={isOtpLoading || (verifyMethod === "email" ? !email : phoneNumber.length < 10)}
                  data-testid="button-send-otp-listing"
                >
                  {isOtpLoading ? "Sending..." : "Send Verification Code"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="verify-otp">Enter Verification Code</Label>
                  <Input
                    id="verify-otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-lg tracking-widest"
                    data-testid="input-verify-otp"
                  />
                  <p className="text-sm text-muted-foreground">
                    Code sent to {verifyMethod === "email" ? email : `+91 ${phoneNumber}`}
                  </p>
                </div>

                {devCode && (
                  <div className="bg-muted/50 border rounded-md p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Development Mode - Your code:</p>
                    <p className="text-lg font-mono font-bold tracking-widest">{devCode}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isOtpLoading || otp.length < 6}
                  data-testid="button-verify-otp-listing"
                >
                  {isOtpLoading ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setOtpSent(false); setOtp(""); setDevCode(null); }}
                >
                  Change {verifyMethod === "email" ? "Email" : "Number"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
