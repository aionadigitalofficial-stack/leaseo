import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, ArrowRight, Shield, Home } from "lucide-react";

export default function LoginPage() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call - will be replaced with actual implementation
    setTimeout(() => {
      setOtpSent(true);
      setIsLoading(false);
      setCountdown(30);
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "OTP Sent",
        description: `A verification code has been sent to +91 ${phoneNumber}`,
      });
    }, 1500);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call - will be replaced with actual implementation
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Login Successful",
        description: "Welcome to Leaseo!",
      });
      // Redirect to profile completion or dashboard
      window.location.href = "/profile/complete";
    }, 1500);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      if (data.user?.isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Home className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-login-title">Welcome to Leaseo</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to find your perfect property or list your own
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription>
                Choose your preferred login method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="phone" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="phone" data-testid="tab-phone-login">
                    <Phone className="w-4 h-4 mr-2" />
                    Phone
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email-login">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="phone" className="space-y-4">
                  {!otpSent ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <div className="flex gap-2">
                          <div className="flex items-center px-3 bg-muted rounded-md border text-sm text-muted-foreground">
                            +91
                          </div>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter 10-digit number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            data-testid="input-phone"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleSendOtp} 
                        className="w-full"
                        disabled={isLoading || phoneNumber.length < 10}
                        data-testid="button-send-otp"
                      >
                        {isLoading ? "Sending..." : "Send OTP"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-4">
                        <p className="text-sm text-muted-foreground">
                          OTP sent to <span className="font-medium">+91 {phoneNumber}</span>
                        </p>
                        <button 
                          onClick={() => setOtpSent(false)}
                          className="text-sm text-primary hover:underline mt-1"
                          data-testid="button-change-number"
                        >
                          Change number
                        </button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          data-testid="input-otp"
                          className="text-center text-lg tracking-widest"
                          maxLength={6}
                        />
                      </div>
                      <Button 
                        onClick={handleVerifyOtp} 
                        className="w-full"
                        disabled={isLoading || otp.length < 6}
                        data-testid="button-verify-otp"
                      >
                        {isLoading ? "Verifying..." : "Verify & Login"}
                      </Button>
                      <div className="text-center">
                        {countdown > 0 ? (
                          <p className="text-sm text-muted-foreground" data-testid="text-otp-countdown">
                            Resend OTP in {countdown}s
                          </p>
                        ) : (
                          <button 
                            onClick={handleSendOtp}
                            className="text-sm text-primary hover:underline"
                            data-testid="button-resend-otp"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/forgot-password">
                        <span className="text-sm text-primary hover:underline">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </div>
                  <Button 
                    onClick={handleEmailLogin} 
                    className="w-full"
                    disabled={isLoading || !email || !password}
                    data-testid="button-email-login"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground" data-testid="text-register-cta">
                      Don't have an account?{" "}
                      <Link href="/register" data-testid="link-register">
                        <span className="text-primary hover:underline">
                          Create one
                        </span>
                      </Link>
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground" data-testid="text-security-notice">
            <Shield className="w-4 h-4" />
            <span>Your data is secure with us</span>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
