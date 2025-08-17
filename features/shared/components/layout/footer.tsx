import { ThemeSwitcher } from "@/features/shared/components/layout/theme-switcher";

export function Footer() {
  return (
    <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
      <ThemeSwitcher />
    </footer>
  );
}
