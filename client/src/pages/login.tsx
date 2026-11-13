import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PhoneLoginForm } from "@/components/phone-login-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/hooks/use-auth";
import { pendingPropertyContactRedirect } from "@/lib/pending-property-contact";
import { Phone, Mail, Shield, Home } from "lucide-react";

export default function LoginPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSuccess = ({ user }: { token: string; user: AuthUser }) => {
    const pendingContact = pendingPropertyContactRedirect(window.location.search);
    if (pendingContact) {
      window.location.href = pendingContact;
      return;
    }
    if (user.isAdmin) {
      window.location.href = "/admin";
      return;
    }
    const requested = new URLSearchParams(window.location.search).get("redirect");
    const safeRedirect = requested && requested.startsWith("/") && !requested.startsWith("//")
      && new URL(requested, window.location.origin).origin === window.location.origin
      ? requested
      : null;
    window.location.href = safeRedirect || "/dashboard";
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
      if (!response.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast({ title: "Login Successful", description: "Welcome back!" });

      const pendingContact = pendingPropertyContactRedirect(window.location.search);
      if (pendingContact) {
        window.location.href = pendingContact;
      } else if (data.user?.isAdmin) {
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
            <p className="text-muted-foreground mt-2">Sign in to find your perfect property or list your own</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign In</CardTitle>
              <CardDescription>Choose your preferred login method</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="phone" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="phone" data-testid="tab-phone-login">
                    <Phone className="w-4 h-4 mr-2" />Phone
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email-login">
                    <Mail className="w-4 h-4 mr-2" />Email
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="phone">
                  <PhoneLoginForm onSuccess={handlePhoneSuccess} />
                </TabsContent>

                <TabsContent value="email" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/forgot-password">
                        <span className="text-sm text-primary hover:underline">Forgot password?</span>
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
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
                        <span className="text-primary hover:underline">Create one</span>
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
