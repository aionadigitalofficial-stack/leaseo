import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, Check, ArrowLeft, Mail } from "lucide-react";

// This page never existed before - login.tsx has always linked to
// /forgot-password, but there was no matching route and no backend support
// for resetting a password while logged out (only a "change my password
// while already logged in" flow existed).
export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const passwordRequirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Contains a number", met: /\d/.test(newPassword) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(newPassword) },
  ];
  const allRequirementsMet = passwordRequirements.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleRequestCode = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Valid email required", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset code");
      if (data.devCode) setDevCode(data.devCode);
      toast({ title: "Check your email", description: "If that email is registered, a reset code is on its way." });
      setStep("reset");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    if (!allRequirementsMet) {
      toast({ title: "Invalid Password", description: "Please meet all password requirements", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Passwords Don't Match", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      toast({ title: "Password Reset", description: "You can now log in with your new password." });
      setLocation("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              {step === "request"
                ? "Enter your account email and we'll send you a reset code"
                : `Enter the code sent to ${email} and choose a new password`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "request" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRequestCode()}
                      data-testid="input-forgot-email"
                    />
                  </div>
                </div>
                <Button onClick={handleRequestCode} disabled={isLoading} className="w-full" data-testid="button-send-reset-code">
                  {isLoading ? "Sending..." : "Send Reset Code"}
                </Button>
              </>
            ) : (
              <>
                {devCode && (
                  <div className="p-3 bg-muted rounded-lg text-center text-sm">
                    <p className="text-muted-foreground mb-1">Development Mode - Your code:</p>
                    <p className="font-mono font-bold text-lg">{devCode}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Enter 6-digit code</Label>
                  <InputOTP maxLength={6} value={code} onChange={setCode} data-testid="input-reset-otp">
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button variant="ghost" size="sm" onClick={handleRequestCode} disabled={isLoading}>
                    Resend code
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    {passwordRequirements.map((req) => (
                      <div key={req.label} className="flex items-center gap-2 text-xs">
                        <Check className={`h-3 w-3 ${req.met ? "text-green-600" : "text-muted-foreground"}`} />
                        <span className={req.met ? "text-green-600" : "text-muted-foreground"}>{req.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleResetPassword}
                  disabled={isLoading || code.length !== 6 || !allRequirementsMet || !passwordsMatch}
                  className="w-full"
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </>
            )}

            <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
