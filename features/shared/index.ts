// Shared feature exports
export { MainLayout } from './components/layout/main-layout';
export { Navbar } from './components/layout/navbar';
export { Footer } from './components/layout/footer';
export { ThemeSwitcher } from './components/layout/theme-switcher';
export { Hero } from './components/layout/hero';

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

// Supabase clients
export { createClient } from './lib/supabase/client';
export { createClient as createServerClient } from './lib/supabase/server';
export { updateSession } from './lib/supabase/middleware';

// Database layer
export * from './lib/database';
