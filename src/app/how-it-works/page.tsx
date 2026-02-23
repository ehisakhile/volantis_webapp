import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/ui/cta-section";
import Link from "next/link";
import { Radio, UserPlus, Share2, Headphones, ArrowRight, CheckCircle, Play, Settings, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works - Volantislive",
  description: "Get started with Volantislive in 3 simple steps. Start streaming your content to the world.",
};

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description: "Sign up in seconds with just your email. No credit card required. Choose your church or organization name.",
    time: "2 minutes",
  },
  {
    number: "02",
    icon: Settings,
    title: "Set Up Your Stream",
    description: "Connect your microphone or audio source. Our browser-based broadcaster works with any setup — no downloads needed.",
    time: "5 minutes",
  },
  {
    number: "03",
    icon: Share2,
    title: "Share Your Link",
    description: "Get your unique streaming URL. Share it on WhatsApp, social media, or embed it on your church website.",
    time: "Instant",
  },
];

const features = [
  {
    icon: Radio,
    title: "Go Live Instantly",
    description: "Click one button to start streaming. No complex setup, no technical knowledge required.",
  },
  {
    icon: Headphones,
    title: "Low Data Mode",
    description: "Your listeners can tune in on just 32kbps — less than a WhatsApp voice call.",
  },
  {
    icon: BarChart3,
    title: "Track Your Audience",
    description: "See who's listening, when, and for how long with detailed analytics.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share your stream link anywhere — WhatsApp, social media, or your website.",
  },
];

const requirements = [
  {
    category: "For Broadcasters",
    items: [
      "Any modern browser (Chrome, Firefox, Safari)",
      "Microphone or audio source",
      "Stable internet connection (at least 128kbps)",
      "Computer or mobile device",
    ],
  },
  {
    category: "For Listeners",
    items: [
      "Any phone, tablet, or computer",
      "Internet connection (32kbps minimum)",
      "Works on 2G, 3G, 4G, and WiFi",
      "No app download needed",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      
      <main className="pt-24 md:pt-32">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50 to-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4">
                Get started in minutes
              </h1>
              <p className="text-lg text-navy-600 mb-8">
                Three simple steps to start streaming your content to the world. 
                No technical expertise needed.
              </p>
              
              <Link href="/signup">
                <Button size="lg">
                  Start Streaming Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </Container>
        </section>

        {/* Steps */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-navy-200 -z-10" />
                  )}
                  
                  <div className="bg-white rounded-2xl p-8 border border-navy-100 text-center">
                    <div className="text-6xl font-bold text-sky-100 mb-4">{step.number}</div>
                    <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <step.icon className="w-8 h-8 text-sky-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-navy-900 mb-3">{step.title}</h3>
                    <p className="text-navy-600 mb-4">{step.description}</p>
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {step.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Demo Video Placeholder */}
        <section className="py-16 bg-navy-900">
          <Container>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                See it in action
              </h2>
              <p className="text-navy-300">
                Watch how easy it is to start streaming
              </p>
            </div>

            <div className="max-w-4xl mx-auto bg-navy-800 rounded-2xl aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-sky-600 transition-colors">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
                <p className="text-white font-medium">Watch Demo Video</p>
              </div>
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy-900 mb-4">
                Everything you need to succeed
              </h2>
              <p className="text-lg text-navy-600 max-w-2xl mx-auto">
                Powerful features designed for African conditions and African users.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 border border-navy-100">
                  <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">{feature.title}</h3>
                  <p className="text-navy-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Requirements */}
        <section className="py-16 md:py-24 bg-navy-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy-900 mb-4">
                What you need to get started
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {requirements.map((req, index) => (
                <div key={index} className="bg-white rounded-xl p-8 border border-navy-100">
                  <h3 className="text-xl font-semibold text-navy-900 mb-4">{req.category}</h3>
                  <ul className="space-y-3">
                    {req.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-navy-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <CTASection
          title="Ready to start streaming?"
          description="Join 500+ churches already reaching their audience with Volantislive."
          primaryCTA={{
            text: "Start Free",
            href: "/signup",
          }}
          secondaryCTA={{
            text: "View Pricing",
            href: "/pricing",
          }}
          trustSignals={[
            "No credit card required",
            "Setup in 5 minutes",
            "Free plan available",
          ]}
          variant="sky"
        />
      </main>

      <Footer />
    </>
  );
}
