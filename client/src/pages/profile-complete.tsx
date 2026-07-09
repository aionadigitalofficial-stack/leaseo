import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, Building2, Home, ArrowRight, ArrowLeft, Check, Mail, Phone } from "lucide-react";

const USER_TYPE_OPTIONS = [
  {
    id: "owner",
    label: "Property Owner",
    description: "I want to list my property for rent or sale",
    icon: Home,
  },
  {
    id: "tenant",
    label: "Tenant",
    description: "I'm looking to rent or buy a property",
    icon: User,
  },
  {
    id: "builder_developer",
    label: "Builder / Developer",
    description: "I represent a construction or development firm",
    icon: Building2,
  },
];

// Issue #3: a listing can only be posted once the profile is fully complete
// - name, user type, and BOTH email and phone verified via a real OTP,
// not just typed into a form. This page actually calls the backend at
// every step (the previous version was a mockup that never saved anything).
export default function ProfileCompletePage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { user, refreshUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const redirectTarget = new URLSearchParams(searchString).get("redirect") || "/dashboard";

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userType, setUserType] = useState("");

  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  // If SMS delivery isn't configured yet, phone verification can never
  // succeed - the server relaxes its requirement in that case too (see
  // isProfileReadyToList in server/routes.ts), so this page shouldn't trap
  // the user on a step that has no way to complete.
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/system/sms-status")
      .then((res) => res.json())
      .then((data) => setSmsConfigured(!!data.configured))
      .catch(() => setSmsConfigured(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation(`/login?redirect=${encodeURIComponent("/profile/complete")}`);
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setUserType(user.userType || "");
      setEmail(user.email || "");
      setEmailVerified(user.emailVerified);
      setPhone(user.phone || "");
      setPhoneVerified(user.phoneVerified);
      if (user.profileCompleted) {
        // Already done - nothing to complete, send them on their way
        setLocation(redirectTarget);
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStep1Next = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Required Fields", description: "Please enter your first and last name", variant: "destructive" });
      return;
    }
    if (!userType) {
      toast({ title: "Select an option", description: "Please tell us who you are", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const sendEmailOtp = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Valid email required", variant: "destructive" });
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "verify_email" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setEmailOtpSent(true);
      toast({ title: "Code sent", description: `We sent a verification code to ${email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const authedFetch = async (method: string, url: string, body: unknown) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
  };

  const verifyEmailOtp = async () => {
    if (emailOtp.length !== 6) return;
    setEmailLoading(true);
    try {
      await authedFetch("POST", "/api/auth/otp/verify", { email, code: emailOtp });
      setEmailVerified(true);
      toast({ title: "Email verified", description: "Your email has been verified." });
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      toast({ title: "Valid phone number required", variant: "destructive" });
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "verify_phone" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setPhoneOtpSent(true);
      toast({ title: "Code sent", description: `We sent a verification code to ${phone}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPhoneLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) return;
    setPhoneLoading(true);
    try {
      await authedFetch("POST", "/api/auth/otp/verify", { phone, code: phoneOtp });
      setPhoneVerified(true);
      toast({ title: "Phone verified", description: "Your phone number has been verified." });
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await authedFetch("PATCH", "/api/auth/profile", { firstName, lastName, userType, phone });
      await refreshUser();
      toast({ title: "Profile Complete", description: "Your account is now fully set up!" });
      setLocation(redirectTarget);
    } catch (err: any) {
      toast({ title: "Couldn't save profile", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canFinish = emailVerified && (phoneVerified || (smsConfigured === false && !!phone));

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
              A verified profile is required before you can post a listing
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-8" data-testid="progress-steps">
            {["Details", "Verify Email", "Verify Phone"].map((label, i) => {
              const stepNum = i + 1;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > stepNum ? "bg-primary text-primary-foreground" : step === stepNum ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {step > stepNum ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline text-muted-foreground">{label}</span>
                  {i < 2 && <div className="w-6 h-0.5 bg-muted ml-1" />}
                </div>
              );
            })}
          </div>

          <Card>
            {step === 1 && (
              <>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-first-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-last-name" />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label>Who are you?</Label>
                    <RadioGroup value={userType} onValueChange={setUserType} className="space-y-3">
                      {USER_TYPE_OPTIONS.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                            userType === opt.id ? "border-primary bg-primary/5" : "border-border hover-elevate"
                          }`}
                          data-testid={`user-type-${opt.id}`}
                        >
                          <RadioGroupItem value={opt.id} id={opt.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <opt.icon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{opt.label}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <Button onClick={handleStep1Next} className="w-full gap-2 mt-2" data-testid="button-continue">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </>
            )}

            {step === 2 && (
              <>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5" /> Verify Your Email</CardTitle>
                  <CardDescription>We need to confirm this is really you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emailVerified ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Check className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">{email} is verified</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="flex gap-2">
                          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={emailOtpSent} data-testid="input-email" />
                          {!emailOtpSent && (
                            <Button variant="outline" onClick={sendEmailOtp} disabled={emailLoading} data-testid="button-send-email-otp">
                              Send Code
                            </Button>
                          )}
                        </div>
                      </div>
                      {emailOtpSent && (
                        <div className="space-y-2">
                          <Label>Enter 6-digit code</Label>
                          <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp} data-testid="input-email-otp">
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                            </InputOTPGroup>
                          </InputOTP>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={sendEmailOtp} disabled={emailLoading}>Resend code</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-1">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    {emailVerified ? (
                      <Button onClick={() => setStep(3)} className="flex-1 gap-2" data-testid="button-continue-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button onClick={verifyEmailOtp} disabled={emailOtp.length !== 6 || emailLoading} className="flex-1" data-testid="button-verify-email">
                        {emailLoading ? "Verifying..." : "Verify"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </>
            )}

            {step === 3 && (
              <>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Phone className="w-5 h-5" /> Verify Your Phone</CardTitle>
                  <CardDescription>Almost done - one more code</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phoneVerified ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Check className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">{phone} is verified</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number</Label>
                        <div className="flex gap-2">
                          <Input id="phone" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={phoneOtpSent} data-testid="input-phone" />
                          {!phoneOtpSent && smsConfigured !== false && (
                            <Button variant="outline" onClick={sendPhoneOtp} disabled={phoneLoading} data-testid="button-send-phone-otp">
                              Send Code
                            </Button>
                          )}
                        </div>
                      </div>

                      {smsConfigured === false && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                          SMS verification isn't available right now. Your number will be saved, and you can verify it later from your dashboard.
                        </div>
                      )}

                      {phoneOtpSent && (
                        <div className="space-y-2">
                          <Label>Enter 6-digit code</Label>
                          <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp} data-testid="input-phone-otp">
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                            </InputOTPGroup>
                          </InputOTP>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={sendPhoneOtp} disabled={phoneLoading}>Resend code</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-2">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    {phoneVerified || (smsConfigured === false && phone) ? (
                      <Button onClick={handleComplete} disabled={!canFinish || isSubmitting} className="flex-1 gap-2" data-testid="button-complete-setup">
                        {isSubmitting ? "Saving..." : "Complete Setup"} <Check className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button onClick={verifyPhoneOtp} disabled={phoneOtp.length !== 6 || phoneLoading} className="flex-1" data-testid="button-verify-phone">
                        {phoneLoading ? "Verifying..." : "Verify"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
