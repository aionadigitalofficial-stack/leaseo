import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

export function SEOHead({
  title = "Leaseo - Zero Brokerage Property Rentals in India",
  description = "Find rental properties directly from owners. Zero brokerage, verified listings across Mumbai, Pune, Delhi, Bangalore and more.",
  keywords = [],
  ogTitle,
  ogDescription,
  ogImage,
  canonicalUrl,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMetaTag("description", description);
    
    if (keywords.length > 0) {
      updateMetaTag("keywords", keywords.join(", "));
    } else {
      const existingKeywordsMeta = document.querySelector('meta[name="keywords"]');
      if (existingKeywordsMeta) {
        existingKeywordsMeta.remove();
      }
    }

    if (ogTitle || title) {
      updateMetaTag("og:title", ogTitle || title, true);
    }
    if (ogDescription || description) {
      updateMetaTag("og:description", ogDescription || description, true);
    }
    if (ogImage) {
      updateMetaTag("og:image", ogImage, true);
    }

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    }
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, canonicalUrl]);

  return null;
}

export function useSEOKeywords(keywords: string[]) {
  useEffect(() => {
    if (keywords.length > 0) {
      let meta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "keywords";
        document.head.appendChild(meta);
      }
      meta.content = keywords.join(", ");
    }
  }, [keywords]);
}
