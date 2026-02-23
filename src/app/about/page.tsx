import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { CTASection } from "@/components/ui/cta-section";
import Link from "next/link";
import { Target, Heart, Zap, Users, Award, Globe, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us - Volantislive",
  description: "Learn about Volantislive - our mission to bring live audio streaming to Africa.",
};

const values = [
  {
    icon: Heart,
    title: "Built with Love",
    description: "We understand the challenges Africans face with connectivity. We built Volantislive because we care about connecting communities.",
  },
  {
    icon: Zap,
    title: "Innovation for Africa",
    description: "Our technology is designed specifically for African conditions. Low bandwidth, unreliable networks — we've got you covered.",
  },
  {
    icon: Users,
    title: "Community First",
    description: "We're not just building a product — we're building a movement. Every church, ministry, and creator matters to us.",
  },
  {
    icon: Globe,
    title: "Pan-African Vision",
    description: "We believe every voice matters. Our mission is to help spread messages across Africa and beyond.",
  },
];

const team = [
  {
    name: "CEO",
    role: "Chief Executive Officer",
    bio: "Visionary leader with 15+ years in tech and media.",
  },
  {
    name: "CTO",
    role: "Chief Technology Officer",
    bio: "Engineering expert specializing in streaming technology.",
  },
  {
    name: "COO",
    role: "Chief Operations Officer",
    bio: "Operations leader with deep understanding of African markets.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      
      <main className="pt-24 md:pt-32">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50 to-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4">
                Connecting communities through audio
              </h1>
              <p className="text-lg text-navy-600 mb-8">
                Volantislive was born from a simple belief: everyone deserves to share their message, 
                and everyone deserves to hear it — no matter where they are or how slow their connection.
              </p>
            </div>
          </Container>
        </section>

        {/* Story */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-navy-900 mb-6">
                  Our Story
                </h2>
                <div className="space-y-4 text-navy-600">
                  <p>
                    Volantislive started in 2023 when our founders saw a problem firsthand: 
                    churches and ministries across Nigeria were struggling to stream their services 
                    to members who couldn't attend physically.
                  </p>
                  <p>
                    Traditional video streaming platforms required too much bandwidth. 
                    Services would cut out mid-sermon. Listeners in rural areas couldn't participate 
                    at all because their connections were too slow.
                  </p>
                  <p>
                    We knew there had to be a better way. By focusing on audio-only streaming, 
                    we reduced bandwidth requirements by 90%. Now, a 2-hour church service uses 
                    less data than watching a 5-minute YouTube video.
                  </p>
                  <p>
                    Today, we're proud to serve 500+ churches and organizations across Nigeria, 
                    helping them reach thousands of listeners every week.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">500+</p>
                      <p className="text-navy-300">Churches streaming</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">50K+</p>
                      <p className="text-navy-300">Weekly listeners</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">99.5%</p>
                      <p className="text-navy-300">Uptime SLA</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 bg-navy-900">
          <Container>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-navy-800 rounded-xl p-8">
                <div className="w-12 h-12 bg-sky-500 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Our Mission</h3>
                <p className="text-navy-300">
                  To democratize live audio streaming in Africa, enabling churches, ministries, 
                  creators, and communities to share their message with the world — regardless 
                  of bandwidth limitations.
                </p>
              </div>
              <div className="bg-navy-800 rounded-xl p-8">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Our Vision</h3>
                <p className="text-navy-300">
                  To be the leading audio streaming platform in Africa, connecting millions 
                  of listeners to the content that matters to them — from church services to 
                  community radio to live events.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Values */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-navy-900 mb-4">
                Our Values
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div key={index} className="bg-white rounded-xl p-6 border border-navy-100">
                  <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">{value.title}</h3>
                  <p className="text-navy-600">{value.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <CTASection
          title="Join our mission"
          description="Ready to reach more people with your content? Start streaming today."
          primaryCTA={{
            text: "Get Started",
            href: "/signup",
          }}
          secondaryCTA={{
            text: "Contact Us",
            href: "/contact",
          }}
          trustSignals={[
            "500+ churches trust us",
            "99.5% uptime",
            "Nigerian-based support",
          ]}
          variant="sky"
        />
      </main>

      <Footer />
    </>
  );
}
