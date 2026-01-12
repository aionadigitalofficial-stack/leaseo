import { Link } from "wouter";
import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import leaseoLogo from "@assets/lessso_1767868424345-DMafamKW_1768207660992.png";

const footerLinks = {
  company: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Blog", href: "#" },
  ],
  support: [
    { label: "Help Center", href: "#" },
    { label: "Safety Information", href: "#" },
    { label: "Cancellation Options", href: "#" },
    { label: "Report a Concern", href: "#" },
  ],
  legal: [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Accessibility", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t" style={{ backgroundColor: '#0b2743' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4" data-testid="footer-logo">
              <img 
                src={leaseoLogo} 
                alt="Leaseo" 
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-white/70 mb-4 max-w-sm">
              Find your perfect rental property. We connect renters directly with property owners for a seamless experience.
            </p>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-white">Subscribe to our newsletter</p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="max-w-[250px] bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  data-testid="input-newsletter-email"
                />
                <Button className="bg-[#ff9a00] hover:bg-[#ff9a00]/90 text-white" data-testid="button-subscribe">Subscribe</Button>
              </div>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                    data-testid={`footer-link-${link.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Pune, Maharashtra, India</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-white/70">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+91 1234567890</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-white/70">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>support@leaseo.in</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-white/20" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/70">
            2024 Leaseo. All rights reserved.
          </p>
          <div className="flex gap-4">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
