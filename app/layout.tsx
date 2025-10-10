// app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { GoogleAnalyticsProvider } from "../features/shared/components/analytics/google-analytics-provider";
import { FacebookPixelProvider } from "../features/shared/components/analytics/facebook-pixel-provider";
import Script from "next/script";
import "./globals.css";

// 1️⃣ Force dynamic rendering so runtime envs are available
export const dynamic = 'force-dynamic';

// 2️⃣ Default URL for metadata
const defaultUrl =
  process.env.NODE_ENV === "production"
    ? "https://skedy.io"
    : "http://localhost:3000";

// 3️⃣ Metadata for SEO & social
export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Skedy AI - 24/7 AI Receptionist for Tradies | Virtual Assistant Australia",
  description:
    "AI receptionist for tradies that never misses calls. 24/7 automated booking, quote generation & customer service. Built by tradies, for tradies. Try free demo now!",
  keywords: [
    "ai receptionist",
    "virtual receptionist",
    "ai receptionist for tradies",
    "24/7 virtual receptionist",
    "automated phone receptionist",
    "ai call answering service",
    "ai receptionist for plumbers",
    "virtual receptionist for electricians",
    "ai receptionist for removalists",
    "ai receptionist for builders",
    "virtual receptionist for tradies",
    "after-hours receptionist for tradies",
    "automated booking system",
    "ai appointment scheduling",
    "virtual assistant for small business",
    "ai customer service",
    "automated quote generation",
    "24/7 customer support",
    "ai receptionist australia",
    "virtual receptionist sydney",
    "ai assistant melbourne",
    "automated receptionist brisbane",
    "virtual receptionist perth",
  ].join(", "),
  authors: [{ name: "Juan Bernal", url: "https://skedy.io" }],
  creator: "Skedy AI",
  publisher: "Skedy AI",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: defaultUrl,
    siteName: "Skedy AI",
    title: "Skedy AI - 24/7 AI Receptionist for Tradies | Never Miss Another Call",
    description:
      "Revolutionary AI receptionist that answers calls 24/7, books appointments automatically, and generates quotes instantly. Built specifically for Australian tradies. 391% sales increase guaranteed.",
    images: [
      {
        url: "/SkedyLogo.png",
        width: 1200,
        height: 630,
        alt: "Skedy AI - AI Receptionist for Tradies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@skedy_ai",
    creator: "@juan_bernal",
    title: "Skedy AI - 24/7 AI Receptionist for Tradies",
    description:
      "Never miss another customer call. AI receptionist that books appointments, generates quotes & handles customer service 24/7. Try free demo!",
    images: ["/SkedyLogo.png"],
  },
  alternates: { canonical: defaultUrl },
  category: "Business Software",
  classification: "AI Virtual Assistant",
  icons: { icon: "/favicon.ico", apple: "/SkedyLogo.png" },
};

// 4️⃣ Load Geist font
const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

// 5️⃣ Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Skedy AI",
  description:
    "24/7 AI receptionist for tradies that automates customer service, booking, and quote generation",
  url: defaultUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0.30",
    priceCurrency: "AUD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "0.30",
      priceCurrency: "AUD",
      unitText: "per minute",
    },
  },
  creator: { "@type": "Person", name: "Juan Bernal", jobTitle: "Founder & CEO" },
  publisher: {
    "@type": "Organization",
    name: "Skedy AI",
    url: defaultUrl,
    logo: `${defaultUrl}/SkedyLogo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+61411851098",
      email: "info@skedy.io",
      contactType: "customer service",
    },
  },
  audience: { "@type": "BusinessAudience", audienceType: "Tradies, Small Service Businesses" },
  featureList: [
    "24/7 AI call answering",
    "Automated appointment booking",
    "Smart quote generation",
    "Multi-person calendar management",
    "Customer service automation",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 6️⃣ Runtime env for client
  const publicEnv = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    FACEBOOK_PIXEL_ID: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 7️⃣ Inject runtime env safely */}
        <Script id="runtime-env" strategy="beforeInteractive">
          {`window.__ENV = ${JSON.stringify(publicEnv)};`}
        </Script>

        {/* 8️⃣ Structured data for SEO */}
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>

      <body className={`${geistSans.className} antialiased`}>
        <GoogleAnalyticsProvider>
          <FacebookPixelProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </FacebookPixelProvider>
        </GoogleAnalyticsProvider>
      </body>
    </html>
  );
}
