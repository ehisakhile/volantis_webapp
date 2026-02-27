"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Radio, User, LogOut, Settings, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const features = [
  { name: "Live Streaming", href: "/features", description: "Broadcast in real-time" },
  { name: "Low Data Mode", href: "/features", description: "Works on any connection" },
  { name: "Channel Pages", href: "/features", description: "Your streaming hub" },
  { name: "Replay Archive", href: "/features", description: "Never miss a broadcast" },
  { name: "Analytics", href: "/features", description: "Track your audience" },
  { name: "Embed Player", href: "/features", description: "Add to your site" },
];

const solutions = [
  { name: "Churches", href: "/solutions/churches", description: "For places of worship" },
  { name: "Ministries", href: "/contact", description: "Outreach & missions" },
  { name: "Community Radio", href: "/contact", description: "Online radio stations" },
  { name: "Events", href: "/contact", description: "Live event streaming" },
  { name: "Creators", href: "/contact", description: "Content creators" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [featuresOpen, setFeaturesOpen] = React.useState(false);
  const [solutionsOpen, setSolutionsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  React.useEffect(() => {
    setIsOpen(false);
    setFeaturesOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "Features", href: "/features", hasDropdown: true },
    { name: "Solutions", href: "/solutions/churches", hasDropdown: true },
    { name: "Listen", href: "/listen", isHighlighted: true },
    // { name: "Pricing", href: "/pricing" },
    { name: "How It Works", href: "/how-it-works" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <nav className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Volantislive"
              className="h-10 w-auto"
            />
                          <span className="text-lg font-bold text-slate-900">Volantis<span className="text-sky-500">live</span></span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <div key={link.name} className="relative">
                {link.hasDropdown ? (
                  <button
                    onClick={() => {
                      if (link.name === "Features") setFeaturesOpen(!featuresOpen);
                      if (link.name === "Solutions") setSolutionsOpen(!solutionsOpen);
                    }}
                    className="flex items-center gap-1 text-slate-600 hover:text-sky-600 font-medium transition-colors"
                  >
                    {link.name}
                    <ChevronDown className={cn("w-4 h-4 transition-transform", (link.name === "Features" && featuresOpen) || (link.name === "Solutions" && solutionsOpen) ? "rotate-180" : "")} />
                  </button>
                ) : (
                  <Link
                    href={link.href}
                    className={cn(
                      "font-medium transition-colors",
                      link.isHighlighted && "px-4 py-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 hover:text-white shadow-md shadow-sky-500/20",
                      !link.isHighlighted && (pathname === link.href
                        ? "text-sky-600"
                        : "text-slate-600 hover:text-sky-600")
                    )}
                  >
                    {link.isHighlighted && <Headphones className="w-4 h-4 inline-block mr-1.5" />}
                    {link.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-slate-600 hover:text-sky-600 font-medium transition-colors"
                >
                  <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-sky-600" />
                  </div>
                  <span className="max-w-[120px] truncate">{user.username || user.email}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", userMenuOpen ? "rotate-180" : "")} />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2"
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.username}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      {user.role === 'admin' || user.company_id ? (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Creator Dashboard
                        </Link>
                      ) : (
                        <Link
                          href="/user/dashboard"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          My Dashboard
                        </Link>
                      )}
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                          router.push('/');
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-sky-600 font-medium transition-colors">
                  Login
                </Link>
                <div className="relative group">
                  <Button size="sm">Start Free</Button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link
                      href="/signup"
                      className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600"
                    >
                      Start Streaming
                    </Link>
                    <Link
                      href="/signup/user"
                      className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-sky-600"
                    >
                      Join as Viewer
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-slate-600"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Features Dropdown */}
        <AnimatePresence>
          {featuresOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="hidden lg:block absolute top-full left-0 right-0 bg-white shadow-xl border-t border-slate-100 py-8"
            >
              <div className="container-custom">
                <div className="grid grid-cols-3 gap-6">
                  {features.map((feature) => (
                    <Link
                      key={feature.href}
                      href={feature.href}
                      className="group p-4 rounded-lg hover:bg-sky-50 transition-colors"
                    >
                      <h3 className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                        {feature.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Solutions Dropdown */}
        <AnimatePresence>
          {solutionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="hidden lg:block absolute top-full left-0 right-0 bg-white shadow-xl border-t border-slate-100 py-8"
            >
              <div className="container-custom">
                <div className="grid grid-cols-3 gap-6">
                  {solutions.map((solution) => (
                    <Link
                      key={solution.href}
                      href={solution.href}
                      className="group p-4 rounded-lg hover:bg-sky-50 transition-colors"
                    >
                      <h3 className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                        {solution.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{solution.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-100 py-4"
            >
              <div className="flex flex-col gap-4">
                {/* Mobile Features */}
                <div className="border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setFeaturesOpen(!featuresOpen)}
                    className="flex items-center justify-between w-full text-left text-slate-600 font-medium"
                  >
                    Features
                    <ChevronDown className={cn("w-4 h-4 transition-transform", featuresOpen ? "rotate-180" : "")} />
                  </button>
                  <AnimatePresence>
                    {featuresOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pl-4"
                      >
                        {features.map((feature) => (
                          <Link
                            key={feature.href}
                            href={feature.href}
                            className="block py-2 text-slate-500 hover:text-sky-600"
                          >
                            {feature.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Solutions */}
                <div className="border-b border-slate-100 pb-4">
                  <button
                    onClick={() => setSolutionsOpen(!solutionsOpen)}
                    className="flex items-center justify-between w-full text-left text-slate-600 font-medium"
                  >
                    Solutions
                    <ChevronDown className={cn("w-4 h-4 transition-transform", solutionsOpen ? "rotate-180" : "")} />
                  </button>
                  <AnimatePresence>
                    {solutionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pl-4"
                      >
                        {solutions.map((solution) => (
                          <Link
                            key={solution.href}
                            href={solution.href}
                            className="block py-2 text-slate-500 hover:text-sky-600"
                          >
                            {solution.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile Links */}
                {navLinks.filter(l => !l.hasDropdown).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "font-medium py-2",
                      pathname === link.href ? "text-sky-600" : "text-slate-600"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}

                {/* Mobile CTAs */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                  <Link href="/login" className="text-center text-slate-600 font-medium py-3">
                    Login
                  </Link>
                  <Button className="w-full">Start Free</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
