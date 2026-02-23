import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube, MessageCircle, Radio } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { name: "Features", href: "/features" },
      { name: "Pricing", href: "/pricing" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Start Free Trial", href: "/signup" },
    ],
  },
  solutions: {
    title: "Solutions",
    links: [
      { name: "Churches", href: "/solutions/churches" },
      { name: "Contact Sales", href: "/contact" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { name: "Help Center", href: "/contact" },
      { name: "Getting Started", href: "/how-it-works" },
      { name: "Contact Us", href: "/contact" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Contact", href: "/contact" },
    ],
  },
};

const socialLinks = [
  { name: "Facebook", icon: Facebook, href: "https://facebook.com/volantislive" },
  { name: "Twitter", icon: Twitter, href: "https://twitter.com/volantislive" },
  { name: "Instagram", icon: Instagram, href: "https://instagram.com/volantislive" },
  { name: "Youtube", icon: Youtube, href: "https://youtube.com/volantislive" },
  { name: "WhatsApp", icon: MessageCircle, href: "https://wa.me/2348000000000" },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer */}
      <div className="container-custom py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Volantis<span className="text-sky-500">live</span>
              </span>
            </Link>
            <p className="text-slate-400 mb-6 max-w-sm">
              Live audio streaming built for Africa. Reach your audience anywhere, 
              even on slow connections.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-sky-600 hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">{footerLinks.product.title}</h3>
            <ul className="space-y-3">
              {footerLinks.product.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="400 hover:text-whitetext-slate- transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="font-semibold mb-4">{footerLinks.solutions.title}</h3>
            <ul className="space-y-3">
              {footerLinks.solutions.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">{footerLinks.resources.title}</h3>
            <ul className="space-y-3">
              {footerLinks.resources.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">{footerLinks.company.title}</h3>
            <ul className="space-y-3">
              {footerLinks.company.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Volantislive. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span>🇳🇬 Nigeria</span>
              <span>•</span>
              <span>English</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
