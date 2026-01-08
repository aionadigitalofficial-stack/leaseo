import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TrustSection } from "@/components/trust-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { ArrowRight, Target, Eye, Heart } from "lucide-react";

const teamMembers = [
  {
    name: "Alex Thompson",
    role: "CEO & Founder",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop",
  },
  {
    name: "Sarah Martinez",
    role: "Head of Operations",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop",
  },
  {
    name: "Michael Chen",
    role: "Head of Technology",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop",
  },
  {
    name: "Emily Rodriguez",
    role: "Customer Success Lead",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop",
  },
];

const values = [
  {
    icon: Target,
    title: "Our Mission",
    description: "To simplify the rental process by connecting tenants directly with property owners, eliminating unnecessary fees and creating transparent, trustworthy relationships.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    description: "A world where finding a rental home is as simple as finding a friend, where trust and transparency are the foundation of every transaction.",
  },
  {
    icon: Heart,
    title: "Our Values",
    description: "Integrity, transparency, and user-first thinking guide everything we do. We believe in fair pricing, honest communication, and building lasting relationships.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&auto=format&fit=crop')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60" />
          </div>
          
          <div className="relative container mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                About Leaseo
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8">
                We're on a mission to transform the rental experience by connecting 
                renters directly with property owners. No middlemen, no hidden fees, 
                just simple and transparent renting.
              </p>
              <Link href="/properties">
                <Button size="lg" className="gap-2" data-testid="button-explore-properties">
                  Explore Properties
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Leaseo was born from a simple frustration: why does renting 
                    have to be so complicated and expensive? As renters ourselves, we 
                    experienced firsthand the hidden fees, poor communication, and lack 
                    of transparency that plagues the rental industry.
                  </p>
                  <p>
                    Founded in 2020, we set out to build something different. A platform 
                    where landlords and tenants could connect directly, where every listing 
                    is verified, and where trust is earned through transparency.
                  </p>
                  <p>
                    Today, we've helped thousands of people find their perfect rental home, 
                    and we're just getting started. Our goal is to make renting as simple 
                    and stress-free as it should be.
                  </p>
                </div>
              </div>
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop"
                  alt="Our team working together"
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission, Vision, Values */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Drives Us</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our mission, vision, and values guide every decision we make.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((item) => (
                <Card key={item.title}>
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Team</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                The passionate people behind Leaseo who work every day 
                to make your rental experience better.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {teamMembers.map((member) => (
                <Card key={member.name} className="text-center">
                  <CardContent className="p-6">
                    <Avatar className="w-24 h-24 mx-auto mb-4">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-lg">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <TrustSection />

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Find Your Perfect Home?
            </h2>
            <p className="text-primary-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
              Join our community of satisfied renters and landlords today.
            </p>
            <Link href="/properties">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-browse-rentals">
                Browse Rentals
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
