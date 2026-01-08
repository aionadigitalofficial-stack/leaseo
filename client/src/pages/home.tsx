import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { PropertyGrid } from "@/components/property-grid";
import { HowItWorks } from "@/components/how-it-works";
import { PropertyCategories } from "@/components/property-categories";
import { TrustSection } from "@/components/trust-section";
import { Testimonials } from "@/components/testimonials";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Property } from "@shared/schema";

export default function HomePage() {
  const { data: featuredProperties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties?featured=true&limit=8"],
  });

  const { data: featureFlags = [] } = useQuery<{ name: string; enabled: boolean }[]>({
    queryKey: ["/api/feature-flags"],
  });

  const showSaleOption = featureFlags.some(
    (flag) => flag.name === "sell_property" && flag.enabled
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection showSaleOption={showSaleOption} />

        {/* Featured Properties */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Properties</h2>
                <p className="text-muted-foreground text-lg">
                  Handpicked rentals that stand out from the crowd
                </p>
              </div>
              <Link href="/properties">
                <Button variant="outline" className="gap-2" data-testid="link-view-all-properties">
                  View All Properties
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <PropertyGrid 
              properties={featuredProperties} 
              isLoading={isLoading}
              emptyMessage="No featured properties available at the moment."
            />
          </div>
        </section>

        {/* How It Works */}
        <HowItWorks />

        {/* Property Categories */}
        <PropertyCategories />

        {/* Trust Section */}
        <TrustSection />

        {/* Testimonials */}
        <Testimonials />

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Find Your New Home?
            </h2>
            <p className="text-primary-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied renters who found their perfect place through Direct Rentals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/properties">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-base"
                  data-testid="cta-browse-rentals"
                >
                  Browse Rentals
                </Button>
              </Link>
              <Link href="/contact">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-base bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="cta-contact-us"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
