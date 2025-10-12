import { redirect } from "next/navigation";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { DashboardTabs } from "@/features/dashboard";
import { getBusinessBookingsByUserId, getBusinessSessionsByUserId, getBusinessTimezoneByUserId } from "@/features/dashboard/lib/actions";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const [bookings, sessions, businessTimezone] = await Promise.all([
    getBusinessBookingsByUserId(data.claims.sub),
    getBusinessSessionsByUserId(data.claims.sub),
    getBusinessTimezoneByUserId(data.claims.sub),
  ]);

  return <DashboardTabs user={data.claims} bookings={bookings} sessions={sessions} businessTimezone={businessTimezone} />;
}
