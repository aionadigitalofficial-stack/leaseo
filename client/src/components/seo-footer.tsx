import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Mail, MapPin, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
  "Chandigarh", "Noida", "Gurgaon", "Thane", "Navi Mumbai",
];

const PROPERTY_TYPES = [
  { label: "1 BHK for Rent", href: "/rent/mumbai?bhk=1+BHK" },
  { label: "2 BHK for Rent", href: "/rent/mumbai?bhk=2+BHK" },
  { label: "3 BHK for Rent", href: "/rent/mumbai?bhk=3+BHK" },
  { label: "PG/Hostel", href: "/rent/mumbai?subtype=pg-hostel" },
  { label: "Commercial Space", href: "/rent/mumbai?type=commercial" },
  { label: "Office Space", href: "/rent/mumbai?type=commercial&propertyType=Office+Space" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Careers", href: "#" },
  { label: "Blog", href: "#" },
];

const SUPPORT_LINKS = [
  { label: "Help Center", href: "#" },
  { label: "Safety Tips", href: "#" },
  { label: "FAQs", href: "#" },
  { label: "Report an Issue", href: "#" },
];

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Refund Policy", href: "#" },
];

export function SeoFooter() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    setIsSubscribing(true);
    try {
      await apiRequest("POST", "/api/newsletter/subscribe", { email, source: "footer" });
      toast({ title: "Successfully subscribed!", description: "Thank you for subscribing to our newsletter." });
      setEmail("");
    } catch (error) {
      toast({ title: "Failed to subscribe", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-muted/50 border-t">
      <div className="bg-primary/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold">Subscribe to our Newsletter</h3>
              <p className="text-sm text-muted-foreground">Get the latest property listings and updates directly to your inbox</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full md:w-64"
                data-testid="input-newsletter-email"
              />
              <Button type="submit" disabled={isSubscribing} data-testid="button-newsletter-subscribe">
                {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Properties for Rent in Major Cities</h3>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <Link
                key={city}
                href={`/rent/${city.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1 bg-background rounded-full border"
                data-testid={`footer-city-${city.toLowerCase()}`}
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              India's leading no-brokerage property rental platform. Connect directly with property owners and save on brokerage fees.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Mumbai</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>support@leaseo.in / business@leaseo.in</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Property Types</h4>
            <ul className="space-y-2">
              {PROPERTY_TYPES.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            2025 Leaseo. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with care in India
          </p>
        </div>
      </div>
    </footer>
  );
}
