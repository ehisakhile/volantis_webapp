import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageCircle, Mail, Phone, MapPin, Clock, Send, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us - Volantislive",
  description: "Get in touch with the Volantislive team. We're here to help.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      
      <main className="pt-24 md:pt-32">
        {/* Header */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-sky-50 to-white">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4">
                Get in touch
              </h1>
              <p className="text-lg text-navy-600">
                Have questions? We'd love to hear from you. Our team is ready to help you get started.
              </p>
            </div>
          </Container>
        </section>

        {/* Contact Options */}
        <section className="py-16">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {/* WhatsApp */}
              <div className="bg-white rounded-xl p-6 border border-navy-100 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">WhatsApp</h3>
                <p className="text-navy-600 text-sm mb-4">
                  Quickest way to reach us
                </p>
                <a
                  href="https://wa.me/2348000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-600 font-medium hover:underline"
                >
                  Chat on WhatsApp
                </a>
              </div>

              {/* Email */}
              <div className="bg-white rounded-xl p-6 border border-navy-100 text-center">
                <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-sky-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">Email</h3>
                <p className="text-navy-600 text-sm mb-4">
                  For detailed inquiries
                </p>
                <a
                  href="mailto:hello@volantislive.com"
                  className="inline-flex items-center gap-2 text-sky-600 font-medium hover:underline"
                >
                  hello@volantislive.com
                </a>
              </div>

              {/* Phone */}
              <div className="bg-white rounded-xl p-6 border border-navy-100 text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">Phone</h3>
                <p className="text-navy-600 text-sm mb-4">
                  Mon-Fri, 9am-6pm WAT
                </p>
                <a
                  href="tel:+2348000000000"
                  className="inline-flex items-center gap-2 text-purple-600 font-medium hover:underline"
                >
                  +234 800 000 0000
                </a>
              </div>

              {/* Office */}
              <div className="bg-white rounded-xl p-6 border border-navy-100 text-center">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="font-semibold text-navy-900 mb-2">Office</h3>
                <p className="text-navy-600 text-sm mb-4">
                  Lagos, Nigeria
                </p>
                <span className="text-orange-600 font-medium">
                  Visit by appointment
                </span>
              </div>
            </div>

            {/* Contact Form */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-8 border border-navy-100 shadow-sm">
                <h2 className="text-2xl font-bold text-navy-900 mb-6">
                  Send us a message
                </h2>

                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-navy-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-navy-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      placeholder="john@church.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-navy-700 mb-2">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      placeholder="+234 800 000 0000"
                    />
                  </div>

                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-navy-700 mb-2">
                      Church/Organization Name
                    </label>
                    <input
                      type="text"
                      id="organization"
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                      placeholder="Grace Assembly Lagos"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-navy-700 mb-2">
                      How can we help?
                    </label>
                    <select
                      id="subject"
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select a topic</option>
                      <option value="sales">Sales Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-navy-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      className="w-full px-4 py-3 rounded-lg border border-navy-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none"
                      placeholder="Tell us more about what you need..."
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Send Message
                    <Send className="ml-2 w-5 h-5" />
                  </Button>
                </form>
              </div>
            </div>
          </Container>
        </section>

        {/* Office Hours */}
        <section className="py-16 bg-navy-50">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-navy-900 mb-4">
                Office Hours
              </h2>
              <div className="flex items-center justify-center gap-2 text-navy-600">
                <Clock className="w-5 h-5" />
                <span>Monday - Friday: 9:00 AM - 6:00 PM (West Africa Time)</span>
              </div>
              <p className="text-navy-500 mt-4">
                We typically respond to all inquiries within 24 hours.
              </p>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}
