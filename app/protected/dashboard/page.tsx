import { redirect } from "next/navigation";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { DashboardTabs } from "@/features/dashboard";
import { getBusinessBookingsByUserId, getBusinessSessionsByUserId, getBusinessTimezoneByUserId } from "@/features/dashboard/lib/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    console.error(`Auth error or no claims:`, error);
    redirect("/auth/login");
  }

  console.log(`📊 [DashboardPage] Loading dashboard for user: ${data.claims.sub}`);
  console.log(`📊 [DashboardPage] User email: ${data.claims.email}`);

  try {
    const [bookings, sessions, businessTimezone] = await Promise.all([
      getBusinessBookingsByUserId(data.claims.sub),
      getBusinessSessionsByUserId(data.claims.sub),
      getBusinessTimezoneByUserId(data.claims.sub),
    ]);

    console.log(`📊 [DashboardPage] Loaded ${bookings.length} bookings and ${sessions.length} sessions`);

    if (bookings.length > 0) {
      console.log(`First booking details:`, {
        id: bookings[0].id,
        status: bookings[0].status,
        start_at: bookings[0].start_at,
        total_estimate_amount: bookings[0].total_estimate_amount,
        services: bookings[0].services.map(s => s.name)
      });
    }

    return <DashboardTabs user={data.claims} bookings={bookings} sessions={sessions} businessTimezone={businessTimezone} />;
  } catch (error) {
    console.error(`Error loading dashboard data:`, error);
    
    // Check if it's a business-related error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "NO_BUSINESS_ASSOCIATED" || errorMessage === "USER_NOT_FOUND") {
      console.error(`User setup incomplete, redirecting to login`);
      redirect("/auth/login?error=setup_incomplete");
    }
    
    // For other errors, show a generic error message
    throw error;
  }
}
