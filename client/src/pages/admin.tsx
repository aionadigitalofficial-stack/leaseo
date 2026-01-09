import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Phone, Calendar, Key as KeyIcon, Filter as FilterIcon } from "lucide-react";
import type { Property, Enquiry, FeatureFlag, City, Locality, BlogPost, PageContent, PropertyCategory, PropertyImage } from "@shared/schema";

type AdminSection = "dashboard" | "properties" | "enquiries" | "employees" | "cities" | "categories" | "boosts" | "payments" | "blog" | "pages" | "seo" | "settings";

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

const sidebarItems: { id: AdminSection; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "enquiries", label: "Enquiries", icon: MessageSquare },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "boosts", label: "Listing Boosts", icon: TrendingUp },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "cities", label: "Cities & Localities", icon: MapPin },
  { id: "blog", label: "Blog", icon: PenTool },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "seo", label: "SEO Settings", icon: Search },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminPage() {
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

  const blogForm = useForm<{ title: string; slug: string; excerpt: string; content: string; status: "draft" | "published"; metaTitle?: string; metaDescription?: string }>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { title: "", slug: "", excerpt: "", content: "", status: "draft", metaTitle: "", metaDescription: "" },
  });

  const employeeForm = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "admin" },
  });

  const pageForm = useForm({
    resolver: zodResolver(pageFormSchema),
    defaultValues: { title: "", content: "", metaTitle: "", metaDescription: "" },
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
      });
    }
  }, [editingPage, pageForm]);

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
    mutationFn: async ({ key, data }: { key: string; data: { title: string; content: any } }) =>
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

  const [robotsTxt, setRobotsTxt] = useState(seoSettings?.robotsTxt || `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://leaseo.in/sitemap.xml`);
  const [metaTitle, setMetaTitle] = useState(seoSettings?.metaTitle || "Leaseo - Zero Brokerage Property Rentals in India");
  const [metaDescription, setMetaDescription] = useState(seoSettings?.metaDescription || "Find rental properties directly from owners. Zero brokerage, verified listings across Mumbai, Pune, Delhi, Bangalore and more.");

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

  const handleBlogSubmit = (data: { title: string; slug: string; excerpt: string; content: string; status: "draft" | "published"; metaTitle?: string; metaDescription?: string }) => {
    const blogData = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      status: data.status,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
    };
    if (editingBlog) {
      updateBlogMutation.mutate({ id: editingBlog.id, data: blogData });
    } else {
      createBlogMutation.mutate(blogData);
    }
  };

  const handlePageSubmit = (data: { title: string; content: string; metaTitle?: string; metaDescription?: string }) => {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">{stats.activeListings} active listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Enquiries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnquiries}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingEnquiries} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Cities</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cities.length}</div>
            <p className="text-xs text-muted-foreground">{localities.length} localities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
            <PenTool className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blogPosts.length}</div>
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
    
    // Locality filter
    if (propertyFilterLocality && property.locality !== propertyFilterLocality) return false;
    
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

  const renderPropertyTable = (propertiesToShow: Property[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Owner Contact</TableHead>
          <TableHead>Upload Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {propertiesToShow.map((property) => (
          <TableRow key={property.id} data-testid={`row-property-${property.id}`}>
            <TableCell className="font-medium max-w-[180px] truncate">{property.title}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize text-xs">
                {property.isCommercial ? "Commercial" : property.listingType === "sale" ? "Buy" : "Rent"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">{property.city}</TableCell>
            <TableCell className="text-sm">₹{Number(property.rent || property.price).toLocaleString()}{property.listingType === "rent" ? "/mo" : ""}</TableCell>
            <TableCell>
              <div className="text-xs space-y-1">
                {(property as any).ownerEmail && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{(property as any).ownerEmail}</span>
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
                <Select value={propertyFilterCity} onValueChange={setPropertyFilterCity}>
                  <SelectTrigger data-testid="select-property-city">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Cities</SelectItem>
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
                  <Select value={propertyFilterLocality} onValueChange={setPropertyFilterLocality}>
                    <SelectTrigger data-testid="select-property-locality">
                      <SelectValue placeholder="All Localities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Localities</SelectItem>
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
        <Tabs value={propertySegment} onValueChange={(v) => setPropertySegment(v as any)} className="w-full">
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
                ) : renderPropertyTable(filteredProperties)}
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
                ) : renderPropertyTable(rentProperties)}
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
                ) : renderPropertyTable(buyProperties)}
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
                ) : renderPropertyTable(commercialProperties)}
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
            onClick={() => saveSeoMutation.mutate({ robotsTxt, metaTitle, metaDescription })}
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
      case "categories": return renderCategories();
      case "boosts": return renderBoosts();
      case "payments": return renderPayments();
      case "employees": return renderEmployees();
      case "cities": return renderCities();
      case "blog": return renderBlog();
      case "pages": return renderPages();
      case "seo": return renderSeo();
      case "settings": return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className={`bg-sidebar border-r flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className="p-4 border-b flex items-center justify-between gap-2">
          {!sidebarCollapsed && <h2 className="font-bold text-lg">Leaseo Admin</h2>}
          <Button size="icon" variant="ghost" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${sidebarCollapsed ? "px-3" : ""}`}
                onClick={() => setActiveSection(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
            {!sidebarCollapsed && <span>Back to Site</span>}
            {sidebarCollapsed && <Home className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6">{renderContent()}</div>
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

              {editingProperty && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <Label className="font-semibold">Property Images</Label>
                  </div>
                  {imagesLoading ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
                    </div>
                  ) : propertyImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
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
              )}

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
