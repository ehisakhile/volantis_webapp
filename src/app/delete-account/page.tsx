import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Delete Account - Volantislive",
  description: "Learn how to delete your Volantislive account and what happens to your data.",
};

const deletionSteps = [
  {
    number: "01",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: "Open Your Profile",
    description: "Launch the Volantislive app and tap your Profile icon in the bottom navigation bar.",
  },
  {
    number: "02",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
      </svg>
    ),
    title: "Scroll to Bottom",
    description: "Scroll all the way down on the profile page to find account management options.",
  },
  {
    number: "03",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
    title: "Tap Delete Account",
    description: 'Find the red "Delete Account" button at the bottom and tap it to begin the process.',
  },
  {
    number: "04",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
    title: "Confirm Your Intent",
    description: 'Type "Delete my account" exactly as shown in the confirmation prompt that appears.',
  },
  {
    number: "05",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Account Deleted",
    description: "Tap Confirm. Your account and all associated data will be permanently removed.",
  },
];

const dataLost = [
  { icon: "👤", label: "Account Info", detail: "Name, email, profile" },
  { icon: "📡", label: "Subscriptions", detail: "All followed channels" },
  { icon: "🎧", label: "Listen History", detail: "Playback & preferences" },
  { icon: "🎙️", label: "Uploaded Audio", detail: "All your content" },
  { icon: "💬", label: "Chat Messages", detail: "All conversations" },
  { icon: "⚙️", label: "Settings", detail: "Customizations" },
];

const alternatives = [
  {
    title: "Temporary Deactivation",
    description: "Contact support to pause your account without losing data.",
    icon: "⏸️",
    color: "bg-blue-50 border-blue-200",
    titleColor: "text-blue-800",
  },
  {
    title: "Adjust Privacy",
    description: "Tighten privacy settings to control what data you share.",
    icon: "🔒",
    color: "bg-purple-50 border-purple-200",
    titleColor: "text-purple-800",
  },
  {
    title: "Export Your Data",
    description: "Download a copy of everything before making any decisions.",
    icon: "📦",
    color: "bg-amber-50 border-amber-200",
    titleColor: "text-amber-800",
  },
];

export default function DeleteAccountPage() {
  return (
    <>
      <Navbar />

      <main className="pt-24 md:pt-32 pb-20 bg-white">
        <Container>
          <div className="max-w-3xl mx-auto">

            {/* Header */}
            <div className="mb-10">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase text-red-500 mb-3">
                Account Management
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                Delete Your Account
              </h1>
              <p className="text-lg text-gray-500">
                This action is permanent. Please read everything carefully before proceeding.
              </p>
            </div>

            {/* Warning Banner */}
            <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-2xl p-5 mb-14">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-red-800 mb-1">This cannot be undone</p>
                <p className="text-sm text-red-700">
                  Once deleted, your account and all associated data are permanently erased from our systems. There is no recovery option.
                </p>
              </div>
            </div>

            {/* Step-by-Step Process */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How to Delete Your Account</h2>
              <p className="text-gray-500 mb-8 text-sm">Mobile app · Step-by-step guide</p>

              <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-[28px] top-10 bottom-10 w-px bg-gradient-to-b from-red-200 via-red-100 to-transparent hidden md:block" />

                <div className="space-y-4">
                  {deletionSteps.map((step, i) => (
                    <div
                      key={step.number}
                      className="relative flex gap-5 items-start group"
                    >
                      {/* Step number bubble */}
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all
                        ${i === deletionSteps.length - 1
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-white border-gray-200 text-gray-400 group-hover:border-red-300 group-hover:text-red-500"
                        }`}
                      >
                        <span className="text-xs font-bold leading-none mb-0.5">{step.number}</span>
                        <span className={i === deletionSteps.length - 1 ? "text-white" : "text-gray-400 group-hover:text-red-500"}>
                          {step.icon}
                        </span>
                      </div>

                      {/* Content */}
                      <div className={`flex-1 rounded-2xl border p-5 transition-all
                        ${i === deletionSteps.length - 1
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-100 group-hover:bg-red-50/40 group-hover:border-red-100"
                        }`}
                      >
                        <p className={`font-semibold mb-1 ${i === deletionSteps.length - 1 ? "text-red-800" : "text-gray-800"}`}>
                          {step.title}
                        </p>
                        <p className={`text-sm leading-relaxed ${i === deletionSteps.length - 1 ? "text-red-700" : "text-gray-500"}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* What Gets Deleted */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What Will Be Deleted</h2>
              <p className="text-gray-500 mb-8 text-sm">All of the following is permanently erased, with no recovery.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {dataLost.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 bg-gray-50 border border-gray-100 rounded-2xl p-4 hover:bg-red-50 hover:border-red-100 transition-all group"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm group-hover:text-red-800">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Before You Delete Checklist */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Before You Proceed</h2>
              <p className="text-gray-500 mb-8 text-sm">Take care of these first to avoid losing anything important.</p>

              <div className="space-y-3">
                {[
                  { emoji: "💾", title: "Download your data", body: "Save a copy of your content and history before deletion." },
                  { emoji: "💳", title: "Cancel subscriptions", body: "Cancel any active plans to avoid future charges." },
                  { emoji: "🔁", title: "Transfer channel ownership", body: "If others depend on your channels, transfer them first." },
                  { emoji: "📋", title: "Backup contact info", body: "Save any contacts or connections you'll want later." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <span className="text-xl mt-0.5 flex-shrink-0">{item.emoji}</span>
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">{item.title}</p>
                      <p className="text-xs text-amber-700 mt-0.5">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Alternatives */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Ready to Leave?</h2>
              <p className="text-gray-500 mb-8 text-sm">Consider these options before permanently deleting your account.</p>

              <div className="grid gap-4 md:grid-cols-3">
                {alternatives.map((alt) => (
                  <div key={alt.title} className={`rounded-2xl border p-5 ${alt.color}`}>
                    <span className="text-2xl block mb-3">{alt.icon}</span>
                    <p className={`font-semibold text-sm mb-1 ${alt.titleColor}`}>{alt.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{alt.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Contact Support */}
            <section>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-xl shadow-sm">
                  🛟
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">Need help?</h3>
                  <p className="text-sm text-gray-500">
                    Our support team is happy to answer any questions before you decide.
                  </p>
                </div>
                <a
                  href="mailto:notifiications@volantislive.com"
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  Contact Support
                </a>
              </div>
            </section>

          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}