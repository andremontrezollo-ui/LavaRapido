import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Shield,
    title: "Configure",
    description: "Set up simulated destination addresses and delay parameters",
  },
  {
    icon: Shuffle,
    title: "Simulate",
    description: "A mock session is created demonstrating the dissociation concept",
  },
  {
    icon: Clock,
    title: "Explore",
    description: "Inspect the simulated result and prototype flow",
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/10 via-transparent to-transparent" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float animation-delay-300" />

      <div className="container relative mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Demo badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20 text-warning text-sm font-medium mb-4 animate-fade-up">
            <Shield className="h-4 w-4" />
            <span>Educational simulator — no real funds</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-up">
            <Shield className="h-4 w-4" />
            <span>Conceptual prototype of Bitcoin transaction privacy</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold mb-6 animate-fade-up animation-delay-100">
            Privacy concept{" "}
            <span className="gradient-text">simulator</span>
            <br />
            for Bitcoin transactions
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up animation-delay-200">
            An educational prototype that illustrates how address dissociation could work —
            for learning and conceptual exploration only. No real transactions are performed.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center mb-16 animate-fade-up animation-delay-300">
            <Button variant="hero" size="xl" asChild>
              <Link to="/mixing">
                Try the simulator
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* 3 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up animation-delay-400">
            {steps.map((step, index) => (
              <div key={step.title} className="relative group">
                <div className="glass-card p-6 text-center hover:border-primary/30 transition-all duration-300">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ArrowRight className="h-5 w-5 text-primary/50 flow-arrow" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
