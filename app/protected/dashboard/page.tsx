import { redirect } from "next/navigation";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { DashboardTabs } from "@/features/dashboard";
import { getUserBookings, getUserSessions } from "@/features/dashboard/lib/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  console.log(`📊 [DashboardPage] Loading dashboard for user: ${data.claims.sub}`);
  console.log(`📊 [DashboardPage] User email: ${data.claims.email}`);

  const [bookings, sessions] = await Promise.all([
    getUserBookings(data.claims.sub),
    getUserSessions(data.claims.sub),
  ]);

  console.log(`📊 [DashboardPage] Loaded ${bookings.length} bookings and ${sessions.length} sessions`);

  if (bookings.length > 0) {
    console.log(`📊 [DashboardPage] First booking details:`, {
      id: bookings[0].id,
      status: bookings[0].status,
      start_at: bookings[0].start_at,
      total_estimate_amount: bookings[0].total_estimate_amount,
      services: bookings[0].services.map(s => s.name)
    });
  }

  return <DashboardTabs user={data.claims} bookings={bookings} sessions={sessions} />;
}
