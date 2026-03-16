import { Layout } from "@/components/layout/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, HelpCircle } from "lucide-react";

const faqCategories = [
  {
    title: "General — About the Simulator",
    items: [
      {
        question: "What is this application?",
        answer:
          "This is an educational prototype / conceptual simulator that illustrates how Bitcoin address dissociation could work in theory. It does not perform real transactions, does not connect to any blockchain, and does not move funds. It exists purely for learning and exploration.",
      },
      {
        question: "Are any real funds used during the demonstration?",
        answer:
          "No. All addresses shown are mock testnet addresses and are not valid on Bitcoin mainnet. No real BTC is involved at any point. Do not send real funds to any address displayed here.",
      },
      {
        question: "Do I need to register to use the simulator?",
        answer:
          "No. The simulator requires no registration, email, or personal information. You configure a simulated session and explore the conceptual flow.",
      },
      {
        question: "What is the minimum amount for a simulation?",
        answer:
          "There is no minimum — no real funds are used. The amount fields are illustrative only, designed to show how a real implementation might look.",
      },
    ],
  },
  {
    title: "Simulation Flow",
    items: [
      {
        question: "What happens when I confirm a session?",
        answer:
          "A simulated session record is created in the backend with a mock testnet deposit address and a 30-minute TTL. This demonstrates the session lifecycle concept. No real blockchain interaction occurs.",
      },
      {
        question: "Why are there configurable delays?",
        answer:
          "The delay parameter illustrates how temporal dissociation could be applied between an input and output in a real implementation. In this simulator, it is stored as metadata only.",
      },
      {
        question: "What happens after the session expires?",
        answer:
          "The session is marked as expired and cleaned up automatically. Demo data is deleted within 24 hours as part of the data minimisation policy.",
      },
    ],
  },
  {
    title: "Limitations and Scope",
    items: [
      {
        question: "Does this simulator provide any real privacy?",
        answer:
          "No. This is a conceptual prototype only. No mixing, obfuscation, or on-chain privacy is implemented or implied. The simulator does not interact with any real Bitcoin network.",
      },
      {
        question: "Can I use this for real Bitcoin privacy purposes?",
        answer:
          "No. This is strictly an educational demo. It has no production-grade privacy guarantees and should never be used for real financial operations.",
      },
      {
        question: "What data is stored?",
        answer:
          "Only minimal session metadata is stored: a mock deposit address, session status, creation/expiry timestamps, and a pseudonymised IP hash for rate limiting. All data is automatically deleted within 24 hours.",
      },
      {
        question: "Are real destination addresses stored?",
        answer:
          "The addresses entered in the simulator UI are for demonstration only. The backend currently stores only the simulated deposit address; destination address configuration is a UI-only feature in this demo.",
      },
    ],
  },
  {
    title: "Safe Usage",
    items: [
      {
        question: "What should I keep in mind while exploring?",
        answer:
          "Remember that this is purely educational. No real privacy is provided, no real funds are involved, and the addresses shown are testnet mocks. Treat this as a learning tool, not a financial service.",
      },
      {
        question: "Can multiple destination addresses be configured?",
        answer:
          "Yes, the UI supports up to 5 simulated destination addresses with custom percentage splits — demonstrating what a multi-output configuration would look like.",
      },
      {
        question: "Where can I learn more about Bitcoin privacy?",
        answer:
          "For real Bitcoin privacy research, refer to academic literature on CoinJoin, PayJoin, and Lightning Network. This simulator is not affiliated with any of those technologies.",
      },
    ],
  },
];

export default function FAQ() {
  return (
    <Layout>
      {/* Hero */}
      <section className="pt-32 pb-16 relative">
        <div className="absolute inset-0 bg-gradient-dark" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <HelpCircle className="h-4 w-4" />
            <span>Frequently Asked Questions</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            FAQ
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Answers to the most common questions about this educational simulator
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {faqCategories.map((category, categoryIndex) => (
              <div key={category.title} className="mb-12">
                <h2 className="text-xl font-heading font-semibold mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {categoryIndex + 1}
                  </span>
                  {category.title}
                </h2>

                <Accordion type="single" collapsible className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <AccordionItem
                      key={itemIndex}
                      value={`${categoryIndex}-${itemIndex}`}
                      className="glass-card border-none px-6"
                    >
                      <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-primary py-5">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Didn't find your answer?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Get in touch through our anonymous form
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/contact">
                Contact Us
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/mixing">Try Simulator</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
