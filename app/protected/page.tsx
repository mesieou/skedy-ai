import { redirect } from "next/navigation";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { DashboardWelcome } from "@/features/dashboard";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return <DashboardWelcome user={data.claims} />;
}
