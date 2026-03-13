"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, User, LogOut, Settings, Headphones, Radio, Zap, BarChart2, Globe, Archive, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const features = [
  { name: "Live Streaming", href: "/features", description: "Broadcast in real-time", icon: Radio },
  { name: "Low Data Mode", href: "/features", description: "Works on any connection", icon: Zap },
  { name: "Channel Pages", href: "/features", description: "Your streaming hub", icon: Globe },
  { name: "Replay Archive", href: "/features", description: "Never miss a broadcast", icon: Archive },
  { name: "Analytics", href: "/features", description: "Track your audience", icon: BarChart2 },
  { name: "Embed Player", href: "/features", description: "Add to your site", icon: Code },
];

const solutions = [
  { name: "Churches", href: "/solutions/churches", description: "For places of worship" },
  { name: "Ministries", href: "/contact", description: "Outreach & missions" },
  { name: "Community Radio", href: "/contact", description: "Online radio stations" },
  { name: "Events", href: "/contact", description: "Live event streaming" },
  { name: "Creators", href: "/contact", description: "Content creators" },
];

// Hook to close dropdown when clicking outside
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  React.useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [featuresOpen, setFeaturesOpen] = React.useState(false);
  const [solutionsOpen, setSolutionsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const featuresRef = React.useRef<HTMLDivElement>(null!);
  const solutionsRef = React.useRef<HTMLDivElement>(null!);
  const userMenuRef = React.useRef<HTMLDivElement>(null!);
  const mobileMenuRef = React.useRef<HTMLDivElement>(null!);

  useClickOutside(featuresRef, () => setFeaturesOpen(false));
  useClickOutside(solutionsRef, () => setSolutionsOpen(false));
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close everything on route change
  React.useEffect(() => {
    setIsOpen(false);
    setFeaturesOpen(false);
    setSolutionsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
              <span className="text-lg font-bold text-slate-900">
                Volantis<span className="text-sky-500">live</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6 xl:gap-8">

              {/* Features Dropdown */}
              <div ref={featuresRef} className="relative">
                <button
                  onClick={() => { setFeaturesOpen(!featuresOpen); setSolutionsOpen(false); }}
                  className="flex items-center gap-1 text-slate-600 hover:text-sky-600 font-medium transition-colors py-2"
                  aria-expanded={featuresOpen}
                >
                  Features
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", featuresOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {featuresOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 grid grid-cols-2 gap-1"
                    >
                      {/* Small arrow */}
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-100 rotate-45" />
                      {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link
                            key={feature.name}
                            href={feature.href}
                            className="group flex items-start gap-3 p-3 rounded-xl hover:bg-sky-50 transition-colors"
                          >
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                              <Icon className="w-4 h-4 text-sky-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors text-sm">{feature.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{feature.description}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Solutions Dropdown */}
              <div ref={solutionsRef} className="relative">
                <button
                  onClick={() => { setSolutionsOpen(!solutionsOpen); setFeaturesOpen(false); }}
                  className="flex items-center gap-1 text-slate-600 hover:text-sky-600 font-medium transition-colors py-2"
                  aria-expanded={solutionsOpen}
                >
                  Solutions
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", solutionsOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {solutionsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2"
                    >
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-100 rotate-45" />
                      {solutions.map((solution) => (
                        <Link
                          key={solution.name}
                          href={solution.href}
                          className="group flex flex-col px-4 py-3 rounded-xl hover:bg-sky-50 transition-colors"
                        >
                          <span className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors text-sm">{solution.name}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{solution.description}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/listen"
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-full font-medium hover:bg-sky-600 transition-colors shadow-md shadow-sky-500/20 text-sm"
              >
                <Headphones className="w-4 h-4" />
                Listen
              </Link>

              <Link
                href="/how-it-works"
                className={cn(
                  "font-medium transition-colors text-sm",
                  pathname === "/how-it-works" ? "text-sky-600" : "text-slate-600 hover:text-sky-600"
                )}
              >
                How It Works
              </Link>
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-slate-600 hover:text-sky-600 font-medium transition-colors"
                  >
                    <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-sky-600" />
                    </div>
                    <span className="max-w-[120px] truncate text-sm">{user.username || user.email}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", userMenuOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                          <p className="text-sm font-semibold text-slate-900 truncate">{user.username}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                        </div>
                        <div className="p-1">
                          <Link
                            href={user.role === 'admin' || user.company_id ? "/dashboard" : "/user/dashboard"}
                            className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 rounded-lg transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="w-4 h-4" />
                            {user.role === 'admin' || user.company_id ? "Creator Dashboard" : "My Dashboard"}
                          </Link>
                          <button
                            onClick={async () => {
                              setUserMenuOpen(false);
                              await logout();
                              router.push('/');
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-slate-600 hover:text-sky-600 font-medium transition-colors text-sm">
                    Login
                  </Link>
                  <div className="relative group">
                    <Button size="sm" className="rounded-full">Start Free</Button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
                      <Link href="/signup" className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-colors">
                        Start Streaming
                      </Link>
                      <Link href="/signup/user" className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-colors">
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
              className="lg:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-6 h-6" />
                  </motion.span>
                ) : (
                  <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-6 h-6" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu — rendered outside header to avoid overflow issues */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl lg:hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 flex-shrink-0">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
                  <span className="text-lg font-bold text-slate-900">Volantis<span className="text-sky-500">live</span></span>
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body — scrollable */}
              <div className="flex-1 overflow-y-auto py-4 px-5">

                {/* Features accordion */}
                <div className="mb-1">
                  <button
                    onClick={() => { setFeaturesOpen(!featuresOpen); setSolutionsOpen(false); }}
                    className="flex items-center justify-between w-full py-3 text-slate-700 font-semibold text-left"
                  >
                    Features
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", featuresOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {featuresOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 gap-1 pb-3 pl-2">
                          {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                              <Link
                                key={feature.name}
                                href={feature.href}
                                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-sky-50 transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Icon className="w-4 h-4 text-sky-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800 text-sm">{feature.name}</p>
                                  <p className="text-xs text-slate-500">{feature.description}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-px bg-slate-100 my-1" />

                {/* Solutions accordion */}
                <div className="mb-1">
                  <button
                    onClick={() => { setSolutionsOpen(!solutionsOpen); setFeaturesOpen(false); }}
                    className="flex items-center justify-between w-full py-3 text-slate-700 font-semibold text-left"
                  >
                    Solutions
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", solutionsOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {solutionsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1 pb-3 pl-2">
                          {solutions.map((solution) => (
                            <Link
                              key={solution.name}
                              href={solution.href}
                              className="flex flex-col px-3 py-2.5 rounded-xl hover:bg-sky-50 transition-colors"
                              onClick={() => setIsOpen(false)}
                            >
                              <span className="font-medium text-slate-800 text-sm">{solution.name}</span>
                              <span className="text-xs text-slate-500">{solution.description}</span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-px bg-slate-100 my-1" />

                {/* Plain links */}
                <Link
                  href="/listen"
                  className="flex items-center gap-2 py-3 text-slate-700 font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  <Headphones className="w-4 h-4 text-sky-500" />
                  Listen
                </Link>

                <div className="h-px bg-slate-100 my-1" />

                <Link
                  href="/how-it-works"
                  className="block py-3 text-slate-700 font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  How It Works
                </Link>

                <div className="h-px bg-slate-100 my-1" />

                {/* Auth links */}
                {isAuthenticated && user ? (
                  <div className="pt-2">
                    <div className="flex items-center gap-3 px-3 py-3 bg-slate-50 rounded-xl mb-2">
                      <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{user.username}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      href={user.role === 'admin' || user.company_id ? "/dashboard" : "/user/dashboard"}
                      className="flex items-center gap-2 px-3 py-3 text-slate-700 hover:text-sky-600 font-medium text-sm rounded-xl hover:bg-sky-50 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      {user.role === 'admin' || user.company_id ? "Creator Dashboard" : "My Dashboard"}
                    </Link>
                    <button
                      onClick={async () => {
                        setIsOpen(false);
                        await logout();
                        router.push('/');
                      }}
                      className="flex items-center gap-2 w-full px-3 py-3 text-red-600 font-medium text-sm rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Drawer Footer — CTAs */}
              {!isAuthenticated && (
                <div className="px-5 py-5 border-t border-slate-100 flex flex-col gap-3 flex-shrink-0">
                  <Link
                    href="/login"
                    className="text-center py-3 text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup/user"
                    className="text-center py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition-colors shadow-md shadow-sky-500/20"
                    onClick={() => setIsOpen(false)}
                  >
                    I want to Listen 
                  </Link>
                  <Link
                    href="/signup"
                    className="text-center py-2.5 text-sky-600 font-medium text-sm hover:underline"
                    onClick={() => setIsOpen(false)}
                  >
                    I want to Stream 
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}