import { Layout } from "@/components/layout/Layout";
import { ArrowDown, Wallet, Shuffle, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

// Static class map to avoid dynamic Tailwind class generation issues
const stepColorMap: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10 border-2 border-primary/30", text: "text-primary" },
  accent: { bg: "bg-accent/10 border-2 border-accent/30", text: "text-accent" },
  success: { bg: "bg-success/10 border-2 border-success/30", text: "text-success" },
};

const flowSteps = [
  {
    icon: Wallet,
    step: "01",
    title: "Session Setup (Simulated)",
    description: "The simulator generates a unique mock testnet address for your demonstration session. This address is not valid on mainnet and no real funds should be sent.",
    details: [
      "Mock address generated on demand",
      "Session expires after 30 minutes",
      "No real blockchain connectivity",
    ],
    color: "primary",
  },
  {
    icon: Shuffle,
    step: "02",
    title: "Conceptual Processing",
    description: "This step illustrates how funds would conceptually enter a dissociation pool. In this simulator, no actual mixing occurs — it demonstrates what the interface would look like.",
    details: [
      "Conceptual pool illustration",
      "Temporal correlation concept",
      "Value fragmentation demonstration",
    ],
    color: "accent",
  },
  {
    icon: Clock,
    step: "03",
    title: "Delay Configuration (Demo)",
    description: "The configurable delay parameter shows how temporal separation could be applied. In this prototype, the delay is stored as session metadata only.",
    details: [
      "User-configurable delay parameter",
      "Illustrative time-window concept",
      "Not executed on any blockchain",
    ],
    color: "primary",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Result Exploration",
    description: "The session summary shows what a real implementation's output would look like. No funds are received — this is a conceptual walkthrough only.",
    details: [
      "Multiple destination address support",
      "Percentage-based split configuration",
      "All data is simulated — demo only",
    ],
    color: "success",
  },
];

export default function HowItWorks() {
  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 relative">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            How the <span className="gradient-text">simulator</span> works
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            A conceptual walkthrough of the address dissociation prototype in 4 steps
          </p>
        </div>
      </section>

      {/* Flow Diagram */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {flowSteps.map((step, index) => (
              <div key={step.step} className="relative">
                {/* Step Card */}
               <div className="flex gap-6 md:gap-10 animate-fade-up" style={{ animationDelay: `${index * 150}ms` }}>
                  {/* Step Number */}
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 ${stepColorMap[step.color]?.bg ?? "bg-primary/10 border-2 border-primary/30"}`}>
                      <step.icon className={`h-8 w-8 ${stepColorMap[step.color]?.text ?? "text-primary"}`} />
                    </div>
                    {index < flowSteps.length - 1 && (
                      <div className="w-0.5 h-full bg-gradient-to-b from-primary/50 to-transparent min-h-[120px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-16">
                    <div className="glass-card p-6 md:p-8 hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm font-mono text-primary">{step.step}</span>
                        <h3 className="text-xl md:text-2xl font-heading font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {step.description}
                      </p>
                      <ul className="space-y-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Diagram */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-12">
              Conceptual <span className="gradient-text">diagram</span>
            </h2>

            <div className="glass-card p-8 md:p-12">
              {/* Visual Flow */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Input */}
                <div className="text-center">
                  <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                    <Wallet className="h-10 w-10 text-foreground" />
                  </div>
                  <p className="font-heading font-semibold">Your Wallet</p>
                  <p className="text-sm text-muted-foreground">Origin</p>
                </div>

                <ArrowRight className="h-8 w-8 text-primary hidden md:block flow-arrow" />
                <ArrowDown className="h-8 w-8 text-primary md:hidden" />

                {/* Pool */}
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4 relative">
                    <div className="absolute inset-2 rounded-full border-2 border-dashed border-primary/30 animate-spin" style={{ animationDuration: "20s" }} />
                    <Shuffle className="h-12 w-12 text-primary" />
                  </div>
                  <p className="font-heading font-semibold">Liquidity Pool</p>
                  <p className="text-sm text-muted-foreground">Dissociation</p>
                </div>

                <ArrowRight className="h-8 w-8 text-primary hidden md:block flow-arrow" />
                <ArrowDown className="h-8 w-8 text-primary md:hidden" />

                {/* Output */}
                <div className="text-center">
                  <div className="flex gap-2 justify-center mb-4">
                    <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                  </div>
                  <p className="font-heading font-semibold">Destinations</p>
                  <p className="text-sm text-muted-foreground">Multiple outputs</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Ready to explore?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Try the conceptual simulator — no real funds required
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/mixing">
                Try Simulator
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/fees">View Fees</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
