import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Calculator, Info, Percent, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { SERVICE_CONFIG } from "@/lib/constants";

const MAX_BTC_AMOUNT = 21; // Max reasonable amount for calculator

export default function Fees() {
  const [inputAmount, setInputAmount] = useState("0.1");
  const [delay, setDelay] = useState<number[]>([SERVICE_CONFIG.defaultDelay]);
  
  const rawAmount = parseFloat(inputAmount) || 0;
  const amount = Math.max(0, Math.min(rawAmount, MAX_BTC_AMOUNT));
  
  const serviceFeeAmount = amount * SERVICE_CONFIG.serviceFeePercentage;
  const totalFees = serviceFeeAmount + SERVICE_CONFIG.networkFeeEstimate;
  const outputAmount = Math.max(0, amount - totalFees);

  const handleAmountChange = (value: string) => {
    // Block non-numeric except dots
    const cleaned = value.replace(/[^0-9.]/g, "");
    // Prevent multiple dots
    const parts = cleaned.split(".");
    const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
    setInputAmount(sanitized);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 relative">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            Transparent <span className="gradient-text">fees</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden costs. See exactly how much you'll pay before starting.
          </p>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {/* Service Fee */}
              <div className="glass-card p-8">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Percent className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-xl mb-2">Service Fee</h3>
                <p className="text-3xl font-heading font-bold gradient-text mb-4">1.5%</p>
                <p className="text-muted-foreground text-sm">
                  Fixed fee on the total operation value. Applied once, 
                  regardless of the number of destination addresses.
                </p>
              </div>

              {/* Network Fee */}
              <div className="glass-card p-8">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                  <Zap className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-xl mb-2">Network Fee</h3>
                <p className="text-3xl font-heading font-bold text-accent mb-4">Variable</p>
                <p className="text-muted-foreground text-sm">
                  Bitcoin blockchain transaction cost. Varies according to 
                  network congestion. Real-time updated estimate.
                </p>
              </div>
            </div>

            {/* Calculator */}
            <div className="glass-card p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8">
                <Calculator className="h-6 w-6 text-primary" />
                <h2 className="font-heading font-semibold text-2xl">Fee Calculator</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Input */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-muted-foreground mb-2 block">
                      Amount to send (BTC)
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={inputAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.001"
                      className="text-lg font-mono"
                    />
                    {rawAmount > MAX_BTC_AMOUNT && (
                      <p className="text-xs text-warning mt-1">Max: {MAX_BTC_AMOUNT} BTC</p>
                    )}
                    {rawAmount < 0 && (
                      <p className="text-xs text-destructive mt-1">Amount cannot be negative</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-muted-foreground mb-2 block">
                      Delay: {delay[0]} {delay[0] === 1 ? "hour" : "hours"}
                    </Label>
                    <Slider
                      value={delay}
                      onValueChange={setDelay}
                      min={SERVICE_CONFIG.minDelay}
                      max={SERVICE_CONFIG.maxDelay}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Delay does not affect fees
                    </p>
                  </div>
                </div>

                {/* Output */}
                <div className="p-6 rounded-xl bg-secondary/50 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <span className="text-muted-foreground">Input value</span>
                    <span className="font-mono font-semibold">{amount.toFixed(8)} BTC</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Service fee ({(SERVICE_CONFIG.serviceFeePercentage * 100).toFixed(1)}%)</span>
                    <span className="font-mono text-destructive">
                      -{serviceFeeAmount.toFixed(8)} BTC
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Network fee (est.)</span>
                    <span className="font-mono text-destructive">
                      -{SERVICE_CONFIG.networkFeeEstimate.toFixed(8)} BTC
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-border/50">
                    <span className="font-semibold">Output value</span>
                    <span className="font-mono font-bold text-lg text-primary">
                      {outputAmount.toFixed(8)} BTC
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Output values are estimates. The actual network fee may vary 
                  depending on the mempool state at the time of the transaction.
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-12 text-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/mixing">
                  Start Mixing
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-heading font-bold text-center mb-12">
              Questions about fees
            </h2>

            <div className="space-y-6">
              {[
                {
                  q: "Why is the service fee fixed at 1.5%?",
                  a: "We maintain a fixed fee to ensure predictability. This covers the operational costs of the liquidity pool and infrastructure.",
                },
                {
                  q: "Does the fee change with the number of destinations?",
                  a: "No. The service fee is the same whether you use 1 or 5 destination addresses. The network fee may increase marginally per additional transaction.",
                },
                {
                  q: "Can I pay less by waiting longer?",
                  a: "The delay does not affect the fees charged. However, Bitcoin network fees vary throughout the day - periods of lower congestion may result in lower costs.",
                },
              ].map((item, index) => (
                <div key={index} className="glass-card p-6">
                  <h3 className="font-heading font-semibold mb-2">{item.q}</h3>
                  <p className="text-muted-foreground text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
