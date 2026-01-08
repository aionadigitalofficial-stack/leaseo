import { Link } from "wouter";
import { Home, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  return (
    <footer className="bg-muted/50 border-t">
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
            <Link href="/" className="flex items-center gap-2 mb-4" data-testid="footer-logo">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
                <Home className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-xl">Direct Rentals</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              India's leading no-brokerage property rental platform. Connect directly with property owners and save on brokerage fees.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Mumbai, Maharashtra, India</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>support@directrentals.in</span>
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
            2024 Direct Rentals. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with care in India
          </p>
        </div>
      </div>
    </footer>
  );
}
