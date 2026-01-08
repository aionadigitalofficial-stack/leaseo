import { Shield, Users, Clock, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const trustPoints = [
  {
    icon: Shield,
    title: "Verified Listings",
    description: "Every property is verified by our team to ensure accuracy and legitimacy.",
  },
  {
    icon: Users,
    title: "Direct Communication",
    description: "Connect directly with landlords without any intermediaries or hidden fees.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Our dedicated support team is available around the clock to assist you.",
  },
  {
    icon: Award,
    title: "Quality Guaranteed",
    description: "We maintain high standards for all listed properties on our platform.",
  },
];

export function TrustSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Direct Rentals?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We're committed to making your rental experience seamless and trustworthy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((point) => (
            <Card key={point.title} className="text-center">
              <CardContent className="p-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <point.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                <p className="text-muted-foreground text-sm">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
