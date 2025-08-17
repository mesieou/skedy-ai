// Shared feature exports (client-safe only)
export { Footer } from './components/layout/footer';
export { ThemeSwitcher } from './components/layout/theme-switcher';
export { Hero } from './components/layout/hero';
// Note: MainLayout and Navbar should be imported directly to avoid server/client conflicts

// UI components
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/input';
export * from './components/ui/label';
export * from './components/ui/dropdown-menu';
export * from './components/ui/badge';
export * from './components/ui/checkbox';

// Utilities
export { cn, hasEnvVars } from './utils/utils';

// Supabase clients (client-side only)
export { createPublishableClient, createClient } from './lib/supabase/client';
// Note: Server-side clients should be imported directly to avoid client/server conflicts

// Note: Database layer should be imported directly to avoid client/server conflicts
