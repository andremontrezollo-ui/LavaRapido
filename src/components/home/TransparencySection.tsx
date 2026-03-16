import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";

const transparencyItems = [
  {
    icon: CheckCircle2,
    title: "What this simulator does",
    items: [
      "Illustrates the concept of input/output dissociation",
      "Generates mock testnet addresses (not valid on mainnet)",
      "Demonstrates configurable time-delay parameters",
      "Shows how multi-output fragmentation could look",
    ],
    variant: "positive" as const,
  },
  {
    icon: XCircle,
    title: "What this simulator does NOT do",
    items: [
      "Does not move, hold, or mix real Bitcoin",
      "Does not connect to any real blockchain",
      "Does not guarantee anonymity of any kind",
      "Is not a financial service — for education only",
    ],
    variant: "negative" as const,
  },
];

const warnings = [
  {
    icon: AlertTriangle,
    text: "This is an educational prototype. No real transactions are executed. Addresses shown are testnet mocks.",
  },
  {
    icon: Info,
    text: "Do not send real Bitcoin to any address displayed here. This simulator has no real blockchain connectivity.",
  },
];

export function TransparencySection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />

      <div className="container relative mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Full <span className="gradient-text">transparency</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            This is a demo prototype. You should understand exactly what it does — and what it doesn't.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {transparencyItems.map((item) => (
            <div
              key={item.title}
              className={`glass-card p-8 ${
                item.variant === "positive" ? "border-primary/20" : "border-destructive/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <item.icon
                  className={`h-6 w-6 ${
                    item.variant === "positive" ? "text-primary" : "text-destructive"
                  }`}
                />
                <h3 className="font-heading font-semibold text-xl">{item.title}</h3>
              </div>
              <ul className="space-y-3">
                {item.items.map((text) => (
                  <li key={text} className="flex items-start gap-3 text-muted-foreground">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-2 ${
                        item.variant === "positive" ? "bg-primary" : "bg-destructive"
                      }`}
                    />
                    <span className="">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Warnings */}
        <div className="max-w-3xl mx-auto space-y-4">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-warning/5 border border-warning/20"
            >
              <warning.icon className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{warning.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
