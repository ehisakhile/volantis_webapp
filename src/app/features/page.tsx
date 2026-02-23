import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import Link from "next/link";
import { Radio, Zap, Users, Clock, BarChart3, Share2, Lock, MessageCircle, Calendar, Play, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Features - Volantislive",
  description: "Discover all the features that make Volantislive the best live audio streaming platform for Africa.",
};

const features = [
  {
    icon: Radio,
    title: "Live Streaming",
    description: "Broadcast in real-time to your audience from any browser.",
    href: "#live-streaming",
    category: "Broadcasting",
  },
  {
    icon: Zap,
    title: "Low Data Mode",
    description: "Works on 32kbps — less than a WhatsApp voice call.",
    href: "#low-data-mode",
    category: "Connectivity",
  },
  {
    icon: Users,
    title: "Channel Pages",
    description: "Your own streaming hub. Share one link with everyone.",
    href: "#channel-pages",
    category: "Presence",
  },
  {
    icon: Clock,
    title: "Replay Archive",
    description: "Every broadcast saved automatically. Replay anytime.",
    href: "#replay-archive",
    category: "Content",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "See exactly who's listening and when.",
    href: "#analytics",
    category: "Insights",
  },
  {
    icon: Share2,
    title: "Stream Links",
    description: "Shareable URLs that work everywhere.",
    href: "#stream-links",
    category: "Sharing",
  },
  {
    icon: Lock,
    title: "Private Streams",
    description: "Password-protected broadcasts for your inner circle.",
    href: "#private-streams",
    category: "Security",
  },
  {
    icon: MessageCircle,
    title: "Listener Chat",
    description: "Your listeners can pray, react, and interact live.",
    href: "#listener-chat",
    category: "Engagement",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    description: "Schedule your streams. Your audience knows when to tune in.",
    href: "#scheduling",
    category: "Automation",
  },
  {
    icon: Play,
    title: "Embeddable Player",
    description: "Add 'Listen Live' to your website in 2 minutes.",
    href: "#embeddable-player",
    category: "Integration",
  },
];

const categories = [...new Set(features.map(f => f.category))];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      
      <main className="pt-24 md:pt-32">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50 to-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4">
                Everything you need to go live
              </h1>
              <p className="text-lg text-navy-600 mb-8">
                Powerful features designed specifically for African conditions. 
                Stream to your audience wherever they are.
              </p>
            </div>
          </Container>
        </section>

        {/* Features Grid */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Link
                  key={index}
                  href={feature.href}
                  className="group bg-white rounded-xl p-6 border border-navy-100 hover:shadow-lg hover:border-sky-200 transition-all"
                >
                  <div className="flex items-center gap-2 text-sm text-sky-600 mb-3">
                    <span className="bg-sky-100 px-2 py-1 rounded">{feature.category}</span>
                  </div>
                  <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-sky-600 transition-colors">
                    <feature.icon className="w-6 h-6 text-sky-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">{feature.title}</h3>
                  <p className="text-navy-600 mb-4">{feature.description}</p>
                  <span className="text-sky-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="py-16 bg-navy-900">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to start streaming?
              </h2>
              <p className="text-navy-300 mb-8">
                Get started with Volantislive today. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup" className="inline-flex items-center justify-center px-6 py-3 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors">
                  Start Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center justify-center px-6 py-3 border-2 border-navy-600 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors">
                  View Pricing
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
