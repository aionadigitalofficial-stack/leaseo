import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Home, ArrowRight, Check } from "lucide-react";
import type { UserRoleType } from "@shared/schema";

const ROLE_OPTIONS = [
  {
    id: "residential_tenant",
    label: "Residential Tenant",
    description: "Looking to rent a home or apartment",
    icon: Home,
  },
  {
    id: "commercial_tenant",
    label: "Commercial Tenant",
    description: "Looking for office or shop space",
    icon: Building2,
  },
  {
    id: "residential_owner",
    label: "Residential Owner",
    description: "List your residential property for rent",
    icon: Home,
  },
  {
    id: "commercial_owner",
    label: "Commercial Owner",
    description: "List your commercial property for rent",
    icon: Building2,
  },
];

export default function ProfileCompletePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    selectedRole: "" as UserRoleType | "",
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName) {
        toast({
          title: "Required Fields",
          description: "Please enter your first and last name",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.selectedRole) {
        toast({
          title: "Select a Role",
          description: "Please choose how you want to use Leaseo",
          variant: "destructive",
        });
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    // Simulate API call - will be replaced with actual implementation
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Profile Complete",
        description: "Your account is now set up!",
      });
      setLocation("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold" data-testid="text-profile-title">
              Complete Your Profile
            </h1>
            <p className="text-muted-foreground mt-2">
              Just a few more details to get you started
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8" data-testid="progress-steps">
            <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`} data-testid="step-indicator-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > 1 ? "bg-primary text-primary-foreground" : step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : "1"}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Personal Info</span>
            </div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`} data-testid="step-indicator-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Choose Role</span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {step === 1 ? "Personal Information" : "How will you use Leaseo?"}
              </CardTitle>
              <CardDescription>
                {step === 1 
                  ? "Tell us about yourself" 
                  : "Select your primary role (you can add more later)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="input-profile-email"
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll use this for important notifications
                    </p>
                  </div>
                </div>
              ) : (
                <RadioGroup
                  value={formData.selectedRole}
                  onValueChange={(value) => setFormData({ ...formData, selectedRole: value as UserRoleType })}
                  className="space-y-3"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        formData.selectedRole === role.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`role-option-${role.id}`}
                    >
                      <RadioGroupItem value={role.id} id={role.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <role.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{role.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              <div className="flex gap-3 mt-6" data-testid="step-actions">
                {step > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(step - 1)}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  className="flex-1"
                  disabled={isLoading}
                  data-testid={step === 1 ? "button-continue" : "button-complete-setup"}
                >
                  {isLoading ? "Saving..." : step === 2 ? "Complete Setup" : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
