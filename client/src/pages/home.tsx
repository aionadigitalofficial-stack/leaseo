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
  heroTitle: "India's Largest <span style=\"color: #ff9a00\">Brokerage Free</span> Property Site",
  heroSubtitle: "Find your perfect rental home directly from verified owners. Broker free, no hidden fees.",
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
        <section
          className="relative isolate overflow-hidden bg-[#17374a] py-12 md:py-16 lg:py-20"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(12, 31, 43, 0.53) 0%, rgba(12, 31, 43, 0.38) 42%, rgba(12, 31, 43, 0.78) 100%), url('/images/leaseo-home-hero.jpg')",
            backgroundPosition: "center 54%",
            backgroundSize: "cover",
          }}
        >
          <div className="container relative z-10 mx-auto px-4">
            <div className="mx-auto mb-8 max-w-4xl text-center md:mb-10">
              <EditableText
                value={localContent.heroTitle}
                onChange={updateContent("heroTitle")}
                as="h1"
                className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.28)] md:text-4xl lg:text-5xl"
                contentKey="homepage.heroTitle"
              />
              <EditableText
                value={localContent.heroSubtitle}
                onChange={updateContent("heroSubtitle")}
                as="p"
                className="mx-auto max-w-2xl text-base leading-relaxed text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] md:text-lg"
                contentKey="homepage.heroSubtitle"
              />
            </div>

            <div className="mx-auto max-w-5xl rounded-2xl bg-white/95 p-2 shadow-[0_22px_70px_rgba(10,25,35,0.32)] ring-1 ring-white/60 backdrop-blur-sm md:p-3">
              <NoBrokerSearch />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-full border border-white/25 bg-[#102b3c]/55 px-4 py-2 text-white shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <EditableText
                  value={localContent.stat1}
                  onChange={updateContent("stat1")}
                  as="span"
                  className="text-white/95"
                  contentKey="homepage.stat1"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/25 bg-[#102b3c]/55 px-4 py-2 text-white shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                <EditableText
                  value={localContent.stat2}
                  onChange={updateContent("stat2")}
                  as="span"
                  className="text-white/95"
                  contentKey="homepage.stat2"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/25 bg-[#102b3c]/55 px-4 py-2 text-white shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                <EditableText
                  value={localContent.stat3}
                  onChange={updateContent("stat3")}
                  as="span"
                  className="text-white/95"
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
