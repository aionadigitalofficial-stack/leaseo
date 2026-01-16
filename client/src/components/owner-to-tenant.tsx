import { User, Search, Key, CheckCircle } from "lucide-react";

const STEPS = [
  {
    icon: User,
    title: "Owner Lists Property",
    description: "Property owners register and list their property with photos and details - completely free",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  {
    icon: Search,
    title: "Tenant Searches",
    description: "Tenants search properties by location, budget and preferences without any broker interference",
    color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  {
    icon: Key,
    title: "Direct Connection",
    description: "Connect directly with property owners via call or chat - no middleman involved",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
  {
    icon: CheckCircle,
    title: "Finalize Deal",
    description: "Visit the property, negotiate directly and finalize the rental agreement",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
];

export function OwnerToTenant() {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From property listing to deal finalization - a seamless journey without brokers
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-border" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center"
                data-testid={`step-${index + 1}`}
              >
                <div className="relative mb-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center relative z-10 ${step.color}`}
                  >
                    <step.icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold z-20 shadow-md">
                    {index + 1}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[220px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Save upto 2 months rent in brokerage fees</span>
          </div>
        </div>
      </div>
    </section>
  );
}
