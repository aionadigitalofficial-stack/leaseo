import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Menu, Heart, User, Plus, ChevronDown, Building2, Home, Warehouse, Hotel, Store, Factory, MapPin, Briefcase, LogOut, Settings, LayoutDashboard, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { FeatureFlag } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import leaseoLogo from "@assets/lessso_1767868424345-DMafamKW_1768207660992.png";

const rentCategories = [
  { href: "/properties?segment=rent&propertyType=apartment", label: "Apartment", icon: Building2 },
  { href: "/properties?segment=rent&propertyType=house", label: "House", icon: Home },
  { href: "/properties?segment=rent&propertyType=villa", label: "Villa", icon: Hotel },
  { href: "/properties?segment=rent&propertyType=pg", label: "PG/Hostel", icon: Store },
  { href: "/properties?segment=rent&propertyType=studio", label: "Studio", icon: Building2 },
  { href: "/properties?segment=rent&propertyType=penthouse", label: "Penthouse", icon: Building2 },
];

const buyCategories = [
  { href: "/properties?segment=buy&propertyType=apartment", label: "Apartment", icon: Building2 },
  { href: "/properties?segment=buy&propertyType=house", label: "House", icon: Home },
  { href: "/properties?segment=buy&propertyType=villa", label: "Villa", icon: Hotel },
  { href: "/properties?segment=buy&propertyType=plot", label: "Plot/Land", icon: MapPin },
  { href: "/properties?segment=buy&propertyType=studio", label: "Studio", icon: Building2 },
  { href: "/properties?segment=buy&propertyType=penthouse", label: "Penthouse", icon: Building2 },
];

const commercialCategories = [
  { href: "/properties?segment=commercial&propertyType=office", label: "Office Space", icon: Briefcase },
  { href: "/properties?segment=commercial&propertyType=shop", label: "Shop/Showroom", icon: Store },
  { href: "/properties?segment=commercial&propertyType=warehouse", label: "Warehouse", icon: Warehouse },
  { href: "/properties?segment=commercial&propertyType=coworking", label: "Co-working", icon: Building2 },
  { href: "/properties?segment=commercial&propertyType=industrial", label: "Industrial", icon: Factory },
  { href: "/properties?segment=commercial&propertyType=land", label: "Commercial Land", icon: MapPin },
];

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const { data: featureFlags = [] } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/feature-flags"],
  });

  const showBuyTab = featureFlags.some(
    (flag) => flag.name === "sell_property" && flag.enabled
  );

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b" style={{ backgroundColor: '#0b2743' }}>
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <img 
            src={leaseoLogo} 
            alt="Leaseo" 
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Link href="/">
            <Button
              variant="ghost"
              className={`text-sm text-white hover:text-white hover:bg-white/10 ${location === "/" ? "bg-[#ff9a00] hover:bg-[#ff9a00]/90" : ""}`}
              data-testid="nav-home"
            >
              Home
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-sm gap-1 text-white hover:text-white hover:bg-white/10" data-testid="nav-rent">
                Rent <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/properties?segment=rent" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  All Rentals
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {rentCategories.map((cat) => (
                <DropdownMenuItem key={cat.href} asChild>
                  <Link href={cat.href} className="flex items-center gap-2 cursor-pointer">
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {showBuyTab && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm gap-1 text-white hover:text-white hover:bg-white/10" data-testid="nav-buy">
                  Buy <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/properties?segment=buy" className="flex items-center gap-2 cursor-pointer">
                    <Home className="h-4 w-4" />
                    All Properties for Sale
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {buyCategories.map((cat) => (
                  <DropdownMenuItem key={cat.href} asChild>
                    <Link href={cat.href} className="flex items-center gap-2 cursor-pointer">
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-sm gap-1 text-white hover:text-white hover:bg-white/10" data-testid="nav-commercial">
                Commercial <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/properties?segment=commercial" className="flex items-center gap-2 cursor-pointer">
                  <Briefcase className="h-4 w-4" />
                  All Commercial
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {commercialCategories.map((cat) => (
                <DropdownMenuItem key={cat.href} asChild>
                  <Link href={cat.href} className="flex items-center gap-2 cursor-pointer">
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/about">
            <Button
              variant="ghost"
              className={`text-sm text-white hover:text-white hover:bg-white/10 ${location === "/about" ? "bg-[#ff9a00] hover:bg-[#ff9a00]/90" : ""}`}
              data-testid="nav-about"
            >
              About
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="ghost"
              className={`text-sm text-white hover:text-white hover:bg-white/10 ${location === "/contact" ? "bg-[#ff9a00] hover:bg-[#ff9a00]/90" : ""}`}
              data-testid="nav-contact"
            >
              Contact
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/post-property">
            <Button 
              size="sm" 
              className="gap-2 bg-[#ff9a00] hover:bg-[#ff9a00]/90 text-white"
              data-testid="button-post-property"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Post Property</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="hidden sm:flex text-white hover:text-white hover:bg-white/10" data-testid="button-favorites">
            <Heart className="h-5 w-5" />
          </Button>
          <ThemeToggle className="text-white hover:text-white hover:bg-white/10" />
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="hidden sm:flex gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white" data-testid="button-user-menu">
                  <User className="h-4 w-4" />
                  {user?.firstName || user?.email?.split("@")[0] || "Account"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/reset-password" className="flex items-center gap-2 cursor-pointer">
                    <KeyRound className="h-4 w-4" />
                    Reset Password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline" className="hidden sm:flex gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white" data-testid="button-login">
                <User className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/10" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px] overflow-y-auto">
              <div className="flex flex-col gap-2 mt-8">
                <SheetClose asChild>
                  <Link href="/">
                    <Button
                      variant={location === "/" ? "secondary" : "ghost"}
                      className="w-full justify-start text-lg"
                      data-testid="mobile-nav-home"
                    >
                      <Home className="h-5 w-5 mr-2" />
                      Home
                    </Button>
                  </Link>
                </SheetClose>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground px-4 pt-4">Rent</p>
                  <SheetClose asChild>
                    <Link href="/properties?segment=rent">
                      <Button variant="ghost" className="w-full justify-start" data-testid="mobile-nav-all-rent">
                        <Building2 className="h-4 w-4 mr-2" />
                        All Rentals
                      </Button>
                    </Link>
                  </SheetClose>
                  {rentCategories.map((cat) => (
                    <SheetClose asChild key={cat.href}>
                      <Link href={cat.href}>
                        <Button variant="ghost" className="w-full justify-start pl-8 text-sm" data-testid={`mobile-nav-rent-${cat.label.toLowerCase()}`}>
                          <cat.icon className="h-4 w-4 mr-2" />
                          {cat.label}
                        </Button>
                      </Link>
                    </SheetClose>
                  ))}
                </div>

                {showBuyTab && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground px-4 pt-4">Buy</p>
                    <SheetClose asChild>
                      <Link href="/properties?segment=buy">
                        <Button variant="ghost" className="w-full justify-start" data-testid="mobile-nav-all-buy">
                          <Home className="h-4 w-4 mr-2" />
                          All for Sale
                        </Button>
                      </Link>
                    </SheetClose>
                    {buyCategories.map((cat) => (
                      <SheetClose asChild key={cat.href}>
                        <Link href={cat.href}>
                          <Button variant="ghost" className="w-full justify-start pl-8 text-sm" data-testid={`mobile-nav-buy-${cat.label.toLowerCase()}`}>
                            <cat.icon className="h-4 w-4 mr-2" />
                            {cat.label}
                          </Button>
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground px-4 pt-4">Commercial</p>
                  <SheetClose asChild>
                    <Link href="/properties?segment=commercial">
                      <Button variant="ghost" className="w-full justify-start" data-testid="mobile-nav-all-commercial">
                        <Briefcase className="h-4 w-4 mr-2" />
                        All Commercial
                      </Button>
                    </Link>
                  </SheetClose>
                  {commercialCategories.map((cat) => (
                    <SheetClose asChild key={cat.href}>
                      <Link href={cat.href}>
                        <Button variant="ghost" className="w-full justify-start pl-8 text-sm" data-testid={`mobile-nav-commercial-${cat.label.toLowerCase()}`}>
                          <cat.icon className="h-4 w-4 mr-2" />
                          {cat.label}
                        </Button>
                      </Link>
                    </SheetClose>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4 space-y-2">
                  <SheetClose asChild>
                    <Link href="/about">
                      <Button variant="ghost" className="w-full justify-start" data-testid="mobile-nav-about">
                        About
                      </Button>
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/contact">
                      <Button variant="ghost" className="w-full justify-start" data-testid="mobile-nav-contact">
                        Contact
                      </Button>
                    </Link>
                  </SheetClose>
                </div>

                <div className="border-t pt-4 mt-4 space-y-2">
                  <SheetClose asChild>
                    <Link href="/post-property">
                      <Button 
                        className="w-full gap-2"
                        data-testid="mobile-button-post-property"
                      >
                        <Plus className="h-4 w-4" />
                        Post Property
                      </Button>
                    </Link>
                  </SheetClose>
                  
                  {isAuthenticated ? (
                    <>
                      <SheetClose asChild>
                        <Link href="/dashboard">
                          <Button 
                            variant="outline" 
                            className="w-full gap-2"
                            data-testid="mobile-button-dashboard"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </Button>
                        </Link>
                      </SheetClose>
                      {isAdmin && (
                        <SheetClose asChild>
                          <Link href="/admin">
                            <Button 
                              variant="outline" 
                              className="w-full gap-2"
                              data-testid="mobile-button-admin"
                            >
                              <Settings className="h-4 w-4" />
                              Admin Panel
                            </Button>
                          </Link>
                        </SheetClose>
                      )}
                      <SheetClose asChild>
                        <Link href="/reset-password">
                          <Button 
                            variant="ghost" 
                            className="w-full gap-2"
                            data-testid="mobile-button-reset-password"
                          >
                            <KeyRound className="h-4 w-4" />
                            Reset Password
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full gap-2 text-destructive hover:text-destructive"
                          onClick={handleLogout}
                          data-testid="mobile-button-logout"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </SheetClose>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Link href="/login">
                        <Button 
                          variant="outline" 
                          className="w-full gap-2"
                          data-testid="mobile-button-login"
                        >
                          <User className="h-4 w-4" />
                          Login
                        </Button>
                      </Link>
                    </SheetClose>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
