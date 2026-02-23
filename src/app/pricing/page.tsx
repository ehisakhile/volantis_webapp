import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/ui/cta-section";
import Link from "next/link";
import { Check, X, MessageCircle, Zap } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing - Volantislive",
  description: "Simple, transparent pricing in Nigerian Naira. Start free, upgrade when you're ready.",
};

const plans = [
  {
    name: "Starter",
    description: "Perfect for getting started",
    price: 0,
    priceDisplay: "Free",
    period: "forever",
    cta: "Start Free",
    href: "/signup",
    popular: false,
    features: [
      { name: "2 hours broadcast/month", included: true },
      { name: "50 concurrent listeners", included: true },
      { name: "Basic analytics", included: true },
      { name: "Volantislive subdomain", included: true },
      { name: "Replay archive (7 days)", included: true },
      { name: "Email support", included: true },
      { name: "Custom channel page", included: false },
      { name: "Embeddable player", included: false },
      { name: "Private streams", included: false },
      { name: "Priority support", included: false },
    ],
  },
  {
    name: "Church",
    description: "For growing congregations",
    price: 15000,
    priceDisplay: formatNaira(15000),
    period: "month",
    cta: "Start Free Trial",
    href: "/signup?plan=church",
    popular: true,
    features: [
      { name: "Unlimited broadcast hours", included: true },
      { name: "500 concurrent listeners", included: true },
      { name: "Full analytics", included: true },
      { name: "Custom channel page", included: true },
      { name: "Replay archive (30 days)", included: true },
      { name: "Embeddable player", included: true },
      { name: "Email support", included: true },
      { name: "Private streams", included: false },
      { name: "Priority support", included: false },
      { name: "Custom domain", included: false },
    ],
  },
  {
    name: "Ministry",
    description: "For large organizations",
    price: 45000,
    priceDisplay: formatNaira(45000),
    period: "month",
    cta: "Contact Sales",
    href: "/contact?plan=ministry",
    popular: false,
    features: [
      { name: "Unlimited broadcast hours", included: true },
      { name: "2,000+ concurrent listeners", included: true },
      { name: "Full analytics", included: true },
      { name: "Custom channel page", included: true },
      { name: "Replay archive (90 days)", included: true },
      { name: "Embeddable player", included: true },
      { name: "Private streams", included: true },
      { name: "Priority support (WhatsApp)", included: true },
      { name: "Custom stream domain", included: true },
      { name: "Remove Volantislive branding", included: true },
    ],
  },
];

const annualPlans = [
  {
    name: "Starter",
    price: 0,
    savings: null,
  },
  {
    name: "Church",
    price: 150000,
    savings: "2 months free (17% off)",
  },
  {
    name: "Ministry",
    price: 450000,
    savings: "2 months free (17% off)",
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
              
              {/* Annual Toggle Info */}
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4" />
                Pay annually, save 2 months — like getting 12 months for the price of 10
              </div>
            </div>
          </Container>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <Container>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl p-8 ${
                    plan.popular
                      ? "ring-2 ring-sky-500 shadow-xl scale-105 z-10"
                      : "border border-navy-200 shadow-sm"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-navy-900 mb-2">{plan.name}</h3>
                    <p className="text-navy-500 text-sm">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-navy-900">
                        {plan.priceDisplay}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-navy-500">/{plan.period}</span>
                      )}
                    </div>
                    {plan.price > 0 && (
                      <p className="text-sm text-navy-500 mt-2">
                        ≈ ${Math.round(plan.price / 1500)} USD
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

                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-navy-300 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            feature.included ? "text-navy-700" : "text-navy-400"
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Annual Pricing */}
        <section className="py-16 bg-navy-50">
          <Container>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-2">
                Annual Plans
              </h2>
              <p className="text-navy-600">
                Pay for 10 months, stream for 12. Save 17% with annual billing.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {annualPlans.map((plan, index) => (
                <div
                  key={plan.name}
                  className="bg-white rounded-xl p-6 border border-navy-200"
                >
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-bold text-navy-900">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-navy-900">
                          {formatNaira(plan.price)}
                        </span>
                        <span className="text-navy-500">/year</span>
                      </>
                    )}
                  </div>
                  {plan.savings && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {plan.savings}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Trust Signals */}
        <section className="py-16">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-navy-900 mb-8">
                Everything you need to know
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-6 text-left">
                {[
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes! There are no contracts or lock-in periods. Cancel anytime from your dashboard.",
                  },
                  {
                    q: "Is there a free trial?",
                    a: "Yes, the Church plan comes with a 60-day free trial. No credit card required to start.",
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
                    a: "Absolutely! Upgrade or downgrade your plan at any time from your dashboard.",
                  },
                  {
                    q: "Do you offer discounts for registered ministries?",
                    a: "Yes, contact us for special pricing for registered churches and ministries.",
                  },
                ].map((faq, index) => (
                  <div key={index} className="bg-navy-50 rounded-lg p-4">
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
          description="Our team is here to help you choose the right plan for your church or ministry."
          primaryCTA={{
            text: "Talk to Sales",
            href: "/contact",
          }}
          secondaryCTA={
            {
              text: "Start Free",
              href: "/signup",
            }
          }
          trustSignals={[
            "60-day free trial on Church plan",
            "No credit card required",
            "30-day money-back guarantee",
            "WhatsApp support available",
          ]}
        />
      </main>

      <Footer />
    </>
  );
}
