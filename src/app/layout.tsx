import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Analytics } from "@vercel/analytics/next";
export const metadata: Metadata = {
  title: "Volantislive - Live Audio Streaming Built for Africa",
  description: "Stream your church services, events, and content live with ultra-low bandwidth. Works on any connection across Africa.",
  keywords: ["live streaming", "audio streaming", "church streaming", "Nigeria", "Africa", "low bandwidth"],
  authors: [{ name: "Volantislive" }],
  openGraph: {
    title: "Volantislive - Live Audio Streaming Built for Africa",
    description: "Stream your church services, events, and content live with ultra-low bandwidth. Works on any connection across Africa.",
    type: "website",
    locale: "en_NG",
    siteName: "Volantislive",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
