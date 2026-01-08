import { Link } from "wouter";
import { MapPin, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const POPULAR_LOCALITIES = {
  Mumbai: [
    { name: "Andheri West", properties: 1240, trending: true },
    { name: "Bandra West", properties: 890, trending: true },
    { name: "Powai", properties: 720 },
    { name: "Malad West", properties: 650 },
    { name: "Goregaon East", properties: 580 },
    { name: "Thane West", properties: 920 },
  ],
  Delhi: [
    { name: "Dwarka", properties: 1100, trending: true },
    { name: "Rohini", properties: 980 },
    { name: "Saket", properties: 760, trending: true },
    { name: "Vasant Kunj", properties: 540 },
    { name: "Mayur Vihar", properties: 680 },
    { name: "Lajpat Nagar", properties: 450 },
  ],
  Bangalore: [
    { name: "Whitefield", properties: 1450, trending: true },
    { name: "Koramangala", properties: 1200, trending: true },
    { name: "HSR Layout", properties: 980 },
    { name: "Electronic City", properties: 870 },
    { name: "Marathahalli", properties: 760 },
    { name: "Indiranagar", properties: 640, trending: true },
  ],
};

export function PopularLocalities() {
  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Popular Localities
          </h2>
          <p className="text-muted-foreground">
            Explore properties in the most sought-after neighborhoods
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(POPULAR_LOCALITIES).map(([city, localities]) => (
            <div
              key={city}
              className="bg-background rounded-lg border p-5"
            >
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {city}
              </h3>
              <ul className="space-y-3">
                {localities.map((loc) => (
                  <li key={loc.name}>
                    <Link
                      href={`/rent/${city.toLowerCase().replace(/\s+/g, "-")}/${loc.name.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover-elevate transition-colors group"
                      data-testid={`link-locality-${loc.name.toLowerCase().replace(" ", "-")}`}
                    >
                      <span className="text-sm group-hover:text-primary transition-colors">
                        {loc.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {loc.trending && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Hot
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {loc.properties}+ properties
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
