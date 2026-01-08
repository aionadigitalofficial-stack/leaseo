import { Header } from "@/components/header";
import { NoBrokerSearch } from "@/components/nobroker-search";
import { PopularLocalities } from "@/components/popular-localities";
import { OwnerToTenant } from "@/components/owner-to-tenant";
import { TrustBadges } from "@/components/trust-badges";
import { SeoFooter } from "@/components/seo-footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="py-12 md:py-20 bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                India's Largest <span className="text-primary">Zero Brokerage</span> Property Site
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Find your perfect rental home directly from verified owners. No brokers, no hidden fees.
              </p>
            </div>

            <NoBrokerSearch />

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">50,000+ Active Listings</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-muted-foreground">100% Verified Owners</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-muted-foreground">10+ Cities</span>
              </div>
            </div>
          </div>
        </section>

        <PopularLocalities />

        <OwnerToTenant />

        <TrustBadges />

        <section className="py-12 md:py-16 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Ready to Find Your New Home?
            </h2>
            <p className="text-primary-foreground/90 mb-6 max-w-xl mx-auto">
              Join thousands of happy renters who saved on brokerage with Direct Rentals
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/properties">
                <button 
                  className="px-6 py-3 bg-white text-primary font-medium rounded-md hover:bg-gray-100 transition-colors"
                  data-testid="cta-browse-rentals"
                >
                  Browse Rentals
                </button>
              </a>
              <a href="/login">
                <button 
                  className="px-6 py-3 bg-transparent border border-white text-white font-medium rounded-md hover:bg-white/10 transition-colors"
                  data-testid="cta-list-property"
                >
                  List Your Property
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <SeoFooter />
    </div>
  );
}
