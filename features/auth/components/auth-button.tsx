import Link from "next/link";
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
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"} className="btn-futuristic-outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="btn text-sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
