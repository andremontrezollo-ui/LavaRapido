import { Lock, Eye, Zap, Server, Trash2, Globe } from "lucide-react";

const indicators = [
  {
    icon: Lock,
    title: "Unique mock addresses",
    description: "Each simulated session generates a unique testnet address — not reused",
  },
  {
    icon: Eye,
    title: "Minimised data",
    description: "Only session metadata is stored; auto-deleted within 24 hours",
  },
  {
    icon: Zap,
    title: "Conceptual flow",
    description: "Demonstrates the processing concept without real blockchain calls",
  },
  {
    icon: Server,
    title: "Dissociation model",
    description: "Illustrates structural separation between simulated inputs and outputs",
  },
  {
    icon: Trash2,
    title: "Short retention",
    description: "Session data is automatically purged — see data-retention policy",
  },
  {
    icon: Globe,
    title: "Open prototype",
    description: "Educational interface with no geographic restrictions",
  },
];

export function TrustIndicators() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Simulator <span className="gradient-text">design principles</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            This prototype was built with clear boundaries. These are the principles that guide its design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {indicators.map((indicator, index) => (
            <div 
              key={indicator.title}
              className="group glass-card p-6 hover:border-primary/30 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <indicator.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-1">{indicator.title}</h3>
                  <p className="text-sm text-muted-foreground">{indicator.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
