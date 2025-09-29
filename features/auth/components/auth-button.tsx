import { Button } from "@/features/shared";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-foreground glow-text">Hey, {user.email}!</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2 relative">
      <Button
        size="sm"
        variant={"outline"}
        className="btn-futuristic-outline opacity-50 cursor-not-allowed"
        disabled
      >
        Sign in
      </Button>
      <Button
        size="sm"
        className="btn text-sm opacity-50 cursor-not-allowed"
        disabled
      >
        Sign up
      </Button>
      {/* Small notification bubble */}
      <div className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
        Soon
      </div>
    </div>
  );
}
