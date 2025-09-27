import { AuthButton } from "@/features/auth/components/auth-button";
import { NavbarClient } from "./navbar-client";

const menuItems = [
  { label: 'Services', href: '#services' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export async function Navbar() {
  return (
    <NavbarClient
      menuItems={menuItems}
      authSection={<AuthButton />}
    />
  );
}
