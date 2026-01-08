import { Link } from "wouter";
import { Home, Building2, Building, Castle, Warehouse, Trees } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const categories = [
  {
    type: "house",
    label: "Houses",
    icon: Home,
    count: 150,
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&auto=format&fit=crop",
  },
  {
    type: "apartment",
    label: "Apartments",
    icon: Building2,
    count: 280,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&auto=format&fit=crop",
  },
  {
    type: "condo",
    label: "Condos",
    icon: Building,
    count: 95,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop",
  },
  {
    type: "townhouse",
    label: "Townhouses",
    icon: Warehouse,
    count: 75,
    image: "https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=400&auto=format&fit=crop",
  },
  {
    type: "villa",
    label: "Villas",
    icon: Castle,
    count: 45,
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&auto=format&fit=crop",
  },
  {
    type: "studio",
    label: "Studios",
    icon: Trees,
    count: 120,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&auto=format&fit=crop",
  },
];

export function PropertyCategories() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Property Type</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find the perfect type of property that suits your lifestyle and needs.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link 
              key={category.type} 
              href={`/properties?type=${category.type}`}
              data-testid={`link-category-${category.type}`}
            >
              <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.label}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Icon overlay */}
                  <div className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <CardContent className="p-3">
                  <h3 className="font-semibold">{category.label}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} properties</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
