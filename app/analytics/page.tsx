import { redirect } from "next/navigation";
import { createAuthenticatedServerClient } from "@/features/shared/lib/supabase/server";
import { MainLayout } from "@/features/shared/components/layout/main-layout";
import { AnalyticsDashboard } from "@/features/token-usage-analytics";

export default async function AnalyticsPage() {
  const supabase = await createAuthenticatedServerClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your Skedy AI agent usage, costs, and performance
          </p>
        </div>

        <AnalyticsDashboard user={data.claims} />
      </div>
    </MainLayout>
  );
}
