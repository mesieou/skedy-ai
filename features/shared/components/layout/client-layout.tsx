"use client";

import { ClientNavbar } from "./client-navbar";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <main className="min-h-screen flex flex-col">
      <ClientNavbar />
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
