import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ContactForm } from "@/components/contact-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { SEOHead } from "@/components/seo-head";

const contactInfo = [
  {
    icon: MapPin,
    title: "Address",
    details: ["Mumbai, Maharashtra, India"],
  },
  {
    icon: Mail,
    title: "Email",
    details: ["support@leaseo.in", "business@leaseo.in"],
  },
];

const faqs = [
  {
    question: "How do I list my property?",
    answer: "Simply create an account, click 'List Property' in your dashboard, and follow the step-by-step process to add your property details and photos.",
  },
  {
    question: "Are the listings verified?",
    answer: "Yes, all listings go through our verification process to ensure accuracy. We verify property ownership and check that all information provided is accurate.",
  },
  {
    question: "What fees do you charge?",
    answer: "For renters, our service is completely free. For landlords, we charge a small listing fee after a successful rental agreement is made.",
  },
  {
    question: "How do I schedule a property viewing?",
    answer: "Use the contact form on any property listing to message the landlord directly and arrange a viewing at a time that works for both of you.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Contact Us - Leaseo Property Rentals"
        description="Get in touch with Leaseo for any questions about property rentals. We're here to help you find your perfect rental home."
        keywords={["contact leaseo", "property support", "rental help", "pune property", "mumbai rentals"]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Have questions or need assistance? We're here to help. 
              Reach out to us through any of the channels below.
            </p>
          </div>
        </section>

        {/* Contact Information & Form */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Info Cards */}
              <div className="space-y-6">
                {contactInfo.map((info) => (
                  <Card key={info.title}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <info.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{info.title}</h3>
                          {info.details.map((detail, idx) => (
                            <p key={idx} className="text-muted-foreground text-sm">
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Contact Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Send Us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContactForm />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Find quick answers to common questions about our platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground text-sm">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
