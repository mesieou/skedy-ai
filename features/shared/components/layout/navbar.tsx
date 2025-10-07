import { AuthButton } from "@/features/auth/components/auth-button";
import { NavbarClient } from "./navbar-client";

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

export async function Navbar() {
  return (
    <NavbarClient
      menuItems={menuItems}
      authSection={<AuthButton />}
    />
  );
}
