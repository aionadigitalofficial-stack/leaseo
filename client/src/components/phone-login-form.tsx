import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AuthUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

type UserType = "owner" | "tenant" | "builder_developer" | "buyer";

type PhoneLoginResponse = {
  success: true;
  token: string;
  user: AuthUser;
};
type ProfileRequiredResponse = {
  success: true;
  needsProfile: true;
  registrationToken: string;
};

type PhoneLoginFormProps = {
  onSuccess?: (data: { token: string; user: AuthUser }) => void;
};

const USER_TYPES: { value: UserType; label: string }[] = [
  { value: "owner", label: "Property Owner" },
  { value: "tenant", label: "Tenant" },
  { value: "builder_developer", label: "Builder / Developer" },
  { value: "buyer", label: "Buyer" },
];

async function responseError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return typeof data.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export function PhoneLoginForm({ onSuccess }: PhoneLoginFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<UserType | "">("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const validateProfile = () => {
    if (!name.trim()) return "Enter your name to continue.";
    if (!/^[6-9]\d{9}$/.test(phone)) return "Enter a valid 10-digit Indian mobile number.";
    if (!userType) return "Choose who you are.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address, or leave it blank.";
    return "";
  };

  const sendCode = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "login" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!mounted.current) return;
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't send the verification code. Try again.");
      if (data.smsSent === false) {
        throw new Error(typeof data.error === "string" ? data.error : "The verification message couldn't be delivered. Please try again later.");
      }
      setOtpSent(true);
      setCode("");
      setCountdown(30);
      setNotice(`A verification code was sent to +91 ${phone}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the verification code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const changeNumber = () => {
    setOtpSent(false);
    setCode("");
    setCountdown(0);
    setError("");
    setNotice("");
    setRegistrationToken("");
    setName("");
    setUserType("");
    setEmail("");
    setCity("");
  };

  const finishLogin = (data: PhoneLoginResponse) => {
    if (data.success !== true || !data.token || !data.user) {
      throw new Error("We couldn't complete sign-in. Please try again.");
    }
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    onSuccess?.({ token: data.token, user: data.user });
  };

  const verifyCode = async () => {
    if (!otpSent || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/phone-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      if (!response.ok) throw new Error(await responseError(response, "That code couldn't be verified. Please try again."));
      const data = await response.json() as PhoneLoginResponse | ProfileRequiredResponse;
      // Dismissing the modal cancels continuation even if a request was in flight.
      if (!mounted.current) return;
      if ("needsProfile" in data && data.needsProfile === true) {
        if (!data.registrationToken) throw new Error("Phone verification could not be completed.");
        // Kept in memory only: this short-lived proof is not an authenticated session.
        setRegistrationToken(data.registrationToken);
        setCode("");
        setNotice("Mobile verified. Add your details once to finish creating your account.");
        return;
      }
      finishLogin(data as PhoneLoginResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code couldn't be verified. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    const validation = validateProfile();
    if (validation) { setError(validation); return; }
    setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/phone-login/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationToken,
          profile: { name: name.trim(), userType, ...(email.trim() ? { email: email.trim() } : {}),
            ...(city.trim() ? { city: city.trim() } : {}) },
        }),
      });
      if (!mounted.current) return;
      if (!response.ok) {
        const message = await responseError(response, "Couldn't save your details. Please try again.");
        if (response.status === 410) {
          setRegistrationToken(""); setOtpSent(false); setCode(""); setCountdown(0); setNotice("");
        }
        throw new Error(message);
      }
      const data = await response.json() as PhoneLoginResponse;
      if (mounted.current) finishLogin(data);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Couldn't save your details.");
    } finally { if (mounted.current) setLoading(false); }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    if (registrationToken) void saveProfile();
    else if (otpSent) void verifyCode();
    else void sendCode();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="phone-login-mobile">Indian mobile number <span aria-hidden="true" className="text-primary">*</span></Label>
        <div className="flex gap-2">
          <span className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-medium text-foreground" aria-label="India country code">+91</span>
          <Input id="phone-login-mobile" type="tel" inputMode="numeric" autoComplete="tel-national"
            value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number" required disabled={otpSent || loading}
            aria-describedby="phone-login-mobile-hint" data-testid="input-phone" />
        </div>
        <p id="phone-login-mobile-hint" className="text-xs text-muted-foreground">
          {registrationToken ? "Mobile verified. These details are needed only for your new account." : "Sign in with an SMS code. New users can add their details after verification."}
        </p>
        {registrationToken && <button type="button" onClick={changeNumber} disabled={loading}
          className="text-sm font-medium text-primary hover:underline" data-testid="button-change-number">Change number</button>}
      </div>

      {registrationToken && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="new-user-profile">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone-login-name">Name <span aria-hidden="true" className="text-primary">*</span></Label>
          <Input
            id="phone-login-name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            required
            maxLength={120}
            disabled={loading}
            data-testid="input-profile-name"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phone-login-role">Who are you? <span aria-hidden="true" className="text-primary">*</span></Label>
          <select
            id="phone-login-role"
            value={userType}
            onChange={(event) => setUserType(event.target.value as UserType | "")}
            disabled={loading}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="select-user-type"
          >
            <option value="" disabled>Select your role</option>
            {USER_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-login-email">Email <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            id="phone-login-email"
            type="email"
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            data-testid="input-email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-login-city">City <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            id="phone-login-city"
            maxLength={100}
            autoComplete="address-level2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Your city"
            disabled={loading}
            data-testid="input-city"
          />
        </div>
      </div>}

      {otpSent && !registrationToken && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="phone-login-code">One-time code <span aria-hidden="true" className="text-primary">*</span></Label>
            <button type="button" onClick={changeNumber} disabled={loading} className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50" data-testid="button-change-number">
              Change number
            </button>
          </div>
          <Input
            id="phone-login-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            maxLength={6}
            aria-describedby="phone-login-code-hint"
            disabled={loading}
            className="text-center text-lg tracking-[0.35em]"
            data-testid="input-otp"
          />
          <p id="phone-login-code-hint" className="text-xs text-muted-foreground">Sent to +91 {phone}. Already registered? Verification signs you straight in.</p>
        </div>
      )}

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" data-testid="text-phone-login-error">{error}</p>}
      {notice && !error && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-phone-login-status"><CheckCircle2 className="h-4 w-4 text-primary" />{notice}</p>}

      {registrationToken ? (
        <Button type="submit" className="w-full" disabled={loading || !name.trim() || !userType} data-testid="button-complete-signup">
          {loading ? "Saving..." : "Save details & continue"}
        </Button>
      ) : !otpSent ? (
        <Button type="submit" className="w-full" disabled={loading || !/^[6-9]\d{9}$/.test(phone)} data-testid="button-send-otp">
          {loading ? "Sending code..." : "Send verification code"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      ) : (
        <div className="space-y-3">
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6} data-testid="button-verify-otp">
            {loading ? "Verifying..." : "Verify & continue"}
          </Button>
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="text-otp-countdown">Resend code in {countdown}s</p>
            ) : (
              <button type="button" onClick={sendCode} disabled={loading} className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50" data-testid="button-resend-otp">
                Resend code
              </button>
            )}
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Your details stay secure with Leaseo.</p>
    </form>
  );
}
