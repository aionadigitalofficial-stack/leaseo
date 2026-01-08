import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  TrendingUp,
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
  Menu,
} from "lucide-react";
import type { Property, Enquiry, FeatureFlag, City, Locality, BlogPost } from "@shared/schema";

type AdminSection = "dashboard" | "properties" | "enquiries" | "employees" | "cities" | "blog" | "seo" | "settings";

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
});

const employeeFormSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  role: z.string().min(1, "Role is required"),
});

const sidebarItems: { id: AdminSection; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "enquiries", label: "Enquiries", icon: MessageSquare },
  { id: "employees", label: "Employees", icon: Users },
  { id: "cities", label: "Cities & Localities", icon: MapPin },
  { id: "blog", label: "Blog", icon: PenTool },
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

  const blogForm = useForm({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { title: "", slug: "", excerpt: "", content: "", status: "draft" as const },
  });

  const employeeForm = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "admin" },
  });

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

  const renderProperties = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage property listings</p>
        </div>
        <Button onClick={() => setIsAddPropertyOpen(true)} data-testid="button-add-property">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {propertiesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No properties yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id} data-testid={`row-property-${property.id}`}>
                    <TableCell className="font-medium max-w-[200px] truncate">{property.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {property.isCommercial ? "Commercial" : "Residential"}
                      </Badge>
                    </TableCell>
                    <TableCell>{property.city}</TableCell>
                    <TableCell>₹{Number(property.rent || property.price).toLocaleString()}/mo</TableCell>
                    <TableCell>
                      <Badge variant={property.status === "active" ? "default" : "secondary"}>{property.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePropertyMutation.mutate(property.id)}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell className="font-medium">{enquiry.name}</TableCell>
                    <TableCell>{enquiry.email}</TableCell>
                    <TableCell>{enquiry.phone || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{enquiry.message}</TableCell>
                    <TableCell>
                      <Badge variant={enquiry.status === "new" ? "default" : "secondary"}>{enquiry.status}</Badge>
                    </TableCell>
                    <TableCell>{enquiry.createdAt ? new Date(enquiry.createdAt).toLocaleDateString() : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage internal team access</p>
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
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell><Badge variant="outline">{employee.role}</Badge></TableCell>
                    <TableCell><Badge variant="default">Active</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => deleteEmployeeMutation.mutate(employee.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{post.title}</TableCell>
                    <TableCell><Badge variant="outline">{post.slug}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                    </TableCell>
                    <TableCell>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteBlogMutation.mutate(post.id)}>
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
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return renderDashboard();
      case "properties": return renderProperties();
      case "enquiries": return renderEnquiries();
      case "employees": return renderEmployees();
      case "cities": return renderCities();
      case "blog": return renderBlog();
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

      <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>Create a new property listing</DialogDescription>
          </DialogHeader>
          <Form {...propertyForm}>
            <form onSubmit={propertyForm.handleSubmit((data) => createPropertyMutation.mutate(data))} className="space-y-4">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddPropertyOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createPropertyMutation.isPending}>
                  {createPropertyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Property
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
                <Button type="submit" disabled={createCityMutation.isPending}>Add City</Button>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger></FormControl>
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
                <Button type="submit" disabled={createLocalityMutation.isPending}>Add Locality</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBlogOpen} onOpenChange={setIsAddBlogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Blog Post</DialogTitle>
          </DialogHeader>
          <Form {...blogForm}>
            <form onSubmit={blogForm.handleSubmit((data) => createBlogMutation.mutate(data))} className="space-y-4">
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
                  <FormControl><Input {...field} placeholder="blog-post-slug" data-testid="input-blog-slug" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="excerpt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Short summary" rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Full blog content..." rows={8} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={blogForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddBlogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createBlogMutation.isPending}>
                  {createBlogMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Post
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
            <DialogDescription>Give team members access to the admin panel</DialogDescription>
          </DialogHeader>
          <Form {...employeeForm}>
            <form onSubmit={employeeForm.handleSubmit((data) => createEmployeeMutation.mutate(data))} className="space-y-4">
              <FormField control={employeeForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} type="email" placeholder="employee@company.com" data-testid="input-employee-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={employeeForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} placeholder="John" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={employeeForm.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Doe" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={employeeForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
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
    </div>
  );
}
