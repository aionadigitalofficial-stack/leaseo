import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Home, 
  Building2, 
  Heart, 
  MessageSquare, 
  Settings, 
  Plus,
  Eye,
  ChevronDown,
  Check,
  User,
  Bell,
  Edit,
  Pause,
  Play,
  RefreshCcw,
  CheckCircle,
  Rocket,
  MoreVertical,
  ExternalLink,
  Trash2,
  Mail,
  Phone,
  AlertTriangle,
  Flag,
  Clock,
  TrendingUp,
  IndianRupee
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { UserRoleType } from "@shared/schema";

interface DashboardProperty {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  status: string;
  isCommercial: boolean;
  rent: string | null;
  securityDeposit: string | null;
  maintenanceCharges: string | null;
  address: string;
  cityId: string | null;
  localityId: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  squareFeet: number | null;
  furnishing: string | null;
  amenities: string[] | null;
  isFeatured: boolean;
  isPremium: boolean;
  viewCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  expiresAt: Date | null;
  enquiryCount: number;
  city?: string;
  locality?: string;
}

interface DashboardShortlist {
  id: string;
  propertyId: string;
  property: {
    id: string;
    title: string;
    rent: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
    squareFeet: number | null;
    furnishing: string | null;
    city: string;
    locality: string;
    status: string;
  };
  createdAt: Date;
}

interface DashboardEnquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  message: string;
  status: string;
  createdAt: Date;
  respondedAt?: Date;
  ownerName: string;
  ownerPhone: string;
}

const AVAILABLE_ROLES: { id: UserRoleType; label: string; icon: typeof Home; category: "tenant" | "owner" }[] = [
  { id: "residential_tenant", label: "Residential Tenant", icon: Home, category: "tenant" },
  { id: "commercial_tenant", label: "Commercial Tenant", icon: Building2, category: "tenant" },
  { id: "residential_owner", label: "Residential Owner", icon: Home, category: "owner" },
  { id: "commercial_owner", label: "Commercial Owner", icon: Building2, category: "owner" },
];

const BOOST_OPTIONS = [
  { type: "featured", label: "Featured", description: "Top of search results", price: 499, duration: "7 days" },
  { type: "premium", label: "Premium", description: "Highlighted with badge", price: 299, duration: "7 days" },
  { type: "spotlight", label: "Spotlight", description: "Homepage showcase", price: 999, duration: "14 days" },
  { type: "urgent", label: "Urgent", description: "Urgent tag for quick rent", price: 199, duration: "3 days" },
];

const REPORT_REASONS = [
  { value: "fake_listing", label: "Fake Listing" },
  { value: "incorrect_info", label: "Incorrect Information" },
  { value: "already_rented", label: "Already Rented/Sold" },
  { value: "scam", label: "Suspected Scam" },
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "other", label: "Other" },
];

const mockUser = {
  id: "user-1",
  firstName: "Rahul",
  lastName: "Sharma",
  phone: "+91 98765 43210",
  email: "rahul@example.com",
  activeRole: "residential_owner" as UserRoleType,
  availableRoles: ["residential_tenant", "residential_owner", "commercial_owner"] as UserRoleType[],
};

const mockOwnerProperties: DashboardProperty[] = [
  {
    id: "prop-1",
    title: "Spacious 3BHK in Andheri West",
    description: "Well-maintained apartment with modern amenities",
    propertyType: "apartment",
    listingType: "rent",
    status: "active",
    isCommercial: false,
    rent: "45000",
    securityDeposit: "90000",
    maintenanceCharges: "5000",
    address: "Lokhandwala Complex, Andheri West",
    cityId: "mumbai",
    localityId: "andheri",
    bedrooms: 3,
    bathrooms: "2",
    squareFeet: 1200,
    furnishing: "semi-furnished",
    amenities: ["gym", "parking", "security"],
    isFeatured: false,
    isPremium: false,
    viewCount: 156,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-08"),
    expiresAt: new Date("2025-02-01"),
    enquiryCount: 12,
    city: "Mumbai",
    locality: "Andheri West",
  },
  {
    id: "prop-2",
    title: "2BHK near Powai Lake",
    description: "Lake view apartment",
    propertyType: "apartment",
    listingType: "rent",
    status: "rented",
    isCommercial: false,
    rent: "35000",
    securityDeposit: "70000",
    maintenanceCharges: "3000",
    address: "Hiranandani Gardens, Powai",
    cityId: "mumbai",
    localityId: "powai",
    bedrooms: 2,
    bathrooms: "2",
    squareFeet: 950,
    furnishing: "furnished",
    amenities: ["gym", "pool", "parking"],
    isFeatured: false,
    isPremium: false,
    viewCount: 89,
    createdAt: new Date("2024-12-15"),
    updatedAt: new Date("2024-12-20"),
    expiresAt: null,
    enquiryCount: 8,
    city: "Mumbai",
    locality: "Powai",
  },
];

const mockShortlists = [
  {
    id: "short-1",
    propertyId: "prop-1",
    property: {
      id: "prop-1",
      title: "Modern 2BHK in Koramangala",
      rent: "28000",
      bedrooms: 2,
      bathrooms: "2",
      squareFeet: 1100,
      furnishing: "semi-furnished",
      city: "Bangalore",
      locality: "Koramangala",
      status: "active",
    },
    createdAt: new Date("2025-01-07"),
  },
  {
    id: "short-2",
    propertyId: "prop-2",
    property: {
      id: "prop-2",
      title: "3BHK Villa in HSR Layout",
      rent: "55000",
      bedrooms: 3,
      bathrooms: "3",
      squareFeet: 2000,
      furnishing: "fully-furnished",
      city: "Bangalore",
      locality: "HSR Layout",
      status: "active",
    },
    createdAt: new Date("2025-01-05"),
  },
];

const mockEnquiries = [
  {
    id: "enq-1",
    propertyId: "prop-1",
    propertyTitle: "Modern 2BHK in Koramangala",
    message: "Hi, I'm interested in this property. Is it still available?",
    status: "sent",
    createdAt: new Date("2025-01-07"),
    ownerName: "Priya Patel",
    ownerPhone: "+91 99876 54321",
  },
  {
    id: "enq-2",
    propertyId: "prop-2",
    propertyTitle: "3BHK Villa in HSR Layout",
    message: "Can I schedule a visit this weekend?",
    status: "responded",
    createdAt: new Date("2025-01-05"),
    respondedAt: new Date("2025-01-06"),
    ownerName: "Amit Kumar",
    ownerPhone: "+91 98765 12345",
  },
];

const formatPrice = (price: string | number | null | undefined): string => {
  if (!price) return "0";
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)} L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("en-IN");
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeRole, setActiveRole] = useState<UserRoleType>(mockUser.activeRole);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPropertyId, setReportPropertyId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [alertPreferences, setAlertPreferences] = useState({
    emailAlerts: true,
    whatsappAlerts: false,
    newListings: true,
    priceDrops: true,
  });

  const currentRole = AVAILABLE_ROLES.find(r => r.id === activeRole);
  const userRoles = AVAILABLE_ROLES.filter(r => mockUser.availableRoles.includes(r.id));
  const isOwnerRole = activeRole.includes("owner");
  const isTenantRole = activeRole.includes("tenant");
  const isCommercial = activeRole.includes("commercial");

  const handleRoleSwitch = (roleId: UserRoleType) => {
    setActiveRole(roleId);
    toast({
      title: "Role Switched",
      description: `You're now viewing as ${AVAILABLE_ROLES.find(r => r.id === roleId)?.label}`,
    });
  };

  const handlePropertyAction = (propertyId: string, action: string) => {
    const actionLabels: Record<string, string> = {
      edit: "Opening editor...",
      pause: "Listing paused",
      activate: "Listing activated",
      renew: "Listing renewed for 30 days",
      markRented: "Marked as rented",
      delete: "Listing deleted",
    };

    if (action === "edit") {
      navigate(`/post-property?edit=${propertyId}`);
      return;
    }

    toast({
      title: "Action Completed",
      description: actionLabels[action] || "Action completed successfully",
    });
  };

  const handleBoostListing = (propertyId: string) => {
    setSelectedProperty(propertyId);
    setBoostDialogOpen(true);
  };

  const handleBoostPurchase = (boostType: string) => {
    const boost = BOOST_OPTIONS.find(b => b.type === boostType);
    toast({
      title: "Boost Selected",
      description: `${boost?.label} boost for ${boost?.duration} at Rs. ${boost?.price}. Payment gateway coming soon!`,
    });
    setBoostDialogOpen(false);
  };

  const handleRemoveShortlist = (shortlistId: string) => {
    toast({
      title: "Removed from Shortlist",
      description: "Property has been removed from your saved list",
    });
  };

  const handleReportSubmit = () => {
    if (!reportReason) {
      toast({
        title: "Please select a reason",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Report Submitted",
      description: "Thank you for reporting. We'll review this listing.",
    });
    setReportDialogOpen(false);
    setReportReason("");
    setReportDescription("");
  };

  const openReportDialog = (propertyId: string) => {
    setReportPropertyId(propertyId);
    setReportDialogOpen(true);
  };

  const ownerPropertiesForRole = mockOwnerProperties.filter(p => 
    isCommercial ? p.isCommercial : !p.isCommercial
  );

  const activeListings = ownerPropertiesForRole.filter(p => p.status === "active");
  const inactiveListings = ownerPropertiesForRole.filter(p => p.status !== "active");
  const totalViews = ownerPropertiesForRole.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const totalEnquiries = ownerPropertiesForRole.reduce((sum, p) => sum + (p.enquiryCount || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-muted/30">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {mockUser.firstName[0]}{mockUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-user-name">
                    Welcome, {mockUser.firstName}!
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground text-sm">{mockUser.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Viewing as:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="button-role-switcher">
                      {currentRole && <currentRole.icon className="w-4 h-4" />}
                      {currentRole?.label}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {userRoles.map((role) => (
                      <DropdownMenuItem
                        key={role.id}
                        onClick={() => handleRoleSwitch(role.id)}
                        className="gap-2"
                        data-testid={`menu-role-${role.id}`}
                      >
                        <role.icon className="w-4 h-4" />
                        {role.label}
                        {activeRole === role.id && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {isOwnerRole ? (
            <OwnerDashboard
              activeListings={activeListings}
              inactiveListings={inactiveListings}
              totalViews={totalViews}
              totalEnquiries={totalEnquiries}
              isCommercial={isCommercial}
              onPropertyAction={handlePropertyAction}
              onBoostListing={handleBoostListing}
            />
          ) : (
            <TenantDashboard
              shortlists={mockShortlists}
              enquiries={mockEnquiries}
              isCommercial={isCommercial}
              alertPreferences={alertPreferences}
              setAlertPreferences={setAlertPreferences}
              onRemoveShortlist={handleRemoveShortlist}
              onReportListing={openReportDialog}
            />
          )}
        </div>
      </main>
      
      <Footer />

      <Dialog open={boostDialogOpen} onOpenChange={setBoostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Boost Your Listing
            </DialogTitle>
            <DialogDescription>
              Get more visibility and find tenants faster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {BOOST_OPTIONS.map((boost) => (
              <div
                key={boost.type}
                className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                onClick={() => handleBoostPurchase(boost.type)}
                data-testid={`boost-option-${boost.type}`}
              >
                <div>
                  <p className="font-medium">{boost.label}</p>
                  <p className="text-sm text-muted-foreground">{boost.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{boost.duration}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {boost.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoostDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" />
              Report Listing
            </DialogTitle>
            <DialogDescription>
              Help us maintain quality listings by reporting suspicious content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                placeholder="Provide more details about the issue..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                data-testid="input-report-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReportSubmit} data-testid="button-submit-report">
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface OwnerDashboardProps {
  activeListings: DashboardProperty[];
  inactiveListings: DashboardProperty[];
  totalViews: number;
  totalEnquiries: number;
  isCommercial: boolean;
  onPropertyAction: (propertyId: string, action: string) => void;
  onBoostListing: (propertyId: string) => void;
}

function OwnerDashboard({
  activeListings,
  inactiveListings,
  totalViews,
  totalEnquiries,
  isCommercial,
  onPropertyAction,
  onBoostListing,
}: OwnerDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {isCommercial ? "Commercial" : "Residential"} Owner Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your property listings
          </p>
        </div>
        <Link href="/post-property">
          <Button className="gap-2" data-testid="button-add-property">
            <Plus className="w-4 h-4" />
            Add New Property
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-active-listings">{activeListings.length}</p>
                <p className="text-sm text-muted-foreground">Active Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total-views">{totalViews}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-total-enquiries">{totalEnquiries}</p>
                <p className="text-sm text-muted-foreground">Enquiries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="stat-conversion-rate">
                  {totalViews > 0 ? ((totalEnquiries / totalViews) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeListings.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" data-testid="tab-inactive">
            Inactive ({inactiveListings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeListings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No active listings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a property to start receiving enquiries
                </p>
                <Link href="/post-property">
                  <Button className="mt-4">Add Property</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            activeListings.map((property) => (
              <OwnerPropertyCard
                key={property.id}
                property={property}
                onAction={onPropertyAction}
                onBoost={onBoostListing}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4 mt-4">
          {inactiveListings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No inactive listings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All your properties are active
                </p>
              </CardContent>
            </Card>
          ) : (
            inactiveListings.map((property) => (
              <OwnerPropertyCard
                key={property.id}
                property={property}
                onAction={onPropertyAction}
                onBoost={onBoostListing}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OwnerPropertyCardProps {
  property: DashboardProperty;
  onAction: (propertyId: string, action: string) => void;
  onBoost: (propertyId: string) => void;
}

function OwnerPropertyCard({ property, onAction, onBoost }: OwnerPropertyCardProps) {
  const isActive = property.status === "active";
  const isRented = property.status === "rented";
  const expiresIn = property.expiresAt ? 
    Math.ceil((new Date(property.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <Card data-testid={`property-card-${property.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/property/${property.id}`}>
                  <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer" data-testid={`property-title-${property.id}`}>
                    {property.title}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {property.locality}, {property.city}
                </p>
              </div>
              <Badge 
                variant={isActive ? "default" : isRented ? "secondary" : "outline"}
                data-testid={`property-status-${property.id}`}
              >
                {property.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              <span className="font-semibold text-primary flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {formatPrice(property.rent)}/mo
              </span>
              <span className="text-muted-foreground">{property.bedrooms} BHK</span>
              <span className="text-muted-foreground">{property.squareFeet} sq.ft</span>
              <span className="text-muted-foreground capitalize">{property.furnishing}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {property.viewCount} views
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {property.enquiryCount} enquiries
              </span>
              {expiresIn !== null && expiresIn > 0 && expiresIn <= 7 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="w-4 h-4" />
                  Expires in {expiresIn} days
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(property.id, "edit")}
              className="gap-1"
              data-testid={`button-edit-${property.id}`}
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            
            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(property.id, "pause")}
                className="gap-1"
                data-testid={`button-pause-${property.id}`}
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            ) : !isRented && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(property.id, "activate")}
                className="gap-1"
                data-testid={`button-activate-${property.id}`}
              >
                <Play className="w-4 h-4" />
                Activate
              </Button>
            )}

            {!isRented && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(property.id, "markRented")}
                className="gap-1"
                data-testid={`button-mark-rented-${property.id}`}
              >
                <CheckCircle className="w-4 h-4" />
                Mark Rented
              </Button>
            )}

            {isActive && (
              <Button
                size="sm"
                onClick={() => onBoost(property.id)}
                className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                data-testid={`button-boost-${property.id}`}
              >
                <Rocket className="w-4 h-4" />
                Boost
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-more-${property.id}`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction(property.id, "renew")} className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Renew Listing
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/property/${property.id}`} className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Listing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onAction(property.id, "delete")} 
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Listing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertPreferences {
  emailAlerts: boolean;
  whatsappAlerts: boolean;
  newListings: boolean;
  priceDrops: boolean;
}

interface TenantDashboardProps {
  shortlists: DashboardShortlist[];
  enquiries: DashboardEnquiry[];
  isCommercial: boolean;
  alertPreferences: AlertPreferences;
  setAlertPreferences: (prefs: AlertPreferences) => void;
  onRemoveShortlist: (id: string) => void;
  onReportListing: (propertyId: string) => void;
}

function TenantDashboard({
  shortlists,
  enquiries,
  isCommercial,
  alertPreferences,
  setAlertPreferences,
  onRemoveShortlist,
  onReportListing,
}: TenantDashboardProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">
            {isCommercial ? "Commercial" : "Residential"} Tenant Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your property search
          </p>
        </div>

        <Tabs defaultValue="shortlists" className="w-full">
          <TabsList>
            <TabsTrigger value="shortlists" data-testid="tab-shortlists">
              <Heart className="w-4 h-4 mr-2" />
              Shortlists ({shortlists.length})
            </TabsTrigger>
            <TabsTrigger value="enquiries" data-testid="tab-enquiries">
              <MessageSquare className="w-4 h-4 mr-2" />
              Enquiries ({enquiries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shortlists" className="space-y-4 mt-4">
            {shortlists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium">No shortlisted properties</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse properties and save your favorites
                  </p>
                  <Link href="/properties">
                    <Button className="mt-4">Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              shortlists.map((item) => (
                <Card key={item.id} data-testid={`shortlist-card-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <Link href={`/property/${item.propertyId}`}>
                          <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                            {item.property.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.property.locality}, {item.property.city}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            {formatPrice(item.property.rent)}/mo
                          </span>
                          <span>{item.property.bedrooms} BHK</span>
                          <span>{item.property.squareFeet} sq.ft</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/property/${item.propertyId}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReportListing(item.propertyId)}
                          data-testid={`button-report-${item.id}`}
                        >
                          <Flag className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveShortlist(item.id)}
                          data-testid={`button-remove-shortlist-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="enquiries" className="space-y-4 mt-4">
            {enquiries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium">No enquiries yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact owners to see your enquiry history
                  </p>
                  <Link href="/properties">
                    <Button className="mt-4">Browse Properties</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              enquiries.map((enquiry) => (
                <Card key={enquiry.id} data-testid={`enquiry-card-${enquiry.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link href={`/property/${enquiry.propertyId}`}>
                            <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                              {enquiry.propertyTitle}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            Owner: {enquiry.ownerName}
                          </p>
                        </div>
                        <Badge variant={enquiry.status === "responded" ? "default" : "secondary"}>
                          {enquiry.status === "responded" ? "Responded" : "Sent"}
                        </Badge>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">{enquiry.message}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>
                          Sent on {new Date(enquiry.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {enquiry.status === "responded" && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                              <Phone className="w-4 h-4" />
                              Call
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 text-green-600">
                              <SiWhatsapp className="w-4 h-4" />
                              WhatsApp
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alert Preferences
            </CardTitle>
            <CardDescription>
              Get notified about new listings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-alerts" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Alerts
              </Label>
              <Switch
                id="email-alerts"
                checked={alertPreferences.emailAlerts}
                onCheckedChange={(checked) => 
                  setAlertPreferences({ ...alertPreferences, emailAlerts: checked })
                }
                data-testid="switch-email-alerts"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="whatsapp-alerts" className="flex items-center gap-2">
                <SiWhatsapp className="w-4 h-4 text-green-600" />
                WhatsApp Alerts
              </Label>
              <Switch
                id="whatsapp-alerts"
                checked={alertPreferences.whatsappAlerts}
                onCheckedChange={(checked) => 
                  setAlertPreferences({ ...alertPreferences, whatsappAlerts: checked })
                }
                data-testid="switch-whatsapp-alerts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="new-listings">New Listings</Label>
              <Switch
                id="new-listings"
                checked={alertPreferences.newListings}
                onCheckedChange={(checked) => 
                  setAlertPreferences({ ...alertPreferences, newListings: checked })
                }
                data-testid="switch-new-listings"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="price-drops">Price Drops</Label>
              <Switch
                id="price-drops"
                checked={alertPreferences.priceDrops}
                onCheckedChange={(checked) => 
                  setAlertPreferences({ ...alertPreferences, priceDrops: checked })
                }
                data-testid="switch-price-drops"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-save-alerts">
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/properties" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Home className="w-4 h-4" />
                Browse Properties
              </Button>
            </Link>
            <Link href="/contact" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <MessageSquare className="w-4 h-4" />
                Contact Support
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
