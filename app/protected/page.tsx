import { redirect } from "next/navigation";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { DashboardTabs } from "@/features/dashboard";
import { getBusinessBookingsByUserId, getBusinessSessionsByUserId, getBusinessTimezoneByUserId } from "@/features/dashboard/lib/actions";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    console.error(`Auth error or no claims:`, error);
    redirect("/auth/login");
  }

  console.log(`Loading dashboard for user: ${data.claims.sub}`);

  try {
    const [bookings, sessions, businessTimezone] = await Promise.all([
      getBusinessBookingsByUserId(data.claims.sub),
      getBusinessSessionsByUserId(data.claims.sub),
      getBusinessTimezoneByUserId(data.claims.sub),
    ]);

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
