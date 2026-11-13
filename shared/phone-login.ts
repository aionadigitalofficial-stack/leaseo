import { z } from "zod";

// This is enquiry onboarding, not permission to publish a listing.
export const phoneLoginProfileSchema = z.object({
    name: z.string().trim().min(1, "Enter your name").max(120),
    userType: z.enum(["owner", "tenant", "builder_developer", "buyer"]),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
    city: z.string().trim().max(100).optional(),
});

export const phoneLoginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP"),
  // Account existence is checked only after the phone OTP has been proven.
  profile: phoneLoginProfileSchema.optional(),
});

export const phoneSignupSchema = z.object({
  registrationToken: z.string().min(1).max(2048),
  profile: phoneLoginProfileSchema,
});

export function loginProfileValues(profile: z.infer<typeof phoneLoginProfileSchema>) {
  const [firstName, ...rest] = profile.name.trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || null,
    userType: profile.userType,
    email: profile.email?.trim().toLowerCase() || null,
    city: profile.city?.trim() || null,
  };
}
