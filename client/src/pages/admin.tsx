import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Building2,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Edit,
  Eye,
  Home,
  Users,
  Loader2,
  Save,
  MapPin,
  FileText,
  Search,
  Globe,
  PenTool,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Mail,
  Reply,
  Tag,
  Check,
  X,
  Image,
  TrendingUp,
  CreditCard,
  Clock,
  IndianRupee,
  CheckCircle,
  XCircle,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Phone, Calendar, Key as KeyIcon, Filter as FilterIcon, Shield, MessageCircle } from "lucide-react";
import type { Property, Enquiry, FeatureFlag, City, Locality, BlogPost, PageContent, PropertyCategory, PropertyImage } from "@shared/schema";

type AdminSection = "dashboard" | "properties" | "enquiries" | "owners" | "users" | "employees" | "cities" | "categories" | "boosts" | "payments" | "gateway" | "sms" | "roles" | "newsletter" | "blog" | "pages" | "seo" | "settings";

const propertyFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  propertyType: z.enum(["house", "apartment", "condo", "townhouse", "studio", "villa", "office", "shop", "warehouse", "land"]),
  listingType: z.enum(["rent", "sale"]),
  isCommercial: z.boolean().default(false),
  price: z.string().min(1, "Price is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  bedrooms: z.string().min(1, "Bedrooms is required"),
  bathrooms: z.string().min(1, "Bathrooms is required"),
  squareFeet: z.string().optional(),
  isFeatured: z.boolean().default(false),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

const cityFormSchema = z.object({
  name: z.string().min(2, "City name is required"),
  state: z.string().min(2, "State is required"),
});

const localityFormSchema = z.object({
  name: z.string().min(2, "Locality name is required"),
  cityId: z.string().min(1, "City is required"),
  pincode: z.string().optional(),
});

const blogFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  slug: z.string().min(3, "Slug is required"),
  excerpt: z.string().min(10, "Excerpt is required"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  status: z.enum(["draft", "published"]),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

const employeeFormSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  role: z.string().min(1, "Role is required"),
});

const pageFormSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(10, "Content is required"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

const categoryFormSchema = z.object({
  name: z.string().min(2, "Category name is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.string().optional(),
  parentId: z.string().optional(),
  segment: z.string().optional(),
  supportsRent: z.boolean().optional(),
  supportsSale: z.boolean().optional(),
  isCommercial: z.boolean().optional(),
});

interface SmsProviderField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface SmsProviderCardProps {
  provider: string;
  displayName: string;
  description: string;
  providerData: any;
  isLoading: boolean;
  onSave: (settings: any) => void;
  isSaving: boolean;
  fields: SmsProviderField[];
}

function SmsProviderCard({ provider, displayName, description, providerData, isLoading, onSave, isSaving, fields }: SmsProviderCardProps) {
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [isActive, setIsActive] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [sandboxFormValues, setSandboxFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (providerData) {
      setMode(providerData.mode || "sandbox");
      setIsActive(providerData.isActive || false);
    }
  }, [providerData]);

  const handleSave = () => {
    const settings: any = {
      displayName,
      providerType: "sms",
      isActive,
      mode,
    };
    
    fields.forEach(field => {
      if (formValues[field.key]) {
        settings[field.key] = formValues[field.key];
      }
      if (sandboxFormValues[`sandbox_${field.key}`]) {
        settings[`sandbox${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`] = sandboxFormValues[`sandbox_${field.key}`];
      }
    });
    
    onSave(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{displayName}</span>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              data-testid={`switch-${provider}-active`}
            />
          </div>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Label>Mode:</Label>
              <Select value={mode} onValueChange={(v: "sandbox" | "live") => setMode(v)}>
                <SelectTrigger className="w-40" data-testid={`select-${provider}-mode`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="sandbox" className="w-full">
              <TabsList>
                <TabsTrigger value="sandbox">Sandbox Credentials</TabsTrigger>
                <TabsTrigger value="live">Live Credentials</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sandbox" className="space-y-4 mt-4">
                {fields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label} (Sandbox)</Label>
                    <Input
                      type={field.secret ? "password" : "text"}
                      placeholder={providerData?.[`hasSandbox${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`] 
                        ? `••••••••${providerData[`sandbox${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`]?.slice(-4) || ""}` 
                        : field.placeholder}
                      value={sandboxFormValues[`sandbox_${field.key}`] || ""}
                      onChange={(e) => setSandboxFormValues(prev => ({ ...prev, [`sandbox_${field.key}`]: e.target.value }))}
                      data-testid={`input-${provider}-sandbox-${field.key}`}
                    />
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="live" className="space-y-4 mt-4">
                {fields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label} (Live)</Label>
                    <Input
                      type={field.secret ? "password" : "text"}
                      placeholder={providerData?.[`has${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`] 
                        ? `••••••••${providerData[field.key]?.slice(-4) || ""}` 
                        : field.placeholder}
                      value={formValues[field.key] || ""}
                      onChange={(e) => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      data-testid={`input-${provider}-${field.key}`}
                    />
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            <Button onClick={handleSave} disabled={isSaving} data-testid={`button-save-${provider}`}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const sidebarItems: { id: AdminSection; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "enquiries", label: "Enquiries", icon: MessageSquare },
  { id: "owners", label: "Property Owners", icon: Home },
  { id: "users", label: "Login Users", icon: UserCheck },
  { id: "roles", label: "User Roles", icon: Shield },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "boosts", label: "Listing Boosts", icon: TrendingUp },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "gateway", label: "Payment Gateway", icon: KeyIcon },
  { id: "sms", label: "SMS/WhatsApp", icon: Phone },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "employees", label: "Employees", icon: Users },
  { id: "cities", label: "Cities & Localities", icon: MapPin },
  { id: "blog", label: "Blog", icon: PenTool },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "seo", label: "SEO Settings", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminPage() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isAddCityOpen, setIsAddCityOpen] = useState(false);
  const [isAddLocalityOpen, setIsAddLocalityOpen] = useState(false);
  const [isAddBlogOpen, setIsAddBlogOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);
  const [editingPage, setEditingPage] = useState<PageContent | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PropertyCategory | null>(null);
  
  // Property filter states
  const [propertySegment, setPropertySegment] = useState<"all" | "rent" | "buy" | "commercial">("all");
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyFilterCity, setPropertyFilterCity] = useState<string>("");
  const [propertyFilterLocality, setPropertyFilterLocality] = useState<string>("");
  const [propertyFilterStatus, setPropertyFilterStatus] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [propertyFilterPriceMin, setPropertyFilterPriceMin] = useState("");
  const [propertyFilterPriceMax, setPropertyFilterPriceMax] = useState("");
  const [propertyFilterDateFrom, setPropertyFilterDateFrom] = useState("");
  const [propertyFilterDateTo, setPropertyFilterDateTo] = useState("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  // Pagination state
  const [propertyPage, setPropertyPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
  });

  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/feature-flags"],
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery<City[]>({
    queryKey: ["/api/cities"],
  });

  const { data: localities = [], isLoading: localitiesLoading } = useQuery<Locality[]>({
    queryKey: ["/api/localities"],
  });

  const { data: blogPosts = [], isLoading: blogLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/employees"],
  });

  const { data: propertyOwners = [], isLoading: ownersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/property-owners"],
  });

  const { data: loginUsers = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/login-users"],
  });

  const { data: seoSettings } = useQuery<any>({
    queryKey: ["/api/admin/seo-settings"],
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery<PageContent[]>({
    queryKey: ["/api/pages"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<PropertyCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: boosts = [], isLoading: boostsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/boosts"],
  });

  const { data: paymentsData = [], isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/payments"],
  });

  const { data: propertyImages = [], isLoading: imagesLoading } = useQuery<PropertyImage[]>({
    queryKey: ["/api/properties", editingProperty?.id, "images"],
    enabled: !!editingProperty?.id,
  });

  const sellPropertyFlag = featureFlags.find((f) => f.name === "sell_property");

  const propertyForm = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      propertyType: "apartment",
      listingType: "rent",
      isCommercial: false,
      price: "",
      address: "",
      city: "",
      state: "Maharashtra",
      bedrooms: "2",
      bathrooms: "2",
      squareFeet: "",
      isFeatured: false,
    },
  });

  const cityForm = useForm({
    resolver: zodResolver(cityFormSchema),
    defaultValues: { name: "", state: "Maharashtra" },
  });

  const localityForm = useForm({
    resolver: zodResolver(localityFormSchema),
    defaultValues: { name: "", cityId: "", pincode: "" },
  });

  const blogForm = useForm<{ title: string; slug: string; excerpt: string; content: string; status: "draft" | "published"; metaTitle?: string; metaDescription?: string; metaKeywords?: string }>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { title: "", slug: "", excerpt: "", content: "", status: "draft", metaTitle: "", metaDescription: "", metaKeywords: "" },
  });

  const employeeForm = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "admin" },
  });

  const pageForm = useForm({
    resolver: zodResolver(pageFormSchema),
    defaultValues: { title: "", content: "", metaTitle: "", metaDescription: "", metaKeywords: "" },
  });

  const categoryForm = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { 
      name: "", 
      description: "", 
      icon: "", 
      displayOrder: "0",
      parentId: "",
      segment: "rent",
      supportsRent: true,
      supportsSale: false,
      isCommercial: false,
    },
  });

  useEffect(() => {
    if (editingCategory) {
      categoryForm.reset({
        name: editingCategory.name,
        description: editingCategory.description || "",
        icon: editingCategory.icon || "",
        displayOrder: String(editingCategory.displayOrder || 0),
        parentId: editingCategory.parentId || "",
        segment: editingCategory.segment || "rent",
        supportsRent: editingCategory.supportsRent ?? true,
        supportsSale: editingCategory.supportsSale ?? false,
        isCommercial: editingCategory.isCommercial ?? false,
      });
    } else {
      categoryForm.reset({ 
        name: "", 
        description: "", 
        icon: "", 
        displayOrder: "0",
        parentId: "",
        segment: "rent",
        supportsRent: true,
        supportsSale: false,
        isCommercial: false,
      });
    }
  }, [editingCategory, categoryForm]);

  useEffect(() => {
    if (editingProperty) {
      propertyForm.reset({
        title: editingProperty.title,
        description: editingProperty.description,
        propertyType: editingProperty.propertyType as any,
        listingType: editingProperty.listingType as any,
        isCommercial: editingProperty.isCommercial || false,
        price: String(editingProperty.price || editingProperty.rent || ""),
        address: editingProperty.address,
        city: editingProperty.city,
        state: editingProperty.state,
        bedrooms: String(editingProperty.bedrooms || "0"),
        bathrooms: String(editingProperty.bathrooms || "0"),
        squareFeet: editingProperty.squareFeet ? String(editingProperty.squareFeet) : "",
        isFeatured: editingProperty.isFeatured || false,
      });
    }
  }, [editingProperty, propertyForm]);

  useEffect(() => {
    if (editingBlog) {
      blogForm.reset({
        title: editingBlog.title,
        slug: editingBlog.slug,
        excerpt: editingBlog.excerpt || "",
        content: editingBlog.content,
        status: (editingBlog.status === "published" ? "published" : "draft") as "draft" | "published",
        metaTitle: (editingBlog as any).metaTitle || "",
        metaDescription: (editingBlog as any).metaDescription || "",
        metaKeywords: ((editingBlog as any).metaKeywords || []).join(", "),
      });
    }
  }, [editingBlog, blogForm]);

  useEffect(() => {
    if (editingPage) {
      const contentString = typeof editingPage.content === 'string' 
        ? editingPage.content 
        : JSON.stringify(editingPage.content, null, 2);
      pageForm.reset({
        title: editingPage.title,
        content: contentString,
        metaTitle: (editingPage as any).metaTitle || "",
        metaDescription: (editingPage as any).metaDescription || "",
        metaKeywords: ((editingPage as any).metaKeywords || []).join(", "),
      });
    }
  }, [editingPage, pageForm]);

  // Auth guard - redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      return apiRequest("POST", "/api/properties", {
        ...data,
        price: data.price,
        bedrooms: parseInt(data.bedrooms),
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet ? parseInt(data.squareFeet) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsAddPropertyOpen(false);
      propertyForm.reset();
      toast({ title: "Property created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create property", variant: "destructive" });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Property> }) => {
      return apiRequest("PATCH", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setEditingProperty(null);
      propertyForm.reset();
      toast({ title: "Property updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update property", variant: "destructive" });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Property deleted" });
    },
  });

  const toggleFeatureFlagMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/feature-flags/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feature-flags"] });
      toast({ title: "Feature flag updated" });
    },
  });

  const approveBoostMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      apiRequest("PATCH", `/api/admin/boosts/${id}/approve`, { adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/boosts"] });
      toast({ title: "Boost approved", description: "The listing boost has been activated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve boost", variant: "destructive" });
    },
  });

  const rejectBoostMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      apiRequest("PATCH", `/api/admin/boosts/${id}/reject`, { adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/boosts"] });
      toast({ title: "Boost rejected", description: "The listing boost has been rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject boost", variant: "destructive" });
    },
  });

  const createCityMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/cities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cities"] });
      setIsAddCityOpen(false);
      cityForm.reset();
      toast({ title: "City added successfully" });
    },
  });

  const deleteCityMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/cities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cities"] });
      toast({ title: "City deleted" });
    },
  });

  const createLocalityMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/localities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/localities"] });
      setIsAddLocalityOpen(false);
      localityForm.reset();
      toast({ title: "Locality added successfully" });
    },
  });

  const deleteLocalityMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/localities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/localities"] });
      toast({ title: "Locality deleted" });
    },
  });

  const createBlogMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/blog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      setIsAddBlogOpen(false);
      blogForm.reset();
      toast({ title: "Blog post created" });
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/blog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      setEditingBlog(null);
      blogForm.reset();
      toast({ title: "Blog post updated" });
    },
  });

  const updateBlogStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => 
      apiRequest("PATCH", `/api/blog/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Blog status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update blog status", variant: "destructive" });
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Blog post deleted" });
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/admin/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      setIsAddEmployeeOpen(false);
      employeeForm.reset();
      toast({ title: "Employee added" });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({ title: "Employee removed" });
    },
  });

  const updateEnquiryStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/enquiries/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({ title: "Enquiry status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update enquiry status", variant: "destructive" });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: { title: string; content: any; metaTitle?: string | null; metaDescription?: string | null; metaKeywords?: string[] } }) =>
      apiRequest("PATCH", `/api/pages/${key}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setEditingPage(null);
      pageForm.reset();
      toast({ title: "Page updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update page", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddCategoryOpen(false);
      categoryForm.reset();
      toast({ title: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      categoryForm.reset();
      toast({ title: "Category updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const approveImageMutation = useMutation({
    mutationFn: async ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      apiRequest("PATCH", `/api/property-images/${id}/approve`, { isApproved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", editingProperty?.id, "images"] });
      toast({ title: "Image status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update image", variant: "destructive" });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/property-images/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", editingProperty?.id, "images"] });
      toast({ title: "Image deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete image", variant: "destructive" });
    },
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const { uploadFile, isUploading: isUploadingFile } = useUpload();

  const uploadImageMutation = useMutation({
    mutationFn: async ({ propertyId, url, caption }: { propertyId: string; url: string; caption?: string }) =>
      apiRequest("POST", `/api/properties/${propertyId}/images`, { url, caption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", editingProperty?.id, "images"] });
      toast({ title: "Image added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add image", variant: "destructive" });
    },
  });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !editingProperty) return;
    
    setUploadingImages(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadResponse = await uploadFile(file);
        if (uploadResponse) {
          await uploadImageMutation.mutateAsync({
            propertyId: editingProperty.id,
            url: uploadResponse.objectPath,
            caption: file.name,
          });
        }
      }
      toast({ title: `${files.length} image(s) uploaded successfully` });
    } catch (error) {
      toast({ title: "Failed to upload some images", variant: "destructive" });
    } finally {
      setUploadingImages(false);
    }
  };

  const [robotsTxt, setRobotsTxt] = useState(seoSettings?.robotsTxt || `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://leaseo.in/sitemap.xml`);
  const [metaTitle, setMetaTitle] = useState(seoSettings?.metaTitle || "Leaseo - Zero Brokerage Property Rentals in India");
  const [metaDescription, setMetaDescription] = useState(seoSettings?.metaDescription || "Find rental properties directly from owners. Zero brokerage, verified listings across Mumbai, Pune, Delhi, Bangalore and more.");
  const [googleAnalyticsCode, setGoogleAnalyticsCode] = useState(seoSettings?.googleAnalyticsCode || "");
  const [googleWebmasterCode, setGoogleWebmasterCode] = useState(seoSettings?.googleWebmasterCode || "");

  const saveSeoMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/admin/seo-settings", data),
    onSuccess: () => {
      toast({ title: "SEO settings saved" });
    },
  });

  const generateSitemapMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/generate-sitemap"),
    onSuccess: () => {
      toast({ title: "Sitemap generated successfully" });
    },
  });

  const stats = {
    totalProperties: properties.length,
    activeListings: properties.filter(p => p.status === "active").length,
    totalEnquiries: enquiries.length,
    pendingEnquiries: enquiries.filter(e => e.status === "new" || e.status === "pending").length,
  };

  const handlePropertySubmit = (data: PropertyFormData) => {
    if (editingProperty) {
      updatePropertyMutation.mutate({
        id: editingProperty.id,
        data: {
          ...data,
          price: data.price,
          bedrooms: parseInt(data.bedrooms),
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet ? parseInt(data.squareFeet) : undefined,
        } as any,
      });
    } else {
      createPropertyMutation.mutate(data);
    }
  };

  const handleBlogSubmit = (data: { title: string; slug: string; excerpt: string; content: string; status: "draft" | "published"; metaTitle?: string; metaDescription?: string; metaKeywords?: string }) => {
    const blogData = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      status: data.status,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords ? data.metaKeywords.split(",").map(k => k.trim()).filter(Boolean) : [],
    };
    if (editingBlog) {
      updateBlogMutation.mutate({ id: editingBlog.id, data: blogData });
    } else {
      createBlogMutation.mutate(blogData);
    }
  };

  const handlePageSubmit = (data: { title: string; content: string; metaTitle?: string; metaDescription?: string; metaKeywords?: string }) => {
    if (editingPage) {
      let contentToSave: any;
      try {
        contentToSave = JSON.parse(data.content);
      } catch {
        contentToSave = { text: data.content };
      }
      updatePageMutation.mutate({ 
        key: editingPage.pageKey, 
        data: { 
          title: data.title, 
          content: contentToSave,
          metaTitle: data.metaTitle || null,
          metaDescription: data.metaDescription || null,
          metaKeywords: data.metaKeywords ? data.metaKeywords.split(",").map(k => k.trim()).filter(Boolean) : [],
        } 
      });
    }
  };

  const handleReply = () => {
    if (viewingEnquiry && replyMessage) {
      window.location.href = `mailto:${viewingEnquiry.email}?subject=Re: Property Enquiry&body=${encodeURIComponent(replyMessage)}`;
      updateEnquiryStatusMutation.mutate({ id: viewingEnquiry.id, status: "contacted" });
      setViewingEnquiry(null);
      setReplyMessage("");
    }
  };

  const handleCategorySubmit = (data: any) => {
    const submitData = {
      ...data,
      displayOrder: data.displayOrder ? parseInt(data.displayOrder) : 0,
      parentId: data.parentId || null,
      segment: data.segment || "rent",
      supportsRent: data.supportsRent ?? true,
      supportsSale: data.supportsSale ?? false,
      isCommercial: data.isCommercial ?? false,
    };
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: submitData });
    } else {
      createCategoryMutation.mutate(submitData);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection("properties")}
          data-testid="card-dashboard-properties"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">{stats.activeListings} active listings</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection("enquiries")}
          data-testid="card-dashboard-enquiries"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Enquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalEnquiries}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingEnquiries} pending</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection("cities")}
          data-testid="card-dashboard-cities"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Cities</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{cities.length}</div>
            <p className="text-xs text-muted-foreground">{localities.length} localities</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setActiveSection("blog")}
          data-testid="card-dashboard-blog"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{blogPosts.length}</div>
            <p className="text-xs text-muted-foreground">{blogPosts.filter(b => b.status === "published").length} published</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {enquiries.slice(0, 5).map((enquiry) => (
              <div key={enquiry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{enquiry.name}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">{enquiry.message}</p>
                </div>
                <Badge variant={enquiry.status === "new" ? "default" : "secondary"}>{enquiry.status}</Badge>
              </div>
            ))}
            {enquiries.length === 0 && <p className="text-muted-foreground">No enquiries yet</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {properties.slice(0, 5).map((property) => (
              <div key={property.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium truncate max-w-[200px]">{property.title}</p>
                  <p className="text-sm text-muted-foreground">{property.city}</p>
                </div>
                <Badge variant={property.status === "active" ? "default" : "secondary"}>{property.status}</Badge>
              </div>
            ))}
            {properties.length === 0 && <p className="text-muted-foreground">No properties yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Filter properties based on current filters
  const filteredProperties = properties.filter((property) => {
    // Segment filter
    if (propertySegment === "rent" && property.listingType !== "rent") return false;
    if (propertySegment === "buy" && property.listingType !== "sale") return false;
    if (propertySegment === "commercial" && !property.isCommercial) return false;
    
    // Search filter
    if (propertySearch) {
      const searchLower = propertySearch.toLowerCase();
      const matchesTitle = property.title.toLowerCase().includes(searchLower);
      const matchesCity = property.city?.toLowerCase().includes(searchLower);
      const matchesAddress = property.address?.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesCity && !matchesAddress) return false;
    }
    
    // City filter
    if (propertyFilterCity && property.city !== propertyFilterCity) return false;
    
    // Locality filter (compare by localityId -> locality name lookup)
    if (propertyFilterLocality) {
      const propertyLocalityName = localities.find(l => l.id === property.localityId)?.name;
      if (propertyLocalityName !== propertyFilterLocality) return false;
    }
    
    // Status filter
    if (propertyFilterStatus !== "all" && property.status !== propertyFilterStatus) return false;
    
    // Price range filter
    const price = Number(property.rent || property.price || 0);
    if (propertyFilterPriceMin && price < Number(propertyFilterPriceMin)) return false;
    if (propertyFilterPriceMax && price > Number(propertyFilterPriceMax)) return false;
    
    // Date range filter
    if (propertyFilterDateFrom || propertyFilterDateTo) {
      const propertyDate = property.createdAt ? new Date(property.createdAt) : null;
      if (!propertyDate) return false;
      if (propertyFilterDateFrom && propertyDate < new Date(propertyFilterDateFrom)) return false;
      if (propertyFilterDateTo && propertyDate > new Date(propertyFilterDateTo + "T23:59:59")) return false;
    }
    
    return true;
  });

  // Reset page when filters change or filtered results shrink
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredProperties.length / ITEMS_PER_PAGE));
    if (propertyPage > maxPage) {
      setPropertyPage(maxPage);
    }
  }, [filteredProperties.length, propertyPage]);

  // Reset page when search/filters change
  useEffect(() => {
    setPropertyPage(1);
  }, [propertySearch, propertyFilterCity, propertyFilterLocality, propertyFilterStatus, propertyFilterPriceMin, propertyFilterPriceMax, propertyFilterDateFrom, propertyFilterDateTo]);

  // Export properties to CSV (with proper escaping)
  const exportPropertiesToCSV = () => {
    const escapeCSV = (val: any) => {
      const str = String(val ?? "-");
      // Escape quotes by doubling them and wrap in quotes
      return `"${str.replace(/"/g, '""')}"`;
    };
    
    const headers = ["Title", "Type", "Listing", "City", "Address", "Price", "Status", "Owner Email", "Owner Phone", "Upload Date"];
    const rows = filteredProperties.map(p => [
      p.title,
      p.isCommercial ? "Commercial" : "Residential",
      p.listingType,
      p.city,
      p.address,
      p.rent || p.price,
      p.status,
      (p as any).ownerEmail || "-",
      (p as any).ownerPhone || "-",
      p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `properties_${propertySegment}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `Exported ${filteredProperties.length} properties` });
  };

  // Helper to get owner name from property
  const getOwnerName = (property: Property) => {
    const owner = propertyOwners.find(o => o.id === property.ownerId);
    if (owner) {
      return `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email || "-";
    }
    return "-";
  };

  const renderPropertyTable = (propertiesToShow: Property[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Upload Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {propertiesToShow.map((property) => (
          <TableRow key={property.id} data-testid={`row-property-${property.id}`}>
            <TableCell className="font-medium max-w-[160px] truncate">{property.title}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize text-xs">
                {property.isCommercial ? "Commercial" : property.listingType === "sale" ? "Buy" : "Rent"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm max-w-[100px] truncate">{getOwnerName(property)}</TableCell>
            <TableCell className="text-sm">{property.city}</TableCell>
            <TableCell className="text-sm">₹{Number(property.rent || property.price).toLocaleString()}{property.listingType === "rent" ? "/mo" : ""}</TableCell>
            <TableCell>
              <div className="text-xs space-y-1">
                {(property as any).ownerEmail && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{(property as any).ownerEmail}</span>
                  </div>
                )}
                {(property as any).ownerPhone && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{(property as any).ownerPhone}</span>
                  </div>
                )}
                {!(property as any).ownerEmail && !(property as any).ownerPhone && (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : "-"}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Switch
                  checked={property.status === "active"}
                  onCheckedChange={(checked) => {
                    updatePropertyMutation.mutate({
                      id: property.id,
                      data: { status: checked ? "active" : "inactive" } as any,
                    });
                  }}
                  data-testid={`switch-property-status-${property.id}`}
                />
                <Badge variant={property.status === "active" ? "default" : "secondary"} className="text-xs">
                  {property.status}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => window.open(`/properties/${property.id}`, '_blank')}
                  data-testid={`button-view-property-${property.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => setEditingProperty(property)}
                  data-testid={`button-edit-property-${property.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deletePropertyMutation.mutate(property.id)}
                  data-testid={`button-delete-property-${property.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderProperties = () => {
    const rentProperties = filteredProperties.filter(p => p.listingType === "rent" && !p.isCommercial);
    const buyProperties = filteredProperties.filter(p => p.listingType === "sale" && !p.isCommercial);
    const commercialProperties = filteredProperties.filter(p => p.isCommercial);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Properties</h1>
            <p className="text-muted-foreground">Manage property listings ({filteredProperties.length} total)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPropertiesToCSV} data-testid="button-export-properties">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsAddPropertyOpen(true)} data-testid="button-add-property">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Search</Label>
                <Input
                  placeholder="Search by title, city, address..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  data-testid="input-property-search"
                />
              </div>
              <div className="w-[150px]">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Select value={propertyFilterCity || "all"} onValueChange={(v) => setPropertyFilterCity(v === "all" ? "" : v)}>
                  <SelectTrigger data-testid="select-property-city">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={propertyFilterStatus} onValueChange={setPropertyFilterStatus}>
                  <SelectTrigger data-testid="select-property-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                data-testid="button-toggle-advanced-filters"
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                {showAdvancedFilters ? "Hide Filters" : "More Filters"}
              </Button>
            </div>
            
            {showAdvancedFilters && (
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t items-end">
                <div className="w-[150px]">
                  <Label className="text-xs text-muted-foreground">Locality</Label>
                  <Select value={propertyFilterLocality || "all"} onValueChange={(v) => setPropertyFilterLocality(v === "all" ? "" : v)}>
                    <SelectTrigger data-testid="select-property-locality">
                      <SelectValue placeholder="All Localities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Localities</SelectItem>
                      {localities
                        .filter(l => !propertyFilterCity || cities.find(c => c.name === propertyFilterCity)?.id === l.cityId)
                        .map(locality => (
                          <SelectItem key={locality.id} value={locality.name}>{locality.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[130px]">
                  <Label className="text-xs text-muted-foreground">Min Price (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={propertyFilterPriceMin}
                    onChange={(e) => setPropertyFilterPriceMin(e.target.value)}
                    data-testid="input-price-min"
                  />
                </div>
                <div className="w-[130px]">
                  <Label className="text-xs text-muted-foreground">Max Price (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={propertyFilterPriceMax}
                    onChange={(e) => setPropertyFilterPriceMax(e.target.value)}
                    data-testid="input-price-max"
                  />
                </div>
                <div className="w-[140px]">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={propertyFilterDateFrom}
                    onChange={(e) => setPropertyFilterDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
                <div className="w-[140px]">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={propertyFilterDateTo}
                    onChange={(e) => setPropertyFilterDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setPropertySearch("");
                    setPropertyFilterCity("");
                    setPropertyFilterLocality("");
                    setPropertyFilterStatus("all");
                    setPropertyFilterPriceMin("");
                    setPropertyFilterPriceMax("");
                    setPropertyFilterDateFrom("");
                    setPropertyFilterDateTo("");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Tabs by Segment */}
        <Tabs value={propertySegment} onValueChange={(v) => { setPropertySegment(v as any); setPropertyPage(1); }} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all-properties">
              All ({filteredProperties.length})
            </TabsTrigger>
            <TabsTrigger value="rent" data-testid="tab-rent-properties">
              Rent ({rentProperties.length})
            </TabsTrigger>
            <TabsTrigger value="buy" data-testid="tab-buy-properties">
              Buy ({buyProperties.length})
            </TabsTrigger>
            <TabsTrigger value="commercial" data-testid="tab-commercial-properties">
              Commercial ({commercialProperties.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {propertiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No properties found</p>
                  </div>
                ) : (
                  <>
                    {renderPropertyTable(filteredProperties.slice((propertyPage - 1) * ITEMS_PER_PAGE, propertyPage * ITEMS_PER_PAGE))}
                    {filteredProperties.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {(propertyPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(propertyPage * ITEMS_PER_PAGE, filteredProperties.length)} of {filteredProperties.length}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPropertyPage(p => Math.max(1, p - 1))}
                            disabled={propertyPage === 1}
                            data-testid="button-prev-page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPropertyPage(p => p + 1)}
                            disabled={propertyPage * ITEMS_PER_PAGE >= filteredProperties.length}
                            data-testid="button-next-page"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rent" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {rentProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No rental properties found</p>
                  </div>
                ) : (
                  <>
                    {renderPropertyTable(rentProperties.slice((propertyPage - 1) * ITEMS_PER_PAGE, propertyPage * ITEMS_PER_PAGE))}
                    {rentProperties.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {(propertyPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(propertyPage * ITEMS_PER_PAGE, rentProperties.length)} of {rentProperties.length}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPropertyPage(p => Math.max(1, p - 1))} disabled={propertyPage === 1}>
                            <ChevronLeft className="h-4 w-4" /> Previous
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPropertyPage(p => p + 1)} disabled={propertyPage * ITEMS_PER_PAGE >= rentProperties.length}>
                            Next <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="buy" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {buyProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No sale properties found</p>
                  </div>
                ) : (
                  <>
                    {renderPropertyTable(buyProperties.slice((propertyPage - 1) * ITEMS_PER_PAGE, propertyPage * ITEMS_PER_PAGE))}
                    {buyProperties.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {(propertyPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(propertyPage * ITEMS_PER_PAGE, buyProperties.length)} of {buyProperties.length}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPropertyPage(p => Math.max(1, p - 1))} disabled={propertyPage === 1}>
                            <ChevronLeft className="h-4 w-4" /> Previous
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPropertyPage(p => p + 1)} disabled={propertyPage * ITEMS_PER_PAGE >= buyProperties.length}>
                            Next <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="commercial" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {commercialProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No commercial properties found</p>
                  </div>
                ) : (
                  <>
                    {renderPropertyTable(commercialProperties.slice((propertyPage - 1) * ITEMS_PER_PAGE, propertyPage * ITEMS_PER_PAGE))}
                    {commercialProperties.length > ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {(propertyPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(propertyPage * ITEMS_PER_PAGE, commercialProperties.length)} of {commercialProperties.length}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPropertyPage(p => Math.max(1, p - 1))} disabled={propertyPage === 1}>
                            <ChevronLeft className="h-4 w-4" /> Previous
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPropertyPage(p => p + 1)} disabled={propertyPage * ITEMS_PER_PAGE >= commercialProperties.length}>
                            Next <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderEnquiries = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enquiries</h1>
        <p className="text-muted-foreground">Manage property enquiries</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {enquiriesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : enquiries.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No enquiries yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((enquiry) => (
                  <TableRow key={enquiry.id} data-testid={`row-enquiry-${enquiry.id}`}>
                    <TableCell className="font-medium">{enquiry.name}</TableCell>
                    <TableCell>{enquiry.email}</TableCell>
                    <TableCell>{enquiry.phone || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{enquiry.message}</TableCell>
                    <TableCell>
                      <Select
                        value={enquiry.status || "new"}
                        onValueChange={(value) => updateEnquiryStatusMutation.mutate({ id: enquiry.id, status: value })}
                      >
                        <SelectTrigger className="w-[120px]" data-testid={`select-enquiry-status-${enquiry.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => setViewingEnquiry(enquiry)}
                          data-testid={`button-view-enquiry-${enquiry.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            setViewingEnquiry(enquiry);
                            setReplyMessage("");
                          }}
                          data-testid={`button-reply-enquiry-${enquiry.id}`}
                        >
                          <Reply className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      apiRequest("POST", `/api/admin/users/${userId}/reset-password`, { newPassword }),
    onSuccess: (_, { userId }) => {
      const employee = employees.find(e => e.id === userId);
      toast({ title: "Password reset", description: `Password has been reset for ${employee?.email || "user"}` });
      setResetPasswordUserId(null);
      setNewPassword("");
    },
    onError: () => {
      toast({ title: "Failed to reset password", variant: "destructive" });
    },
  });

  const handleResetPassword = () => {
    if (resetPasswordUserId && newPassword.length >= 6) {
      resetPasswordMutation.mutate({ userId: resetPasswordUserId, newPassword });
    }
  };

  const renderEmployees = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Employees & Users</h1>
          <p className="text-muted-foreground">Manage team access and user passwords</p>
        </div>
        <Button onClick={() => setIsAddEmployeeOpen(true)} data-testid="button-add-employee">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {employeesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No employees added yet</p>
              <p className="text-sm text-muted-foreground mt-2">Add team members to give them admin access</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                    <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell><Badge variant="outline">{employee.role}</Badge></TableCell>
                    <TableCell><Badge variant="default">Active</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setResetPasswordUserId(employee.id)}
                          title="Reset Password"
                          data-testid={`button-reset-password-${employee.id}`}
                        >
                          <KeyIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                          data-testid={`button-delete-employee-${employee.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={!!resetPasswordUserId} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordUserId(null);
          setNewPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new password for {employees.find(e => e.id === resetPasswordUserId)?.email || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-destructive">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordUserId(null);
              setNewPassword("");
            }}>Cancel</Button>
            <Button 
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6 || resetPasswordMutation.isPending}
              data-testid="button-confirm-reset-password"
            >
              {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderOwners = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Property Owners</h1>
          <p className="text-muted-foreground">Users who have listed properties on the platform</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {ownersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : propertyOwners.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No property owners yet</p>
              <p className="text-sm text-muted-foreground mt-2">Users who list properties will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertyOwners.map((owner) => (
                  <TableRow key={owner.id} data-testid={`row-owner-${owner.id}`}>
                    <TableCell className="font-medium">{owner.firstName || "-"} {owner.lastName || ""}</TableCell>
                    <TableCell>{owner.email || "-"}</TableCell>
                    <TableCell>{owner.phone || "-"}</TableCell>
                    <TableCell><Badge variant="secondary">{owner.propertyCount} listings</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={owner.isActive !== false ? "default" : "secondary"}>
                        {owner.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setResetPasswordUserId(owner.id)}
                        title="Reset Password"
                        data-testid={`button-reset-password-owner-${owner.id}`}
                      >
                        <KeyIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Login Users</h1>
          <p className="text-muted-foreground">All registered users (owners, buyers, renters)</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {usersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : loginUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No registered users yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.firstName || "-"} {user.lastName || ""}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.length > 0 ? (
                          user.roles.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-xs capitalize">
                              {role.replace(/_/g, " ")}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-xs">No role</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive !== false ? "default" : "secondary"}>
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setResetPasswordUserId(user.id)}
                        title="Reset Password"
                        data-testid={`button-reset-password-user-${user.id}`}
                      >
                        <KeyIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCities = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Cities & Localities</h1>
          <p className="text-muted-foreground">Manage locations available on the platform</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddCityOpen(true)} data-testid="button-add-city">
            <Plus className="h-4 w-4 mr-2" />
            Add City
          </Button>
          <Button variant="outline" onClick={() => setIsAddLocalityOpen(true)} data-testid="button-add-locality">
            <Plus className="h-4 w-4 mr-2" />
            Add Locality
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cities ({cities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {citiesLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : cities.length === 0 ? (
              <p className="text-muted-foreground">No cities added</p>
            ) : (
              <div className="space-y-2">
                {cities.map((city) => (
                  <div key={city.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{city.name}</p>
                      <p className="text-sm text-muted-foreground">{city.state}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteCityMutation.mutate(city.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localities ({localities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {localitiesLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : localities.length === 0 ? (
              <p className="text-muted-foreground">No localities added</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {localities.map((locality) => (
                  <div key={locality.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{locality.name}</p>
                      <p className="text-sm text-muted-foreground">{locality.pincode || "No pincode"}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteLocalityMutation.mutate(locality.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBlog = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-muted-foreground">Manage blog posts and articles</p>
        </div>
        <Button onClick={() => setIsAddBlogOpen(true)} data-testid="button-add-blog">
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {blogLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : blogPosts.length === 0 ? (
            <div className="text-center py-12">
              <PenTool className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No blog posts yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create your first blog post to engage users</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogPosts.map((post) => (
                  <TableRow key={post.id} data-testid={`row-blog-${post.id}`}>
                    <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                    <TableCell><Badge variant="outline">{post.slug}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={post.status === "published"}
                          onCheckedChange={(checked) => {
                            updateBlogStatusMutation.mutate({
                              id: post.id,
                              status: checked ? "published" : "draft",
                            });
                          }}
                          data-testid={`switch-blog-status-${post.id}`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {post.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => setEditingBlog(post)}
                          data-testid={`button-edit-blog-${post.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => deleteBlogMutation.mutate(post.id)}
                          data-testid={`button-delete-blog-${post.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Build category tree from flat list
  const categoryTree = (() => {
    const mainCategories = categories.filter(c => !c.parentId);
    const subcategories = categories.filter(c => c.parentId);
    return mainCategories.map(main => ({
      ...main,
      children: subcategories.filter(sub => sub.parentId === main.id)
    }));
  })();

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case "rent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "buy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "commercial": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const renderCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Property Categories</h1>
          <p className="text-muted-foreground">Manage property categories with hierarchy</p>
        </div>
        <Button onClick={() => setIsAddCategoryOpen(true)} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categoriesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">No categories yet. Create your first category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {categoryTree.map((mainCategory: any) => (
            <Card key={mainCategory.id} data-testid={`card-category-${mainCategory.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Badge className={getSegmentColor(mainCategory.segment)}>
                      {mainCategory.segment?.toUpperCase() || "RENT"}
                    </Badge>
                    <CardTitle className="text-xl">{mainCategory.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">{mainCategory.slug}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mainCategory.isActive ?? true}
                      onCheckedChange={(checked) => {
                        updateCategoryMutation.mutate({
                          id: mainCategory.id,
                          data: { isActive: checked },
                        });
                      }}
                      data-testid={`switch-category-active-${mainCategory.id}`}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setEditingCategory(mainCategory)}
                      data-testid={`button-edit-category-${mainCategory.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {mainCategory.description && (
                  <CardDescription>{mainCategory.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {mainCategory.children && mainCategory.children.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">
                      Subcategories ({mainCategory.children.length})
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Sale</TableHead>
                          <TableHead>Commercial</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mainCategory.children.map((child: any) => (
                          <TableRow key={child.id} data-testid={`row-category-${child.id}`}>
                            <TableCell className="font-medium">{child.name}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{child.slug}</Badge></TableCell>
                            <TableCell>
                              {child.supportsRent ? (
                                <Badge variant="secondary" className="text-xs">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {child.supportsSale ? (
                                <Badge variant="secondary" className="text-xs">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {child.isCommercial ? (
                                <Badge variant="secondary" className="text-xs">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">No</span>
                              )}
                            </TableCell>
                            <TableCell>{child.displayOrder || 0}</TableCell>
                            <TableCell>
                              <Switch
                                checked={child.isActive ?? true}
                                onCheckedChange={(checked) => {
                                  updateCategoryMutation.mutate({
                                    id: child.id,
                                    data: { isActive: checked },
                                  });
                                }}
                                data-testid={`switch-category-active-${child.id}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => setEditingCategory(child)}
                                  data-testid={`button-edit-category-${child.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  onClick={() => deleteCategoryMutation.mutate(child.id)}
                                  data-testid={`button-delete-category-${child.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">No subcategories</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderPages = () => {
    const defaultPages = [
      { pageKey: "homepage", title: "Homepage", content: { hero: "Welcome to Leaseo", description: "Find your perfect rental property" } },
      { pageKey: "about", title: "About Us", content: { text: "About our company" } },
      { pageKey: "contact", title: "Contact Us", content: { email: "contact@leaseo.in", phone: "+91 XXXXXXXXXX" } },
      { pageKey: "privacy", title: "Privacy Policy", content: { text: "Privacy policy content" } },
      { pageKey: "terms", title: "Terms of Service", content: { text: "Terms of service content" } },
    ];
    
    const mergedPages = defaultPages.map(dp => {
      const existingPage = pages.find(p => p.pageKey === dp.pageKey);
      return existingPage || dp;
    });

    const getContentPreview = (content: any) => {
      if (!content) return "No content";
      if (typeof content === 'string') return content.substring(0, 100) + (content.length > 100 ? "..." : "");
      const text = content.text || content.hero || content.description || JSON.stringify(content);
      return String(text).substring(0, 100) + (String(text).length > 100 ? "..." : "");
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-muted-foreground">Manage static page content</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {pagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Content Preview</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedPages.map((page) => (
                    <TableRow key={page.pageKey} data-testid={`row-page-${page.pageKey}`}>
                      <TableCell className="font-medium capitalize">{page.pageKey}</TableCell>
                      <TableCell>{page.title}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {getContentPreview(page.content)}
                      </TableCell>
                      <TableCell>
                        {(page as PageContent).updatedAt 
                          ? new Date((page as PageContent).updatedAt!).toLocaleDateString() 
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const pageUrl = page.pageKey === "homepage" ? "/" : `/${page.pageKey}`;
                              window.open(pageUrl, "_blank");
                            }}
                            data-testid={`button-live-edit-page-${page.pageKey}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Live Edit
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => setEditingPage(page as PageContent)}
                            data-testid={`button-edit-page-${page.pageKey}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Live Page Editing</CardTitle>
            <CardDescription>Edit pages directly on the website</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
              <p className="text-sm">
                To edit pages live on the website:
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Click the "Live Edit" button next to any page above</li>
                <li>On the page, look for the floating edit toggle button (bottom-right corner)</li>
                <li>Click to enable edit mode - text elements will become editable</li>
                <li>Make your changes and click "Save" to publish</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSeo = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Settings</h1>
        <p className="text-muted-foreground">Optimize your site for search engines</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Meta Tags</CardTitle>
            <CardDescription>Default meta tags for the website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-title">Meta Title</Label>
              <Input
                id="meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Site title for search results"
                data-testid="input-meta-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-desc">Meta Description</Label>
              <Textarea
                id="meta-desc"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Description for search results"
                rows={3}
                data-testid="input-meta-description"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracking Codes</CardTitle>
            <CardDescription>Google Analytics and Search Console verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ga-code">Google Analytics Code</Label>
              <Input
                id="ga-code"
                value={googleAnalyticsCode}
                onChange={(e) => setGoogleAnalyticsCode(e.target.value)}
                placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                data-testid="input-google-analytics"
              />
              <p className="text-xs text-muted-foreground">Enter your Google Analytics tracking ID (e.g., G-XXXXXXXXXX for GA4 or UA-XXXXXXXXX-X for Universal Analytics)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webmaster-code">Google Search Console Verification</Label>
              <Input
                id="webmaster-code"
                value={googleWebmasterCode}
                onChange={(e) => setGoogleWebmasterCode(e.target.value)}
                placeholder="Verification meta tag content"
                data-testid="input-google-webmaster"
              />
              <p className="text-xs text-muted-foreground">Enter the content value from your Google Search Console verification meta tag</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Robots.txt</CardTitle>
            <CardDescription>Control how search engines crawl your site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={robotsTxt}
              onChange={(e) => setRobotsTxt(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              data-testid="input-robots-txt"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Sitemap</CardTitle>
              <CardDescription>Generate XML sitemap for search engines</CardDescription>
            </div>
            <Button
              onClick={() => generateSitemapMutation.mutate()}
              disabled={generateSitemapMutation.isPending}
              data-testid="button-generate-sitemap"
            >
              {generateSitemapMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
              Generate Sitemap
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The sitemap will include all published properties, blog posts, and city pages.
              It will be available at <code className="bg-muted px-1 rounded">/sitemap.xml</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => saveSeoMutation.mutate({ robotsTxt, metaTitle, metaDescription, googleAnalyticsCode, googleWebmasterCode })}
            disabled={saveSeoMutation.isPending}
            data-testid="button-save-seo"
          >
            {saveSeoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save SEO Settings
          </Button>
        </div>
      </div>
    </div>
  );

  const getBoostStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending_payment: { variant: "secondary", label: "Pending Payment" },
      pending_approval: { variant: "outline", label: "Pending Approval" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      expired: { variant: "secondary", label: "Expired" },
      cancelled: { variant: "secondary", label: "Cancelled" },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderBoosts = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Listing Boosts</h1>
        <p className="text-muted-foreground">Manage property boost requests and approvals</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Boost Requests
          </CardTitle>
          <CardDescription>Review and approve paid boost requests</CardDescription>
        </CardHeader>
        <CardContent>
          {boostsLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : boosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No boost requests yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Boost Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boosts.map((boost: any) => (
                  <TableRow key={boost.id} data-testid={`boost-row-${boost.id}`}>
                    <TableCell className="font-medium">{boost.propertyTitle || "N/A"}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{boost.userName || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{boost.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{boost.boostType}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {boost.amount}
                    </TableCell>
                    <TableCell>{getBoostStatusBadge(boost.status)}</TableCell>
                    <TableCell>
                      {boost.createdAt ? new Date(boost.createdAt).toLocaleDateString("en-IN") : "N/A"}
                    </TableCell>
                    <TableCell>
                      {boost.status === "pending_approval" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveBoostMutation.mutate({ id: boost.id })}
                            disabled={approveBoostMutation.isPending}
                            data-testid={`approve-boost-${boost.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectBoostMutation.mutate({ id: boost.id })}
                            disabled={rejectBoostMutation.isPending}
                            data-testid={`reject-boost-${boost.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {boost.status === "approved" && boost.isActive && (
                        <Badge className="bg-green-500">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      completed: { variant: "default", label: "Completed" },
      failed: { variant: "destructive", label: "Failed" },
      refunded: { variant: "outline", label: "Refunded" },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderPayments = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View all payment transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Records
          </CardTitle>
          <CardDescription>All payment transactions from boost purchases</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : paymentsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payments yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsData.map((payment: any) => (
                  <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                    <TableCell className="font-mono text-sm">
                      {payment.transactionId || payment.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.userName || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{payment.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{payment.propertyTitle || "N/A"}</TableCell>
                    <TableCell className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {payment.amount} {payment.currency}
                    </TableCell>
                    <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                    <TableCell className="capitalize">{payment.paymentMethod || "N/A"}</TableCell>
                    <TableCell>
                      {payment.paidAt 
                        ? new Date(payment.paidAt).toLocaleDateString("en-IN")
                        : payment.createdAt 
                          ? new Date(payment.createdAt).toLocaleDateString("en-IN")
                          : "N/A"
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const [gatewayMode, setGatewayMode] = useState<"sandbox" | "live">("sandbox");
  const [gatewayActive, setGatewayActive] = useState(false);
  const [gatewayApiKey, setGatewayApiKey] = useState("");
  const [gatewayAuthToken, setGatewayAuthToken] = useState("");
  const [gatewaySandboxApiKey, setGatewaySandboxApiKey] = useState("");
  const [gatewaySandboxAuthToken, setGatewaySandboxAuthToken] = useState("");
  const [gatewayTesting, setGatewayTesting] = useState(false);

  const { data: gatewaySettings, isLoading: gatewayLoading } = useQuery({
    queryKey: ["/api/admin/payment-providers", "instamojo"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payment-providers/instamojo", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  useEffect(() => {
    if (gatewaySettings) {
      setGatewayMode(gatewaySettings.mode || "sandbox");
      setGatewayActive(gatewaySettings.isActive || false);
    }
  }, [gatewaySettings]);

  useEffect(() => {
    if (seoSettings) {
      setRobotsTxt(seoSettings.robotsTxt || "");
      setMetaTitle(seoSettings.metaTitle || "");
      setMetaDescription(seoSettings.metaDescription || "");
      setGoogleAnalyticsCode(seoSettings.googleAnalyticsCode || "");
      setGoogleWebmasterCode(seoSettings.googleWebmasterCode || "");
    }
  }, [seoSettings]);

  const updateGatewayMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/payment-providers/instamojo", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Payment gateway settings have been updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-providers", "instamojo"] });
      setGatewayApiKey("");
      setGatewayAuthToken("");
      setGatewaySandboxApiKey("");
      setGatewaySandboxAuthToken("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testGatewayMutation = useMutation({
    mutationFn: async () => {
      setGatewayTesting(true);
      const res = await fetch("/api/admin/payment-providers/instamojo/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed");
      return data;
    },
    onSuccess: () => {
      toast({ title: "Connection successful", description: "Instamojo API credentials are valid" });
      setGatewayTesting(false);
    },
    onError: (error: any) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
      setGatewayTesting(false);
    },
  });

  const renderGateway = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway</h1>
        <p className="text-muted-foreground">Configure Instamojo payment gateway for boost payments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            Instamojo Configuration
          </CardTitle>
          <CardDescription>
            Configure your Instamojo API credentials for processing boost payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {gatewayLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Payment Gateway Status</p>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable Instamojo payments
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={gatewayActive ? "default" : "secondary"}>
                    {gatewayActive ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={gatewayActive}
                    onCheckedChange={(checked) => {
                      setGatewayActive(checked);
                      updateGatewayMutation.mutate({ isActive: checked });
                    }}
                    data-testid="switch-gateway-active"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Environment Mode</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select sandbox for testing or live for production
                  </p>
                  <Select
                    value={gatewayMode}
                    onValueChange={(value: "sandbox" | "live") => {
                      setGatewayMode(value);
                      updateGatewayMutation.mutate({ mode: value });
                    }}
                  >
                    <SelectTrigger className="w-[200px]" data-testid="select-gateway-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="live">Live (Production)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <Tabs defaultValue="sandbox" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sandbox">Sandbox Credentials</TabsTrigger>
                  <TabsTrigger value="live">Live Credentials</TabsTrigger>
                </TabsList>
                <TabsContent value="sandbox" className="space-y-4 mt-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Sandbox credentials are used for testing. Use test.instamojo.com credentials here.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sandbox-api-key">Sandbox API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sandbox-api-key"
                        type="text"
                        placeholder={gatewaySettings?.hasSandboxApiKey ? "••••••••" + (gatewaySettings?.sandboxApiKey?.slice(-4) || "") : "Enter sandbox API key"}
                        value={gatewaySandboxApiKey}
                        onChange={(e) => setGatewaySandboxApiKey(e.target.value)}
                        data-testid="input-sandbox-api-key"
                      />
                    </div>
                    {gatewaySettings?.hasSandboxApiKey && (
                      <p className="text-xs text-muted-foreground">Current: {gatewaySettings?.sandboxApiKey}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sandbox-auth-token">Sandbox Auth Token</Label>
                    <Input
                      id="sandbox-auth-token"
                      type="password"
                      placeholder={gatewaySettings?.hasSandboxAuthToken ? "••••••••" + (gatewaySettings?.sandboxAuthToken?.slice(-4) || "") : "Enter sandbox auth token"}
                      value={gatewaySandboxAuthToken}
                      onChange={(e) => setGatewaySandboxAuthToken(e.target.value)}
                      data-testid="input-sandbox-auth-token"
                    />
                    {gatewaySettings?.hasSandboxAuthToken && (
                      <p className="text-xs text-muted-foreground">Current: {gatewaySettings?.sandboxAuthToken}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => updateGatewayMutation.mutate({
                      sandboxApiKey: gatewaySandboxApiKey,
                      sandboxAuthToken: gatewaySandboxAuthToken,
                    })}
                    disabled={updateGatewayMutation.isPending || (!gatewaySandboxApiKey && !gatewaySandboxAuthToken)}
                    data-testid="button-save-sandbox-credentials"
                  >
                    {updateGatewayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Sandbox Credentials
                  </Button>
                </TabsContent>
                <TabsContent value="live" className="space-y-4 mt-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Live credentials are used for real payments. Use www.instamojo.com credentials here.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="live-api-key">Live API Key</Label>
                    <Input
                      id="live-api-key"
                      type="text"
                      placeholder={gatewaySettings?.hasApiKey ? "••••••••" + (gatewaySettings?.apiKey?.slice(-4) || "") : "Enter live API key"}
                      value={gatewayApiKey}
                      onChange={(e) => setGatewayApiKey(e.target.value)}
                      data-testid="input-live-api-key"
                    />
                    {gatewaySettings?.hasApiKey && (
                      <p className="text-xs text-muted-foreground">Current: {gatewaySettings?.apiKey}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="live-auth-token">Live Auth Token</Label>
                    <Input
                      id="live-auth-token"
                      type="password"
                      placeholder={gatewaySettings?.hasAuthToken ? "••••••••" + (gatewaySettings?.authToken?.slice(-4) || "") : "Enter live auth token"}
                      value={gatewayAuthToken}
                      onChange={(e) => setGatewayAuthToken(e.target.value)}
                      data-testid="input-live-auth-token"
                    />
                    {gatewaySettings?.hasAuthToken && (
                      <p className="text-xs text-muted-foreground">Current: {gatewaySettings?.authToken}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => updateGatewayMutation.mutate({
                      apiKey: gatewayApiKey,
                      authToken: gatewayAuthToken,
                    })}
                    disabled={updateGatewayMutation.isPending || (!gatewayApiKey && !gatewayAuthToken)}
                    data-testid="button-save-live-credentials"
                  >
                    {updateGatewayMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Live Credentials
                  </Button>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Test Connection</p>
                  <p className="text-sm text-muted-foreground">
                    Verify your {gatewayMode} credentials are working
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => testGatewayMutation.mutate()}
                  disabled={gatewayTesting}
                  data-testid="button-test-connection"
                >
                  {gatewayTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Test Connection
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Get Instamojo Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">For Sandbox (Testing):</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to <a href="https://test.instamojo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">test.instamojo.com</a></li>
              <li>Create a free test account</li>
              <li>Navigate to API & Plugins → Generate Credentials</li>
              <li>Copy the API Key and Auth Token</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">For Live (Production):</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Go to <a href="https://www.instamojo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.instamojo.com</a></li>
              <li>Sign in to your verified business account</li>
              <li>Navigate to API & Plugins → Generate Credentials</li>
              <li>Copy the API Key and Auth Token</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // SMS/WhatsApp Providers state
  const [smsMode, setSmsMode] = useState<"sandbox" | "live">("sandbox");
  const [activeProvider, setActiveProvider] = useState<string>("twilio");
  
  const { data: smsProviders, isLoading: smsProvidersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/notification-providers"],
    enabled: activeSection === "sms",
  });

  const updateSmsMutation = useMutation({
    mutationFn: async (data: { provider: string; settings: any }) => {
      return apiRequest("PUT", `/api/admin/notification-providers/${data.provider}`, data.settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-providers"] });
      toast({ title: "Settings saved", description: "SMS provider settings have been updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update settings", variant: "destructive" });
    },
  });

  const renderSmsProviders = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SMS/WhatsApp Providers</h1>
        <p className="text-muted-foreground">Configure notification providers for OTP and alerts</p>
      </div>

      <Tabs value={activeProvider} onValueChange={setActiveProvider}>
        <TabsList>
          <TabsTrigger value="twilio" data-testid="tab-twilio">
            <Phone className="h-4 w-4 mr-2" />
            Twilio
          </TabsTrigger>
          <TabsTrigger value="msg91" data-testid="tab-msg91">
            <MessageCircle className="h-4 w-4 mr-2" />
            MSG91
          </TabsTrigger>
          <TabsTrigger value="wati" data-testid="tab-wati">
            <MessageCircle className="h-4 w-4 mr-2" />
            WATI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twilio" className="mt-4">
          <SmsProviderCard 
            provider="twilio" 
            displayName="Twilio" 
            description="SMS and Voice API for OTP verification"
            providerData={smsProviders?.find(p => p.providerName === "twilio")}
            isLoading={smsProvidersLoading}
            onSave={(settings) => updateSmsMutation.mutate({ provider: "twilio", settings })}
            isSaving={updateSmsMutation.isPending}
            fields={[
              { key: "accountSid", label: "Account SID", placeholder: "Your Twilio Account SID" },
              { key: "authToken", label: "Auth Token", placeholder: "Your Twilio Auth Token", secret: true },
              { key: "fromNumber", label: "From Number", placeholder: "+1234567890" },
            ]}
          />
        </TabsContent>

        <TabsContent value="msg91" className="mt-4">
          <SmsProviderCard 
            provider="msg91" 
            displayName="MSG91" 
            description="Indian SMS gateway for domestic messaging"
            providerData={smsProviders?.find(p => p.providerName === "msg91")}
            isLoading={smsProvidersLoading}
            onSave={(settings) => updateSmsMutation.mutate({ provider: "msg91", settings })}
            isSaving={updateSmsMutation.isPending}
            fields={[
              { key: "apiKey", label: "API Key", placeholder: "Your MSG91 API Key", secret: true },
              { key: "accountSid", label: "Sender ID", placeholder: "LEASEO" },
              { key: "fromNumber", label: "Template ID", placeholder: "DLT Template ID" },
            ]}
          />
        </TabsContent>

        <TabsContent value="wati" className="mt-4">
          <SmsProviderCard 
            provider="wati" 
            displayName="WATI" 
            description="WhatsApp Business API for notifications"
            providerData={smsProviders?.find(p => p.providerName === "wati")}
            isLoading={smsProvidersLoading}
            onSave={(settings) => updateSmsMutation.mutate({ provider: "wati", settings })}
            isSaving={updateSmsMutation.isPending}
            fields={[
              { key: "apiKey", label: "API Key", placeholder: "Your WATI API Key", secret: true },
              { key: "accountSid", label: "Phone Number ID", placeholder: "WhatsApp Phone Number ID" },
              { key: "fromNumber", label: "Business Number", placeholder: "+91XXXXXXXXXX" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  // Roles management
  const { data: allRoles, isLoading: rolesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/roles"],
    enabled: activeSection === "roles",
  });

  const { data: usersWithRoles, isLoading: usersRolesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users-with-roles"],
    enabled: activeSection === "roles",
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/roles`, { roleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-roles"] });
      toast({ title: "Role assigned", description: "User role has been updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign role", variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-roles"] });
      toast({ title: "Role removed", description: "User role has been removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove role", variant: "destructive" });
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users-with-roles"] });
      toast({ title: "Status updated", description: "User status has been changed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const [selectedRoleForUser, setSelectedRoleForUser] = useState<Record<string, string>>({});
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplayName, setNewRoleDisplayName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newPermissionName, setNewPermissionName] = useState("");
  const [newPermissionDisplayName, setNewPermissionDisplayName] = useState("");
  const [newPermissionDescription, setNewPermissionDescription] = useState("");
  const [newPermissionCategory, setNewPermissionCategory] = useState("general");

  const { data: allPermissions = [], isLoading: permissionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/permissions"],
    enabled: activeSection === "roles",
  });

  const { data: rolePermissionsData = [], isLoading: rolePermsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/roles", selectedRoleForPermissions, "permissions"],
    enabled: !!selectedRoleForPermissions,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; displayName: string; description: string }) => {
      return apiRequest("POST", "/api/admin/roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsAddRoleOpen(false);
      setNewRoleName("");
      setNewRoleDisplayName("");
      setNewRoleDescription("");
      toast({ title: "Role created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create role", variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({ title: "Role deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete role", variant: "destructive" });
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: async (data: { name: string; displayName: string; description: string; category: string }) => {
      return apiRequest("POST", "/api/admin/permissions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/permissions"] });
      setIsAddPermissionOpen(false);
      setNewPermissionName("");
      setNewPermissionDisplayName("");
      setNewPermissionDescription("");
      setNewPermissionCategory("general");
      toast({ title: "Permission created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create permission", variant: "destructive" });
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/permissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/permissions"] });
      toast({ title: "Permission deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete permission", variant: "destructive" });
    },
  });

  const assignPermissionToRoleMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      return apiRequest("POST", `/api/admin/roles/${roleId}/permissions`, { permissionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles", selectedRoleForPermissions, "permissions"] });
      toast({ title: "Permission assigned to role" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign permission", variant: "destructive" });
    },
  });

  const removePermissionFromRoleMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      return apiRequest("DELETE", `/api/admin/roles/${roleId}/permissions/${permissionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles", selectedRoleForPermissions, "permissions"] });
      toast({ title: "Permission removed from role" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove permission", variant: "destructive" });
    },
  });

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage user roles and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddPermissionOpen(true)} variant="outline" data-testid="button-add-permission">
            <Plus className="h-4 w-4 mr-2" />
            Add Permission
          </Button>
          <Button onClick={() => setIsAddRoleOpen(true)} data-testid="button-add-role">
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Available Roles
              </CardTitle>
              <CardDescription>Click on a role to manage its permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="grid gap-3">
                  {allRoles?.map((role) => (
                    <div 
                      key={role.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoleForPermissions === role.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedRoleForPermissions(role.id)}
                      data-testid={`role-item-${role.id}`}
                    >
                      <div>
                        <p className="font-medium">{role.displayName || role.name}</p>
                        <p className="text-sm text-muted-foreground">{role.description || `Role: ${role.name}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={role.isActive !== false ? "default" : "secondary"}>
                          {role.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this role?")) {
                              deleteRoleMutation.mutate(role.id);
                            }
                          }}
                          data-testid={`button-delete-role-${role.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedRoleForPermissions && (
            <Card>
              <CardHeader>
                <CardTitle>Permissions for: {allRoles?.find(r => r.id === selectedRoleForPermissions)?.displayName}</CardTitle>
                <CardDescription>Assign or remove permissions for this role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                    <Label className="w-full mb-2">Current Permissions:</Label>
                    {rolePermsLoading ? (
                      <Skeleton className="h-8 w-32" />
                    ) : rolePermissionsData.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No permissions assigned</p>
                    ) : (
                      rolePermissionsData.map((perm: any) => (
                        <Badge key={perm.permissionId} variant="outline" className="gap-1">
                          {perm.permissionDisplayName}
                          <button
                            onClick={() => removePermissionFromRoleMutation.mutate({ 
                              roleId: selectedRoleForPermissions, 
                              permissionId: perm.permissionId 
                            })}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Add Permission:</Label>
                    <div className="flex flex-wrap gap-2">
                      {allPermissions
                        .filter(p => !rolePermissionsData.some((rp: any) => rp.permissionId === p.id))
                        .map((perm: any) => (
                          <Button
                            key={perm.id}
                            size="sm"
                            variant="outline"
                            onClick={() => assignPermissionToRoleMutation.mutate({
                              roleId: selectedRoleForPermissions,
                              permissionId: perm.id
                            })}
                            data-testid={`button-assign-perm-${perm.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {perm.displayName}
                          </Button>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyIcon className="h-5 w-5 text-primary" />
                All Permissions
              </CardTitle>
              <CardDescription>System permissions that can be assigned to roles</CardDescription>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    allPermissions.reduce((acc: any, perm: any) => {
                      const cat = perm.category || 'general';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(perm);
                      return acc;
                    }, {})
                  ).map(([category, perms]: [string, any]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium capitalize text-muted-foreground text-sm">{category}</h4>
                      <div className="grid gap-2">
                        {perms.map((perm: any) => (
                          <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{perm.displayName}</p>
                              <p className="text-sm text-muted-foreground">{perm.description || perm.name}</p>
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this permission?")) {
                                  deletePermissionMutation.mutate(perm.id);
                                }
                              }}
                              data-testid={`button-delete-perm-${perm.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Role Assignments
              </CardTitle>
              <CardDescription>Manage which roles are assigned to each user</CardDescription>
            </CardHeader>
            <CardContent>
              {usersRolesLoading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : usersWithRoles?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="space-y-4">
                  {usersWithRoles?.map((user) => (
                    <div key={user.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : "Unnamed User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email || user.phone || "No contact info"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) => 
                              toggleUserStatusMutation.mutate({ userId: user.id, isActive: checked })
                            }
                            data-testid={`switch-user-status-${user.id}`}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {user.roles?.length > 0 ? user.roles.map((role: any) => (
                          <Badge key={role.roleId} variant="outline" className="gap-1">
                            {role.roleDisplayName || role.roleName}
                            <button
                              onClick={() => removeRoleMutation.mutate({ userId: user.id, roleId: role.roleId })}
                              className="ml-1 hover:text-destructive"
                              data-testid={`button-remove-role-${user.id}-${role.roleId}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )) : <span className="text-sm text-muted-foreground">No roles assigned</span>}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Select 
                          value={selectedRoleForUser[user.id] || ""} 
                          onValueChange={(val) => setSelectedRoleForUser(prev => ({ ...prev, [user.id]: val }))}
                        >
                          <SelectTrigger className="w-48" data-testid={`select-role-${user.id}`}>
                            <SelectValue placeholder="Select role to add" />
                          </SelectTrigger>
                          <SelectContent>
                            {allRoles?.filter(r => 
                              !user.roles?.some((ur: any) => ur.roleId === r.id)
                            ).map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.displayName || role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (selectedRoleForUser[user.id]) {
                              assignRoleMutation.mutate({ userId: user.id, roleId: selectedRoleForUser[user.id] });
                              setSelectedRoleForUser(prev => ({ ...prev, [user.id]: "" }));
                            }
                          }}
                          disabled={!selectedRoleForUser[user.id] || assignRoleMutation.isPending}
                          data-testid={`button-add-role-${user.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Role
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Add a new role to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name (slug)</Label>
              <Input 
                value={newRoleName} 
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., marketing_manager"
                data-testid="input-role-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input 
                value={newRoleDisplayName} 
                onChange={(e) => setNewRoleDisplayName(e.target.value)}
                placeholder="e.g., Marketing Manager"
                data-testid="input-role-display-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={newRoleDescription} 
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Brief description of this role"
                data-testid="input-role-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createRoleMutation.mutate({ 
                name: newRoleName, 
                displayName: newRoleDisplayName, 
                description: newRoleDescription 
              })}
              disabled={!newRoleName || !newRoleDisplayName || createRoleMutation.isPending}
              data-testid="button-save-role"
            >
              {createRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPermissionOpen} onOpenChange={setIsAddPermissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Permission</DialogTitle>
            <DialogDescription>Add a new permission to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Permission Name (slug)</Label>
              <Input 
                value={newPermissionName} 
                onChange={(e) => setNewPermissionName(e.target.value)}
                placeholder="e.g., edit_blog"
                data-testid="input-permission-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input 
                value={newPermissionDisplayName} 
                onChange={(e) => setNewPermissionDisplayName(e.target.value)}
                placeholder="e.g., Edit Blog Posts"
                data-testid="input-permission-display-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newPermissionCategory} onValueChange={setNewPermissionCategory}>
                <SelectTrigger data-testid="select-permission-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="properties">Properties</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="roles">Roles</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="enquiries">Enquiries</SelectItem>
                  <SelectItem value="locations">Locations</SelectItem>
                  <SelectItem value="boosts">Boosts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={newPermissionDescription} 
                onChange={(e) => setNewPermissionDescription(e.target.value)}
                placeholder="Brief description of this permission"
                data-testid="input-permission-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPermissionOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createPermissionMutation.mutate({ 
                name: newPermissionName, 
                displayName: newPermissionDisplayName, 
                description: newPermissionDescription,
                category: newPermissionCategory
              })}
              disabled={!newPermissionName || !newPermissionDisplayName || createPermissionMutation.isPending}
              data-testid="button-save-permission"
            >
              {createPermissionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Permission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Newsletter management
  const { data: newsletterSubscribers = [], isLoading: newsletterLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/newsletter"],
    enabled: activeSection === "newsletter",
  });

  const { data: newsletterStats } = useQuery<{ total: number; active: number; inactive: number }>({
    queryKey: ["/api/admin/newsletter/stats"],
    enabled: activeSection === "newsletter",
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/newsletter/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/stats"] });
      toast({ title: "Subscriber deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete subscriber", variant: "destructive" });
    },
  });

  const toggleSubscriberMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/admin/newsletter/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/stats"] });
      toast({ title: "Subscriber status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const renderNewsletter = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
          <p className="text-muted-foreground">Manage email subscribers for your newsletter</p>
        </div>
        <Button asChild variant="outline" data-testid="button-export-newsletter">
          <a href="/api/admin/newsletter/export" download>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newsletterStats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{newsletterStats?.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unsubscribed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{newsletterStats?.inactive || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
          <CardDescription>People who have subscribed to your newsletter</CardDescription>
        </CardHeader>
        <CardContent>
          {newsletterLoading ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : newsletterSubscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subscribers yet</p>
              <p className="text-sm">Subscribers will appear here when they sign up</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newsletterSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>{subscriber.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subscriber.source}</Badge>
                    </TableCell>
                    <TableCell>
                      {subscriber.subscribedAt ? new Date(subscriber.subscribedAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscriber.isActive ? "default" : "secondary"}>
                        {subscriber.isActive ? "Active" : "Unsubscribed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={subscriber.isActive}
                          onCheckedChange={() => toggleSubscriberMutation.mutate(subscriber.id)}
                          data-testid={`switch-subscriber-${subscriber.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSubscriberMutation.mutate(subscriber.id)}
                          data-testid={`button-delete-subscriber-${subscriber.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Platform configuration and feature flags</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Control platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flagsLoading ? (
            <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">Sell Property Feature</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable property sale listings in addition to rentals
                  </p>
                </div>
                <Switch
                  checked={sellPropertyFlag?.enabled || false}
                  onCheckedChange={(checked) => {
                    if (sellPropertyFlag) {
                      toggleFeatureFlagMutation.mutate({ id: sellPropertyFlag.id, enabled: checked });
                    }
                  }}
                  data-testid="switch-sell-property"
                />
              </div>
              {featureFlags.filter((f) => f.name !== "sell_property").map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold capitalize">{flag.name.replace(/_/g, " ")}</Label>
                    {flag.description && <p className="text-sm text-muted-foreground">{flag.description}</p>}
                  </div>
                  <Switch
                    checked={flag.enabled || false}
                    onCheckedChange={(checked) => toggleFeatureFlagMutation.mutate({ id: flag.id, enabled: checked })}
                  />
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Instamojo Payment Settings
          </CardTitle>
          <CardDescription>Configure payment gateway for listing boosts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Payment credentials must be configured as secure secrets:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">INSTAMOJO_API_KEY</code> - Your Instamojo API key</li>
              <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">INSTAMOJO_AUTH_TOKEN</code> - Your Instamojo auth token</li>
              <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">INSTAMOJO_ENDPOINT</code> - Use <code>https://test.instamojo.com</code> for testing or <code>https://www.instamojo.com</code> for production</li>
            </ul>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Go to the Secrets tab in your Replit project to add these values securely.
            </p>
          </div>
          <div className="flex items-center gap-2 p-4 border rounded-lg">
            <div className="flex-1">
              <p className="font-medium">Payment Gateway Status</p>
              <p className="text-sm text-muted-foreground">
                Boost payments are currently in demo mode. Configure secrets to enable live payments.
              </p>
            </div>
            <Badge variant="secondary">Demo Mode</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return renderDashboard();
      case "properties": return renderProperties();
      case "enquiries": return renderEnquiries();
      case "owners": return renderOwners();
      case "users": return renderUsers();
      case "roles": return renderRoles();
      case "categories": return renderCategories();
      case "boosts": return renderBoosts();
      case "payments": return renderPayments();
      case "gateway": return renderGateway();
      case "sms": return renderSmsProviders();
      case "newsletter": return renderNewsletter();
      case "employees": return renderEmployees();
      case "cities": return renderCities();
      case "blog": return renderBlog();
      case "pages": return renderPages();
      case "seo": return renderSeo();
      case "settings": return renderSettings();
      default: return renderDashboard();
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render admin content if not authorized
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className={`bg-background border-r flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"} flex-shrink-0`}>
        <div className="p-4 border-b flex items-center justify-between gap-2 bg-primary/5">
          {!sidebarCollapsed && <h2 className="font-bold text-lg text-primary">Leaseo Admin</h2>}
          <Button size="icon" variant="ghost" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hover:bg-primary/10">
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""} ${
                  isActive 
                    ? "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none" 
                    : "hover:bg-muted"
                }`}
                onClick={() => setActiveSection(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!sidebarCollapsed && <span className={isActive ? "font-medium" : ""}>{item.label}</span>}
              </Button>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full hover:bg-primary/10 hover:border-primary" onClick={() => window.location.href = "/"}>
            {!sidebarCollapsed && <span>Back to Site</span>}
            {sidebarCollapsed && <Home className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="p-6 max-w-7xl">{renderContent()}</div>
      </main>

      <Dialog open={isAddPropertyOpen || !!editingProperty} onOpenChange={(open) => {
        if (!open) {
          setIsAddPropertyOpen(false);
          setEditingProperty(null);
          propertyForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? "Edit Property" : "Add New Property"}</DialogTitle>
            <DialogDescription>{editingProperty ? "Update property details" : "Create a new property listing"}</DialogDescription>
          </DialogHeader>
          <Form {...propertyForm}>
            <form onSubmit={propertyForm.handleSubmit(handlePropertySubmit)} className="space-y-4">
              <FormField control={propertyForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="2 BHK Apartment in Andheri" data-testid="input-property-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={propertyForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Property description..." rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={propertyForm.control} name="propertyType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="shop">Shop</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={propertyForm.control} name="listingType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={propertyForm.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (INR)</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="25000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={propertyForm.control} name="squareFeet" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Feet</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="1000" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={propertyForm.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} placeholder="Full address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={propertyForm.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} placeholder="Mumbai" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={propertyForm.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl><Input {...field} placeholder="Maharashtra" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={propertyForm.control} name="bedrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={propertyForm.control} name="bathrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="2" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={propertyForm.control} name="isFeatured" render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Featured Property</FormLabel>
                </FormItem>
              )} />

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <Label className="font-semibold">Property Images</Label>
                  </div>
                  {editingProperty && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e.target.files)}
                        className="max-w-[200px] text-sm"
                        disabled={uploadingImages}
                        data-testid="input-upload-images"
                      />
                      {uploadingImages && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  )}
                </div>
                
                {!editingProperty ? (
                  <div className="bg-muted/50 border rounded-lg p-4 text-center">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Save the property first, then you can add images by editing it.
                    </p>
                  </div>
                ) : imagesLoading ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
                  </div>
                ) : propertyImages.length === 0 ? (
                  <div className="bg-muted/50 border border-dashed rounded-lg p-6 text-center">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">No images uploaded yet.</p>
                    <p className="text-xs text-muted-foreground">Use the file picker above to add images</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {propertyImages.map((image) => (
                      <div key={image.id} className="relative group border rounded-md overflow-hidden" data-testid={`image-${image.id}`}>
                        <img 
                          src={image.url} 
                          alt={image.caption || "Property image"} 
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute top-1 left-1">
                          <Badge variant={image.isApproved ? "default" : "secondary"} className="text-xs">
                            {image.isApproved ? "Approved" : "Pending"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!image.isApproved && (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={() => approveImageMutation.mutate({ id: image.id, isApproved: true })}
                              data-testid={`button-approve-image-${image.id}`}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          {image.isApproved && (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6"
                              onClick={() => approveImageMutation.mutate({ id: image.id, isApproved: false })}
                              data-testid={`button-reject-image-${image.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-6 w-6"
                            onClick={() => deleteImageMutation.mutate(image.id)}
                            data-testid={`button-delete-image-${image.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddPropertyOpen(false);
                  setEditingProperty(null);
                  propertyForm.reset();
                }}>Cancel</Button>
                <Button type="submit" disabled={createPropertyMutation.isPending || updatePropertyMutation.isPending}>
                  {(createPropertyMutation.isPending || updatePropertyMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingProperty ? "Update Property" : "Add Property"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCityOpen} onOpenChange={setIsAddCityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add City</DialogTitle>
          </DialogHeader>
          <Form {...cityForm}>
            <form onSubmit={cityForm.handleSubmit((data) => createCityMutation.mutate(data))} className="space-y-4">
              <FormField control={cityForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>City Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Mumbai" data-testid="input-city-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={cityForm.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl><Input {...field} placeholder="Maharashtra" data-testid="input-city-state" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddCityOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createCityMutation.isPending}>
                  {createCityMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add City
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddLocalityOpen} onOpenChange={setIsAddLocalityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Locality</DialogTitle>
          </DialogHeader>
          <Form {...localityForm}>
            <form onSubmit={localityForm.handleSubmit((data) => createLocalityMutation.mutate(data))} className="space-y-4">
              <FormField control={localityForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Locality Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Andheri West" data-testid="input-locality-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={localityForm.control} name="cityId" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-locality-city"><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={localityForm.control} name="pincode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode (Optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="400053" data-testid="input-locality-pincode" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddLocalityOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createLocalityMutation.isPending}>
                  {createLocalityMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Locality
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBlogOpen || !!editingBlog} onOpenChange={(open) => {
        if (!open) {
          setIsAddBlogOpen(false);
          setEditingBlog(null);
          blogForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? "Edit Blog Post" : "Create Blog Post"}</DialogTitle>
            <DialogDescription>{editingBlog ? "Update blog post details" : "Create a new blog post"}</DialogDescription>
          </DialogHeader>
          <Form {...blogForm}>
            <form onSubmit={blogForm.handleSubmit(handleBlogSubmit)} className="space-y-4">
              <FormField control={blogForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Blog post title" data-testid="input-blog-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl><Input {...field} placeholder="blog-post-url-slug" data-testid="input-blog-slug" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="excerpt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Short description..." rows={2} data-testid="input-blog-excerpt" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Full blog content..." rows={8} data-testid="input-blog-content" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-blog-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Separator className="my-4" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SEO Settings
                </h4>
                <p className="text-xs text-muted-foreground">Optimize this blog post for search engines</p>
              </div>
              
              <FormField control={blogForm.control} name="metaTitle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Blog title for search results" 
                      data-testid="input-blog-meta-title" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="metaDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Brief description for search results (150-160 characters)" 
                      rows={3}
                      data-testid="input-blog-meta-description" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="metaKeywords" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Keywords</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="property, rental, apartment, pune (comma separated)" 
                      data-testid="input-blog-meta-keywords" 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Enter keywords separated by commas for SEO</p>
                  <FormMessage />
                </FormItem>
              )} />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddBlogOpen(false);
                  setEditingBlog(null);
                  blogForm.reset();
                }}>Cancel</Button>
                <Button type="submit" disabled={createBlogMutation.isPending || updateBlogMutation.isPending}>
                  {(createBlogMutation.isPending || updateBlogMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingBlog ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Add a team member with admin access</DialogDescription>
          </DialogHeader>
          <Form {...employeeForm}>
            <form onSubmit={employeeForm.handleSubmit((data) => createEmployeeMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={employeeForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} placeholder="John" data-testid="input-employee-firstname" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={employeeForm.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Doe" data-testid="input-employee-lastname" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={employeeForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="john@example.com" data-testid="input-employee-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={employeeForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-employee-role"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createEmployeeMutation.isPending}>
                  {createEmployeeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Employee
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEnquiry} onOpenChange={(open) => {
        if (!open) {
          setViewingEnquiry(null);
          setReplyMessage("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enquiry Details</DialogTitle>
            <DialogDescription>View and respond to this enquiry</DialogDescription>
          </DialogHeader>
          {viewingEnquiry && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{viewingEnquiry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingEnquiry.email}</span>
                </div>
                {viewingEnquiry.phone && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{viewingEnquiry.phone}</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Message:</p>
                <p className="text-sm">{viewingEnquiry.message}</p>
              </div>
              <div className="space-y-2">
                <Label>Reply Message</Label>
                <Textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  data-testid="input-enquiry-reply"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingEnquiry(null)}>Close</Button>
                <Button onClick={handleReply} disabled={!replyMessage}>
                  <Reply className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPage} onOpenChange={(open) => {
        if (!open) {
          setEditingPage(null);
          pageForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Page: {editingPage?.pageKey}</DialogTitle>
            <DialogDescription>Update page content</DialogDescription>
          </DialogHeader>
          <Form {...pageForm}>
            <form onSubmit={pageForm.handleSubmit(handlePageSubmit)} className="space-y-4">
              <FormField control={pageForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Page title" data-testid="input-page-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={pageForm.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (JSON or Text)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Page content..." 
                      rows={12} 
                      className="font-mono text-sm"
                      data-testid="input-page-content" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Separator className="my-4" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  SEO Settings
                </h4>
                <p className="text-xs text-muted-foreground">Optimize this page for search engines</p>
              </div>
              
              <FormField control={pageForm.control} name="metaTitle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Page title for search results" 
                      data-testid="input-page-meta-title" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={pageForm.control} name="metaDescription" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Brief description for search results (150-160 characters)" 
                      rows={3}
                      data-testid="input-page-meta-description" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={pageForm.control} name="metaKeywords" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Keywords</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="rental, property, pune, apartments (comma separated)" 
                      data-testid="input-page-meta-keywords" 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Enter keywords separated by commas for SEO</p>
                  <FormMessage />
                </FormItem>
              )} />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setEditingPage(null);
                  pageForm.reset();
                }}>Cancel</Button>
                <Button type="submit" disabled={updatePageMutation.isPending}>
                  {updatePageMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Page
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCategoryOpen || !!editingCategory} onOpenChange={(open) => {
        if (!open) {
          setIsAddCategoryOpen(false);
          setEditingCategory(null);
          categoryForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>{editingCategory ? "Update category details" : "Create a new property category"}</DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
              <FormField control={categoryForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., Apartments" data-testid="input-category-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={categoryForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Category description..." rows={2} data-testid="input-category-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={categoryForm.control} name="segment" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "rent"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-segment">
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rent">Rent</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="parentId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? "" : val)} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-parent">
                          <SelectValue placeholder="None (Main Category)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Main Category)</SelectItem>
                        {categories.filter(c => !c.parentId).map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={categoryForm.control} name="icon" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Name (Optional)</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., building" data-testid="input-category-icon" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="displayOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl><Input {...field} type="number" placeholder="0" data-testid="input-category-order" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={categoryForm.control} name="supportsRent" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Supports Rent</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-category-supports-rent" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="supportsSale" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Supports Sale</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-category-supports-sale" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="isCommercial" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Commercial</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-category-is-commercial" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddCategoryOpen(false);
                  setEditingCategory(null);
                  categoryForm.reset();
                }}>Cancel</Button>
                <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingCategory ? "Update Category" : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
