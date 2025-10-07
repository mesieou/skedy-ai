"use client";

import { NavbarClient } from "./navbar-client";
import { Button } from "../ui/button";
import Link from "next/link";

const menuItems = [
  {
    label: 'Products',
    href: '#services',
    dropdown: [
      { label: 'AI Voice Receptionist', href: '/#services', description: '24/7 automated call answering' },
      { label: 'TimeClock Pro', href: '/timeclock', description: 'Professional time tracking with GPS' }
    ]
  },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

// Simple client-side auth section (no server dependencies)
function ClientAuthSection() {
  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"} className="btn-futuristic-outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="btn text-sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}

interface TimeclockLayoutProps {
  children: React.ReactNode;
}

export function TimeclockLayout({ children }: TimeclockLayoutProps) {
  return (
    <main className="min-h-screen flex flex-col">
      <NavbarClient
        menuItems={menuItems}
        authSection={<ClientAuthSection />}
      />
      {/* Sleek separator after navbar */}
      <div className="pt-20 pb-4 bg-transparent">
        <div className="section-separator"></div>
      </div>
      <div className="flex-1 w-full bg-transparent">
        {children}
      </div>
    </main>
  );
}
