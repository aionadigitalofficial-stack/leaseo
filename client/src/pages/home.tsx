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
        <section className="relative isolate overflow-hidden bg-[#fff8f0] py-12 md:py-20">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <img
              src="/images/leaseo-home-lifestyle.jpg"
              alt=""
              className="h-full w-full object-cover object-[center_42%] opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#fff8f0]/80 via-[#fff0dc]/55 to-[#fff8f0]/85" />
          </div>

          <div className="container relative z-10 mx-auto min-w-0 px-4">
            <div className="mb-8 text-center md:mb-12">
                <EditableText
                  value={localContent.heroTitle}
                  onChange={updateContent("heroTitle")}
                  as="h1"
                  className="mb-4 text-3xl font-bold text-[#0b2743] md:text-4xl lg:text-5xl [&_span]:!text-[#a95300]"
                  contentKey="homepage.heroTitle"
                />
                <EditableText
                  value={localContent.heroSubtitle}
                  onChange={updateContent("heroSubtitle")}
                  as="p"
                  className="mx-auto max-w-2xl text-lg leading-relaxed text-[#334155]"
                  contentKey="homepage.heroSubtitle"
                />
            </div>

            <div className="mx-auto w-full min-w-0 max-w-5xl rounded-2xl bg-white p-2 shadow-[0_18px_48px_rgba(37,49,53,0.2)] ring-1 ring-[#17374a]/10 [&>div>div>div:first-child>button]:px-2 sm:p-3 sm:[&>div>div>div:first-child>button]:px-6">
              <NoBrokerSearch />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5 text-sm sm:mt-7 sm:gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white bg-white px-3.5 py-2 text-[#0b2743] shadow-sm sm:px-4">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <EditableText
                  value={localContent.stat1}
                  onChange={updateContent("stat1")}
                  as="span"
                  className="font-medium"
                  contentKey="homepage.stat1"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white bg-white px-3.5 py-2 text-[#0b2743] shadow-sm sm:px-4">
                <span className="h-2 w-2 rounded-full bg-[#0b2743]" />
                <EditableText
                  value={localContent.stat2}
                  onChange={updateContent("stat2")}
                  as="span"
                  className="font-medium"
                  contentKey="homepage.stat2"
                />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white bg-white px-3.5 py-2 text-[#0b2743] shadow-sm sm:px-4">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <EditableText
                  value={localContent.stat3}
                  onChange={updateContent("stat3")}
                  as="span"
                  className="font-medium"
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
