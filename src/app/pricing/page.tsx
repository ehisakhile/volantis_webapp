import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/ui/cta-section";
import Link from "next/link";
import { Check, X, Zap } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing - Volantislive",
  description:
    "Simple, transparent pricing in Nigerian Naira. Start free, upgrade when you're ready.",
};

// Prices sourced from API (kobo ÷ 100 = Naira)
// Free:       ₦0 / month,      ₦0 / year
// Starter:    ₦15,000 / month, ₦150,000 / year
// Pro:        ₦60,000 / month, ₦600,000 / year
// Enterprise: ₦150,000 / month, ₦1,500,000 / year

const plans = [
  {
    name: "Free",
    description: "For personal use and exploration",
    monthlyPrice: 0,
    annualPrice: 0,
    priceDisplay: "Free",
    annualPriceDisplay: "Free",
    period: "forever",
    cta: "Get Started",
    href: "/signup",
    popular: false,
    features: [
      { name: "1 hour stream/day", included: true },
      { name: "10 uploads/month", included: true },
      { name: "Basic analytics", included: true },
      { name: "Volantislive subdomain", included: true },
      { name: "No integrations", included: false },
      { name: "Custom channel page", included: false },
      { name: "Embeddable player", included: false },
      { name: "Priority support", included: false },
    ],
  },
  {
    name: "Starter",
    description: "For small teams and growing communities",
    monthlyPrice: 15000,
    annualPrice: 150000,
    priceDisplay: formatNaira(15000),
    annualPriceDisplay: formatNaira(150000),
    period: "month",
    cta: "Start Free Trial",
    href: "/signup?plan=starter",
    popular: false,
    features: [
      { name: "5 hours stream/day", included: true },
      { name: "150 uploads/month", included: true },
      { name: "Full analytics", included: true },
      { name: "1 integration", included: true },
      { name: "Custom channel page", included: true },
      { name: "Embeddable player", included: true },
      { name: "Email support", included: true },
      { name: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    description: "For professional broadcasters and organisations",
    monthlyPrice: 60000,
    annualPrice: 600000,
    priceDisplay: formatNaira(60000),
    annualPriceDisplay: formatNaira(600000),
    period: "month",
    cta: "Start Free Trial",
    href: "/signup?plan=pro",
    popular: true,
    features: [
      { name: "10 hours stream/day", included: true },
      { name: "Unlimited uploads", included: true },
      { name: "Full analytics", included: true },
      { name: "1 integration", included: true },
      { name: "Custom channel page", included: true },
      { name: "Embeddable player", included: true },
      { name: "Email support", included: true },
      { name: "Priority support", included: false },
    ],
  },
  {
    name: "Enterprise",
    description: "For large organisations with maximum scale",
    monthlyPrice: 150000,
    annualPrice: 1500000,
    priceDisplay: formatNaira(150000),
    annualPriceDisplay: formatNaira(1500000),
    period: "month",
    cta: "Contact Sales",
    href: "/contact?plan=enterprise",
    popular: false,
    features: [
      { name: "24 hours stream/day", included: true },
      { name: "Unlimited uploads", included: true },
      { name: "Full analytics", included: true },
      { name: "1 integration", included: true },
      { name: "Custom channel page", included: true },
      { name: "Embeddable player", included: true },
      { name: "Priority support (WhatsApp)", included: true },
      { name: "Remove Volantislive branding", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 md:pt-32">
        {/* Header */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50 to-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4">
                Simple, transparent pricing
              </h1>
              <p className="text-lg text-navy-600 mb-8">
                All prices in Nigerian Naira. No hidden fees. Cancel anytime.
              </p>

              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                Pay annually and get 2 months free — 17% savings
              </div>
            </div>
          </Container>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                    plan.popular
                      ? "ring-2 ring-sky-500 shadow-xl"
                      : "border border-navy-200 shadow-sm"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-4 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-navy-900 mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-navy-500 text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-navy-900">
                        {plan.priceDisplay}
                      </span>
                      {plan.monthlyPrice > 0 && (
                        <span className="text-navy-500 text-sm">
                          /{plan.period}
                        </span>
                      )}
                    </div>
                    {plan.monthlyPrice > 0 && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        {plan.annualPriceDisplay}/yr — save 2 months
                      </p>
                    )}
                  </div>

                  <Link href={plan.href} className="block mb-6">
                    <Button
                      variant={plan.popular ? "primary" : "outline"}
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  <ul className="space-y-2.5 mt-auto">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-navy-300 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.included
                              ? "text-navy-700"
                              : "text-navy-400"
                          }`}
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Integration add-on note */}
            <p className="text-center text-sm text-navy-500 mt-8">
              Need more integrations? Add extra integrations for{" "}
              <span className="font-medium text-navy-700">
                {formatNaira(5000)}/integration/month
              </span>
              .
            </p>
          </Container>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-navy-50">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-navy-900 mb-8">
                Everything you need to know
              </h2>

              <div className="grid sm:grid-cols-2 gap-6 text-left">
                {[
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes. No contracts or lock-in periods. Cancel anytime from your dashboard.",
                  },
                  {
                    q: "Is there a free trial?",
                    a: "Yes, paid plans come with a free trial. No credit card required to start.",
                  },
                  {
                    q: "What payment methods do you accept?",
                    a: "We accept bank transfers, Paystack, Flutterwave, and credit/debit cards.",
                  },
                  {
                    q: "Do you offer refunds?",
                    a: "Yes, we offer a 30-day money-back guarantee if you're not satisfied.",
                  },
                  {
                    q: "Can I change plans later?",
                    a: "Absolutely. Upgrade or downgrade at any time from your dashboard.",
                  },
                  {
                    q: "Do you offer discounts for registered ministries?",
                    a: "Yes, contact us for special pricing for registered churches and ministries.",
                  },
                ].map((faq, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-navy-100">
                    <h3 className="font-semibold text-navy-900 mb-2">{faq.q}</h3>
                    <p className="text-navy-600 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <CTASection
          title="Still have questions?"
          description="Our team is here to help you choose the right plan for your needs."
          primaryCTA={{
            text: "Talk to Sales",
            href: "/contact",
          }}
          secondaryCTA={{
            text: "Start Free",
            href: "/signup",
          }}
          trustSignals={[
            "Free plan available — no credit card needed",
            "30-day money-back guarantee",
            "Cancel anytime",
            "WhatsApp support on Enterprise",
          ]}
        />
      </main>

      <Footer />
    </>
  );
}