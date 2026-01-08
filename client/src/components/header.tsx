import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Menu, Heart, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Browse Rentals" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
            <Home className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden font-semibold text-xl sm:inline-block">
            Direct Rentals
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={location === link.href ? "secondary" : "ghost"}
                className="text-sm"
                data-testid={`nav-${link.label.toLowerCase().replace(" ", "-")}`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2 bg-green-600 hover:bg-green-700"
            data-testid="button-post-property"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Post Property</span>
            <span className="sm:hidden">Post</span>
          </Button>
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
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link href={link.href}>
                      <Button
                        variant={location === link.href ? "secondary" : "ghost"}
                        className="w-full justify-start text-lg"
                        data-testid={`mobile-nav-${link.label.toLowerCase().replace(" ", "-")}`}
                      >
                        {link.label}
                      </Button>
                    </Link>
                  </SheetClose>
                ))}
                <div className="border-t pt-4 mt-4 space-y-2">
                  <SheetClose asChild>
                    <Button 
                      className="w-full gap-2 bg-green-600 hover:bg-green-700"
                      data-testid="mobile-button-post-property"
                    >
                      <Plus className="h-4 w-4" />
                      Post Property
                    </Button>
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
