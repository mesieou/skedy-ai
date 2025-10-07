"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { Button } from "@/features/shared/components/ui/button";
import { NavbarClient } from "./navbar-client";
import { createClient } from "@/features/shared/lib/supabase/client";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { User } from "@supabase/supabase-js";

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

function ClientAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="w-16 h-8 bg-muted animate-pulse rounded" />
        <div className="w-16 h-8 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-foreground glow-text">Hey, {user.email?.split('@')[0]}!</span>
      <LogoutButton />
    </div>
  ) : (
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

export function ClientNavbar() {
  return (
    <NavbarClient
      menuItems={menuItems}
      authSection={<ClientAuthButton />}
    />
  );
}
