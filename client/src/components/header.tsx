import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Menu, Heart, User, Plus, ChevronDown, Building2, Home, Warehouse, Hotel, Store, Factory, MapPin, Briefcase } from "lucide-react";
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
import leaseoLogo from "@assets/lessso_1767868424345.png";

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
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const { data: featureFlags = [] } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/feature-flags"],
  });

  const showBuyTab = featureFlags.some(
    (flag) => flag.name === "sell_property" && flag.enabled
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              variant={location === "/" ? "secondary" : "ghost"}
              className="text-sm"
              data-testid="nav-home"
            >
              Home
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-sm gap-1" data-testid="nav-rent">
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
                <Button variant="ghost" className="text-sm gap-1" data-testid="nav-buy">
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
              <Button variant="ghost" className="text-sm gap-1" data-testid="nav-commercial">
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
              variant={location === "/about" ? "secondary" : "ghost"}
              className="text-sm"
              data-testid="nav-about"
            >
              About
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant={location === "/contact" ? "secondary" : "ghost"}
              className="text-sm"
              data-testid="nav-contact"
            >
              Contact
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/post-property">
            <Button 
              variant="default" 
              size="sm" 
              className="gap-2"
              data-testid="button-post-property"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Post Property</span>
              <span className="sm:hidden">Post</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="hidden sm:flex" data-testid="button-favorites">
            <Heart className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" variant="outline" className="hidden sm:flex gap-2" data-testid="button-login">
              <User className="h-4 w-4" />
              Login
            </Button>
          </Link>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
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
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
