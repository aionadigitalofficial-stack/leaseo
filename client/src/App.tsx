import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { FloatingEditToggle } from "@/components/floating-edit-toggle";
import { useToast } from "@/hooks/use-toast";
import HomePage from "@/pages/home";
import PropertiesPage from "@/pages/properties";
import PropertyDetailPage from "@/pages/property-detail";
import RentalSearchPage from "@/pages/rental-search";
import PostPropertyPage from "@/pages/post-property";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import BlogPage from "@/pages/blog";
import BlogDetailPage from "@/pages/blog-detail";
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import RegisterPage from "@/pages/register";
import ProfileCompletePage from "@/pages/profile-complete";
import DashboardPage from "@/pages/dashboard";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/property/:id" component={PropertyDetailPage} />
      <Route path="/properties/:id" component={PropertyDetailPage} />
      <Route path="/rent/:city/:locality" component={RentalSearchPage} />
      <Route path="/rent/:city" component={RentalSearchPage} />
      <Route path="/buy/:city/:locality" component={RentalSearchPage} />
      <Route path="/buy/:city" component={RentalSearchPage} />
      <Route path="/post-property" component={PostPropertyPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/blog/:slug" component={BlogDetailPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/profile/complete" component={ProfileCompletePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { toast } = useToast();

  // The admin "Tracking Codes" settings page only ever saved these values
  // to the database - nothing on the actual public site ever loaded them
  // into a real page for a visitor's browser to execute, so Google
  // Analytics never received any traffic regardless of what was saved.
  // This runs once, site-wide, and actually injects the gtag.js script
  // (GA4) plus the Search Console verification meta tag.
  useEffect(() => {
    fetch("/api/tracking-codes")
      .then((res) => res.json())
      .then((data) => {
        const gaId = (data?.googleAnalyticsCode || "").trim();
        if (gaId && !document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
          const loaderScript = document.createElement("script");
          loaderScript.async = true;
          loaderScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
          document.head.appendChild(loaderScript);

          const inlineScript = document.createElement("script");
          inlineScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId.replace(/'/g, "")}');
          `;
          document.head.appendChild(inlineScript);
        }

        const verificationContent = (data?.googleWebmasterCode || "").trim();
        if (verificationContent && !document.querySelector('meta[name="google-site-verification"]')) {
          const meta = document.createElement("meta");
          meta.name = "google-site-verification";
          meta.content = verificationContent;
          document.head.appendChild(meta);
        }
      })
      .catch((err) => console.error("Failed to load tracking codes:", err));
  }, []);

  const handleSaveChanges = async (changes: Map<string, unknown>) => {
    const changesArray = Array.from(changes.entries());
    
    const changesByPage = new Map<string, Record<string, unknown>>();
    
    for (const [key, value] of changesArray) {
      const [pageKey, contentKey] = key.split(".");
      if (!changesByPage.has(pageKey)) {
        changesByPage.set(pageKey, {});
      }
      changesByPage.get(pageKey)![contentKey] = value;
    }
    
    const savedPageKeys: string[] = [];
    
    for (const [pageKey, contentChanges] of Array.from(changesByPage)) {
      try {
        const response = await fetch(`/api/pages/${pageKey}`);
        let currentContent = {};
        
        if (response.ok) {
          const pageData = await response.json();
          currentContent = pageData.content || {};
        }
        
        const updatedContent = {
          ...currentContent,
          ...contentChanges,
        };
        
        await apiRequest("PATCH", `/api/pages/${pageKey}`, {
          title: pageKey.charAt(0).toUpperCase() + pageKey.slice(1),
          content: updatedContent,
        });
        
        savedPageKeys.push(pageKey);
      } catch (error) {
        console.error(`Failed to save ${pageKey}:`, error);
        toast({
          title: "Failed to save changes",
          description: `Could not update ${pageKey}`,
          variant: "destructive",
        });
        throw error;
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
    for (const pageKey of savedPageKeys) {
      queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageKey}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/pages", pageKey] });
    }
    
    toast({
      title: "Changes saved",
      description: "Your edits have been saved successfully.",
    });
  };

  return (
    <EditModeProvider onSave={handleSaveChanges}>
      <Toaster />
      <Router />
      <FloatingEditToggle />
    </EditModeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="direct-rentals-theme">
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
