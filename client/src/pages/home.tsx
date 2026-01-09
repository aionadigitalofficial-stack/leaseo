import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { NoBrokerSearch } from "@/components/nobroker-search";
import { PopularLocalities } from "@/components/popular-localities";
import { OwnerToTenant } from "@/components/owner-to-tenant";
import { TrustBadges } from "@/components/trust-badges";
import { SeoFooter } from "@/components/seo-footer";
import { EditableText } from "@/components/editable-text";
import { SEOHead } from "@/components/seo-head";
import type { PageContent } from "@shared/schema";

const DEFAULT_CONTENT = {
  heroTitle: "India's Largest <span style=\"color: #ff9a00\">Zero Brokerage</span> Property Site",
  heroSubtitle: "Find your perfect rental home directly from verified owners. No brokers, no hidden fees.",
  stat1: "50,000+ Active Listings",
  stat2: "100% Verified Owners",
  stat3: "10+ Cities",
  ctaTitle: "Ready to Find Your New Home?",
  ctaSubtitle: "Join thousands of happy renters who saved on brokerage with Leaseo",
};

export default function HomePage() {
  const { data: pageData } = useQuery<PageContent>({
    queryKey: ["/api/pages/homepage"],
  });

  const content = pageData?.content as Record<string, string> | undefined;
  
  const [localContent, setLocalContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    if (content) {
      setLocalContent({
        heroTitle: content.heroTitle || DEFAULT_CONTENT.heroTitle,
        heroSubtitle: content.heroSubtitle || DEFAULT_CONTENT.heroSubtitle,
        stat1: content.stat1 || DEFAULT_CONTENT.stat1,
        stat2: content.stat2 || DEFAULT_CONTENT.stat2,
        stat3: content.stat3 || DEFAULT_CONTENT.stat3,
        ctaTitle: content.ctaTitle || DEFAULT_CONTENT.ctaTitle,
        ctaSubtitle: content.ctaSubtitle || DEFAULT_CONTENT.ctaSubtitle,
      });
    }
  }, [content]);

  const updateContent = (key: keyof typeof localContent) => (value: string) => {
    setLocalContent((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={pageData?.metaTitle || "Leaseo - Zero Brokerage Property Rentals in India"}
        description={pageData?.metaDescription || "Find rental properties directly from owners. Zero brokerage, verified listings across Mumbai, Pune, Delhi, Bangalore and more."}
        keywords={(pageData as any)?.metaKeywords || ["property rental", "zero brokerage", "rent apartment", "house for rent", "pune", "mumbai", "delhi", "bangalore"]}
      />
      <Header />
      
      <main className="flex-1">
        <section className="py-12 md:py-20 bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <EditableText
                value={localContent.heroTitle}
                onChange={updateContent("heroTitle")}
                as="h1"
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
                contentKey="homepage.heroTitle"
              />
              <EditableText
                value={localContent.heroSubtitle}
                onChange={updateContent("heroSubtitle")}
                as="p"
                className="text-muted-foreground text-lg max-w-2xl mx-auto"
                contentKey="homepage.heroSubtitle"
              />
            </div>

            <NoBrokerSearch />

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <EditableText
                  value={localContent.stat1}
                  onChange={updateContent("stat1")}
                  as="span"
                  className="text-muted-foreground"
                  contentKey="homepage.stat1"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <EditableText
                  value={localContent.stat2}
                  onChange={updateContent("stat2")}
                  as="span"
                  className="text-muted-foreground"
                  contentKey="homepage.stat2"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-full border">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                <EditableText
                  value={localContent.stat3}
                  onChange={updateContent("stat3")}
                  as="span"
                  className="text-muted-foreground"
                  contentKey="homepage.stat3"
                />
              </div>
            </div>
          </div>
        </section>

        <PopularLocalities />

        <OwnerToTenant />

        <TrustBadges />

        <section className="py-12 md:py-16 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <EditableText
              value={localContent.ctaTitle}
              onChange={updateContent("ctaTitle")}
              as="h2"
              className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4"
              contentKey="homepage.ctaTitle"
            />
            <EditableText
              value={localContent.ctaSubtitle}
              onChange={updateContent("ctaSubtitle")}
              as="p"
              className="text-primary-foreground/90 mb-6 max-w-xl mx-auto"
              contentKey="homepage.ctaSubtitle"
            />
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
