import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.NODE_ENV === 'production'
  ? "https://skedy.ai"
  : "http://localhost:3000";

  export const metadata: Metadata = {
    metadataBase: new URL(defaultUrl),
    title: "Skedy - AI-Powered Voice Agent",
    description: "We help tradies to automate their customer service, booking and scheduling.",
    keywords: "booking management, calendar automation, AI agents, mobile business, scheduling",
    authors: [{ name: "Skedy Team" }],
    openGraph: {
      title: "Skedy - AI-Powered Voice Agent",
      description: "We help tradies to automate their customer service, booking and scheduling.",
      type: "website",
      url: defaultUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: "Skedy - AI-Powered Voice Agent",
      description: "We help tradies to automate their customer service, booking and scheduling.",
    },
    icons: {
      icon: "/favicon.ico",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
