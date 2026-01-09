import { Shield, Ban, Users, Clock, Star, Building } from "lucide-react";

const BADGES = [
  {
    icon: Ban,
    title: "Zero Brokerage",
    description: "No middlemen, no broker fees",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    icon: Shield,
    title: "Verified Listings",
    description: "All properties are verified",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Users,
    title: "50,000+ Happy Customers",
    description: "Trusted by thousands",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: Clock,
    title: "Quick Response",
    description: "Connect within 24 hours",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    icon: Star,
    title: "4.5 Star Rating",
    description: "Highly rated service",
    color: "text-yellow-600 dark:text-yellow-400",
  },
  {
    icon: Building,
    title: "1 Lakh+ Properties",
    description: "India's largest network",
    color: "text-indigo-600 dark:text-indigo-400",
  },
];

export function TrustBadges() {
  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Why Choose Leaseo?
          </h2>
          <p className="text-muted-foreground">
            India's most trusted property rental platform
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {BADGES.map((badge) => (
            <div
              key={badge.title}
              className="bg-background rounded-lg border p-4 text-center hover-elevate transition-transform"
              data-testid={`badge-${badge.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <div className={`mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 ${badge.color}`}>
                <badge.icon className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-sm mb-1">{badge.title}</h3>
              <p className="text-xs text-muted-foreground">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
