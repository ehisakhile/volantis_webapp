import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CTASection } from "@/components/ui/cta-section";
import Link from "next/link";
import { Church, Users, Radio, Clock, Share2, BarChart3, Zap, Shield, ArrowRight, CheckCircle, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Streaming for Churches - Volantislive",
  description: "Stream your church services live to your congregation. Works on any connection across Nigeria.",
};

const features = [
  {
    icon: Radio,
    title: "Live Broadcast",
    description: "Go live in seconds from any browser. No technical setup required.",
  },
  {
    icon: Zap,
    title: "Low Data Mode",
    description: "Your members listen on just 1MB per minute — works on 2G networks.",
  },
  {
    icon: Clock,
    title: "Auto Replay",
    description: "Every service saved automatically. Members can catch up anytime.",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share your stream link on WhatsApp, social media, or your website.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "See who's listening and when. Understand your online congregation.",
  },
  {
    icon: Users,
    title: "Channel Pages",
    description: "Your own streaming hub. One link for everything.",
  },
];

const churchBenefits = [
  "Works on DSTV-grade connections",
  "Setup before Sunday takes 10 minutes",
  "Congregation listens from anywhere — phone, laptop, tablet",
  "Replay lets members who missed service catch up",
  "No ads on your stream",
  "WhatsApp support for quick help",
];

const testimonials = [
  {
    name: "Pastor Emmanuel Okonkwo",
    church: "Grace Assembly, Lagos",
    quote: "Our online congregation grew by 300% in 3 months. Volantislive helped us reach members who couldn't attend physically.",
    listeners: "847",
  },
  {
    name: "Rev. Sarah Johnson",
    church: "Faith Community Church, Abuja",
    quote: "The low data mode is a game-changer. Our members in rural areas can now listen without worrying about data.",
    listeners: "523",
  },
];

export default function ChurchesPage() {
  return (
    <>
      <Navbar />
      
      <main className="pt-24 md:pt-32">
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 to-white" />
          
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Church className="w-4 h-4" />
                  Built for Churches
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-6">
                  Never lose a congregant to a dropped connection again
                </h1>
                
                <p className="text-lg text-navy-600 mb-8">
                  Stream your Sunday services, midweek meetings, and special events live. 
                  Your congregation can listen from anywhere, even on slow connections.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto">
                      Start Streaming Your Services Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      View Pricing
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-6 text-sm text-navy-600">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    60-day free trial
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-6 shadow-2xl">
                  <div className="bg-navy-950 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-red-400 font-medium text-sm">LIVE</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
                          <Church className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Sunday Service</h4>
                          <p className="text-navy-400 text-xs">Grace Assembly Lagos</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-navy-900/50 rounded-lg p-3">
                        <span className="text-navy-400 text-sm">Listening now</span>
                        <span className="text-white font-bold">847</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Why Churches Choose */}
        <section className="py-16 md:py-24 bg-navy-50">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy-900 mb-4">
                Why churches choose Volantislive
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {churchBenefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 bg-white rounded-lg p-4">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-navy-700">{benefit}</span>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy-900 mb-4">
                Everything your church needs
              </h2>
              <p className="text-lg text-navy-600 max-w-2xl mx-auto">
                Powerful features designed specifically for church broadcasting.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-navy-900">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Trusted by churches across Nigeria
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-navy-800 rounded-xl p-6">
                  <p className="text-navy-200 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-navy-400 text-sm">{testimonial.church}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-sky-400">{testimonial.listeners}</p>
                      <p className="text-navy-400 text-sm">listeners</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <CTASection
          title="Ready to stream your services?"
          description="Join 500+ churches already reaching their congregation with Volantislive."
          primaryCTA={{
            text: "Start Free Trial",
            href: "/signup",
          }}
          secondaryCTA={{
            text: "Talk to Sales",
            href: "/contact",
          }}
          trustSignals={[
            "60-day free trial",
            "No credit card required",
            "Setup in 10 minutes",
            "WhatsApp support",
          ]}
          variant="sky"
        />
      </main>

      <Footer />
    </>
  );
}
