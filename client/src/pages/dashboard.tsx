import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
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
  LogOut,
  User,
  Bell
} from "lucide-react";
import type { UserRoleType } from "@shared/schema";

const AVAILABLE_ROLES: { id: UserRoleType; label: string; icon: typeof Home }[] = [
  { id: "residential_tenant", label: "Residential Tenant", icon: Home },
  { id: "commercial_tenant", label: "Commercial Tenant", icon: Building2 },
  { id: "residential_owner", label: "Residential Owner", icon: Home },
  { id: "commercial_owner", label: "Commercial Owner", icon: Building2 },
];

// Mock user data - will be replaced with actual auth context
const mockUser = {
  id: "1",
  firstName: "Rahul",
  lastName: "Sharma",
  phone: "+91 98765 43210",
  email: "rahul@example.com",
  activeRole: "residential_tenant" as UserRoleType,
  availableRoles: ["residential_tenant", "residential_owner"] as UserRoleType[],
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [activeRole, setActiveRole] = useState<UserRoleType>(mockUser.activeRole);

  const currentRole = AVAILABLE_ROLES.find(r => r.id === activeRole);
  const userRoles = AVAILABLE_ROLES.filter(r => mockUser.availableRoles.includes(r.id));

  const handleRoleSwitch = (roleId: UserRoleType) => {
    setActiveRole(roleId);
    toast({
      title: "Role Switched",
      description: `You're now viewing as ${AVAILABLE_ROLES.find(r => r.id === roleId)?.label}`,
    });
  };

  const isOwnerRole = activeRole.includes("owner");
  const isTenantRole = activeRole.includes("tenant");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-muted/30">
        {/* Dashboard Header */}
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

              {/* Role Switcher */}
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-muted-foreground">
                      <Plus className="w-4 h-4" />
                      Add another role
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {isTenantRole && (
                      <>
                        <Link href="/properties">
                          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-browse-properties">
                            <Home className="w-5 h-5" />
                            <span className="text-sm">Browse</span>
                          </Button>
                        </Link>
                        <Link href="/shortlists">
                          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-shortlists">
                            <Heart className="w-5 h-5" />
                            <span className="text-sm">Shortlists</span>
                          </Button>
                        </Link>
                        <Link href="/enquiries">
                          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-enquiries">
                            <MessageSquare className="w-5 h-5" />
                            <span className="text-sm">Enquiries</span>
                          </Button>
                        </Link>
                      </>
                    )}
                    {isOwnerRole && (
                      <>
                        <Link href="/properties/new">
                          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-add-listing">
                            <Plus className="w-5 h-5" />
                            <span className="text-sm">Add Listing</span>
                          </Button>
                        </Link>
                        <Link href="/my-properties">
                          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-my-listings">
                            <Building2 className="w-5 h-5" />
                            <span className="text-sm">My Listings</span>
                          </Button>
                        </Link>
                        <Link href="/enquiries">
                          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-owner-enquiries">
                            <MessageSquare className="w-5 h-5" />
                            <span className="text-sm">Enquiries</span>
                          </Button>
                        </Link>
                      </>
                    )}
                    <Link href="/settings">
                      <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2" data-testid="button-settings">
                        <Settings className="w-5 h-5" />
                        <span className="text-sm">Settings</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    {isTenantRole ? "Your recent property searches and enquiries" : "Activity on your listings"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity yet</p>
                    <p className="text-sm mt-1">
                      {isTenantRole 
                        ? "Start browsing properties to see your activity here" 
                        : "Add a listing to start receiving enquiries"}
                    </p>
                    <Link href={isTenantRole ? "/properties" : "/properties/new"}>
                      <Button className="mt-4" data-testid="button-activity-cta">
                        {isTenantRole ? "Browse Properties" : "Add Your First Listing"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span>{mockUser.firstName} {mockUser.lastName}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phone</span>
                      <span>{mockUser.phone}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span>{mockUser.email || "Not set"}</span>
                    </div>
                  </div>
                  <Link href="/settings/profile">
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-edit-profile">
                      <User className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Your Roles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Roles</CardTitle>
                  <CardDescription>Manage how you use Direct Rentals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userRoles.map((role) => (
                    <div 
                      key={role.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        activeRole === role.id ? "border-primary bg-primary/5" : ""
                      }`}
                      data-testid={`role-card-${role.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <role.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium" data-testid={`text-role-label-${role.id}`}>{role.label}</span>
                      </div>
                      {activeRole === role.id && (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-active-role-${role.id}`}>Active</Badge>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" data-testid="button-add-role">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </CardContent>
              </Card>

              {/* Help */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Need Help?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Our support team is here for you
                    </p>
                    <Link href="/contact">
                      <Button variant="outline" size="sm" className="mt-3" data-testid="button-contact-support">
                        Contact Support
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
