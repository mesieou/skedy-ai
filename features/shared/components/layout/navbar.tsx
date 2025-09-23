import { EnvVarWarning } from "@/features/auth/components/env-var-warning";
import { AuthButton } from "@/features/auth/components/auth-button";
import { hasEnvVars } from "@/features/shared/utils/utils";
import Link from "next/link";
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
      authSection={!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
    />
  );
}
