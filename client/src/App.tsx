import { Switch, Route } from "wouter";
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
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProfileCompletePage from "@/pages/profile-complete";
import DashboardPage from "@/pages/dashboard";
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
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/profile/complete" component={ProfileCompletePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { toast } = useToast();

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
    
    for (const [pageKey, contentChanges] of changesByPage) {
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
