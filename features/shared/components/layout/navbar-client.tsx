"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";

interface NavbarClientProps {
  menuItems: Array<{ label: string; href: string }>;
  authSection: React.ReactNode;
}

export function NavbarClient({ menuItems, authSection }: NavbarClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center group" aria-label="Home">
            <div className="relative flex items-center gap-3">
              {/* AI Brain + Calendar Icon */}
              <div className="relative w-10 h-10 lg:w-12 lg:h-12">
                {/* Outer ring - represents 24/7 availability */}
                <div className="absolute inset-0 border-2 border-primary/40 rounded-full">
                  <div className="absolute top-0 left-1/2 w-1 h-1 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
                  <div className="absolute top-1/4 right-0 w-1 h-1 bg-secondary rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
                  <div className="absolute bottom-1/4 left-0 w-1 h-1 bg-accent rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
                </div>

                {/* Calendar grid inside */}
                <div className="absolute inset-2 grid grid-cols-3 gap-0.5 p-1">
                  <div className="bg-primary/60 rounded-sm"></div>
                  <div className="bg-secondary/40 rounded-sm"></div>
                  <div className="bg-accent/60 rounded-sm"></div>
                  <div className="bg-secondary/60 rounded-sm"></div>
                  <div className="bg-primary rounded-sm animate-pulse"></div>
                  <div className="bg-accent/40 rounded-sm"></div>
                  <div className="bg-accent/60 rounded-sm"></div>
                  <div className="bg-primary/40 rounded-sm"></div>
                  <div className="bg-secondary/60 rounded-sm"></div>
                </div>
              </div>

              {/* Text logo */}
              <div className="relative">
                <div className="flex items-baseline">
                  <span className="text-xl lg:text-2xl font-bold tracking-tight text-foreground glow-text group-hover:text-primary transition-colors duration-300">
                    Skedy
                  </span>
                  <span className="ml-1 text-sm lg:text-base font-bold text-accent glow-text">
                    AI
                  </span>
                  {/* Status indicator */}
                  <div className="ml-2 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground font-mono">ONLINE</span>
                  </div>
                </div>

                {/* Data stream line */}
                <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-primary via-secondary to-accent opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          <ul className="hidden md:flex gap-6 lg:gap-8 list-none">
            {menuItems.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="text-foreground/90 hover:text-foreground transition-colors duration-200 relative group text-sm lg:text-base font-medium px-3 py-2 glow-text"
                  aria-label={item.label}
                >
                  {item.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary transition-all duration-200 ease-out group-hover:w-full"></span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Section - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Social Icons */}
            <div className="flex gap-2">
              <a
                href="https://www.instagram.com/skedy.io"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-foreground/70 hover:text-primary transition-colors duration-200 rounded-lg hover:bg-primary/10 glow-text"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/skedy-io"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-foreground/70 hover:text-secondary transition-colors duration-200 rounded-lg hover:bg-secondary/10 glow-text"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>

            <ThemeSwitcher />
            {authSection}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-300"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden rounded-none">
          <div className="px-6 py-6 space-y-4">
            {/* Navigation Items */}
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block text-foreground font-medium py-3 px-4 rounded-lg hover:bg-primary/10 transition-all duration-200 glow-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Social Icons */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <a
                href="https://www.instagram.com/skedy.io"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 text-white/70 hover:text-primary transition-colors duration-200 rounded-full hover:bg-white/10"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.40s-.644-1.44-1.439-1.40z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/skedy-io"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 text-white/70 hover:text-secondary transition-colors duration-200 rounded-full hover:bg-white/10"
                aria-label="LinkedIn"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>

            {/* Mobile Auth */}
            <div className="pt-4 flex items-center justify-between">
              <ThemeSwitcher />
              {authSection}
            </div>
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
