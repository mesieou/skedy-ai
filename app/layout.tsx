import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { GoogleAnalyticsProvider } from "../features/shared/components/analytics/google-analytics-provider";
import "./globals.css";

const defaultUrl = process.env.NODE_ENV === 'production'
  ? "https://skedy.io"
  : "http://localhost:3000";

  export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),
    title: "Skedy AI - 24/7 AI Receptionist for Tradies | Virtual Assistant Australia",
    description: "AI receptionist for tradies that never misses calls. 24/7 automated booking, quote generation & customer service. Built by tradies, for tradies. Try free demo now!",
    keywords: [
      // Primary keywords
      "ai receptionist", "virtual receptionist", "ai receptionist for tradies",
      "24/7 virtual receptionist", "automated phone receptionist", "ai call answering service",

      // Tradie-specific
      "ai receptionist for plumbers", "virtual receptionist for electricians",
      "ai receptionist for removalists", "ai receptionist for builders",
      "virtual receptionist for tradies", "after-hours receptionist for tradies",

      // Business benefits
      "automated booking system", "ai appointment scheduling", "virtual assistant for small business",
      "ai customer service", "automated quote generation", "24/7 customer support",

      // Location-based
      "ai receptionist australia", "virtual receptionist sydney", "ai assistant melbourne",
      "automated receptionist brisbane", "virtual receptionist perth"
    ].join(", "),
    authors: [{ name: "Juan Bernal", url: "https://skedy.io" }],
    creator: "Skedy AI",
    publisher: "Skedy AI",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url: defaultUrl,
      siteName: "Skedy AI",
      title: "Skedy AI - 24/7 AI Receptionist for Tradies | Never Miss Another Call",
      description: "Revolutionary AI receptionist that answers calls 24/7, books appointments automatically, and generates quotes instantly. Built specifically for Australian tradies. 391% sales increase guaranteed.",
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
      description: "Never miss another customer call. AI receptionist that books appointments, generates quotes & handles customer service 24/7. Try free demo!",
      images: ["/SkedyLogo.png"],
    },
    alternates: {
      canonical: defaultUrl,
    },
    category: "Business Software",
    classification: "AI Virtual Assistant",
    icons: {
      icon: "/favicon.ico",
      apple: "/SkedyLogo.png",
    },
  };

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inject safe environment variables for client-side access
  const publicEnv = {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Skedy AI",
    "description": "24/7 AI receptionist for tradies that automates customer service, booking, and quote generation",
    "url": defaultUrl,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0.30",
      "priceCurrency": "AUD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "0.30",
        "priceCurrency": "AUD",
        "unitText": "per minute"
      }
    },
    "creator": {
      "@type": "Person",
      "name": "Juan Bernal",
      "jobTitle": "Founder & CEO"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Skedy AI",
      "url": defaultUrl,
      "logo": `${defaultUrl}/SkedyLogo.png`,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+61411851098",
        "email": "info@skedy.io",
        "contactType": "customer service"
      }
    },
    "audience": {
      "@type": "BusinessAudience",
      "audienceType": "Tradies, Small Service Businesses"
    },
    "featureList": [
      "24/7 AI call answering",
      "Automated appointment booking",
      "Smart quote generation",
      "Multi-person calendar management",
      "Customer service automation"
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(publicEnv)};`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <GoogleAnalyticsProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </GoogleAnalyticsProvider>
      </body>
    </html>
  );
}
