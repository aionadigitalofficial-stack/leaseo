import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Shield, Home, User, Mail, Lock, Phone, CheckCircle2 } from "lucide-react";

type Step = "email" | "verify" | "details";

export default function RegisterPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          purpose: "verify_email",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      if (data.devCode) {
        setDevCode(data.devCode);
      }

      toast({
        title: "Verification Code Sent",
        description: `We've sent a code to ${formData.email}`,
      });

      setStep("verify");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully",
      });

      setStep("details");
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          phone: formData.phone || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Account Created",
        description: "Welcome to Leaseo!",
      });

      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step === "email" ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
        {step === "email" ? "1" : <CheckCircle2 className="w-4 h-4" />}
      </div>
      <div className={`w-8 h-0.5 ${step !== "email" ? "bg-primary" : "bg-muted"}`} />
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step === "verify" ? "bg-primary text-primary-foreground" : step === "details" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {step === "details" ? <CheckCircle2 className="w-4 h-4" /> : "2"}
      </div>
      <div className={`w-8 h-0.5 ${step === "details" ? "bg-primary" : "bg-muted"}`} />
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step === "details" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        3
      </div>
    </div>
  );

  const renderEmailStep = () => (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Enter Your Email</CardTitle>
        <CardDescription>
          We'll send you a verification code to confirm your email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="pl-10"
              data-testid="input-email"
            />
          </div>
        </div>

        <Button
          onClick={handleSendOtp}
          className="w-full"
          disabled={isLoading}
          data-testid="button-send-otp"
        >
          {isLoading ? "Sending..." : "Send Verification Code"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground" data-testid="text-login-cta">
            Already have an account?{" "}
            <Link href="/login" data-testid="link-login">
              <span className="text-primary hover:underline">Sign in</span>
            </Link>
          </p>
        </div>
      </CardContent>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Verify Your Email</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to {formData.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            type="text"
            placeholder="Enter 6-digit code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-lg tracking-widest"
            maxLength={6}
            data-testid="input-otp"
          />
        </div>

        {devCode && (
          <div className="bg-muted/50 border rounded-md p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Development Mode - Your code:</p>
            <p className="text-lg font-mono font-bold tracking-widest">{devCode}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("email")}
            className="flex-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleVerifyOtp}
            className="flex-1"
            disabled={isLoading || otpCode.length !== 6}
            data-testid="button-verify-otp"
          >
            {isLoading ? "Verifying..." : "Verify"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleSendOtp}
            className="text-sm text-primary hover:underline"
            disabled={isLoading}
            data-testid="button-resend-otp"
          >
            Didn't receive code? Resend
          </button>
        </div>
      </CardContent>
    </>
  );

  const renderDetailsStep = () => (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-600 dark:text-green-400">Email verified: {formData.email}</span>
        </div>
        <CardTitle className="text-lg">Complete Your Profile</CardTitle>
        <CardDescription>
          Just a few more details to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                className="pl-10"
                data-testid="input-first-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              data-testid="input-last-name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Mobile Number (Optional)</Label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 bg-muted rounded-md border text-sm text-muted-foreground">
              +91
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit number"
                value={formData.phone}
                onChange={(e) =>
                  handleChange(
                    "phone",
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                className="pl-10"
                data-testid="input-phone"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="pl-10"
              data-testid="input-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleChange("confirmPassword", e.target.value)
              }
              className="pl-10"
              data-testid="input-confirm-password"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setStep("verify")}
            className="flex-1"
            data-testid="button-back-details"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleRegister}
            className="flex-1"
            disabled={isLoading}
            data-testid="button-register"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Home className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-register-title">
              Create Your Account
            </h1>
            <p className="text-muted-foreground mt-2">
              Join Leaseo to find or list properties directly
            </p>
          </div>

          {renderStepIndicator()}

          <Card>
            {step === "email" && renderEmailStep()}
            {step === "verify" && renderVerifyStep()}
            {step === "details" && renderDetailsStep()}
          </Card>

          <div
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            data-testid="text-security-notice"
          >
            <Shield className="w-4 h-4" />
            <span>Your data is secure with us</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
