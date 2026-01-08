import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import HomePage from "@/pages/home";
import PropertiesPage from "@/pages/properties";
import PropertyDetailPage from "@/pages/property-detail";
import RentalSearchPage from "@/pages/rental-search";
import PostPropertyPage from "@/pages/post-property";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
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
      <Route path="/post-property" component={PostPropertyPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/profile/complete" component={ProfileCompletePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="direct-rentals-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
