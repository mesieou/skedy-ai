import Link from "next/link";
import { Button } from "@/features/shared";
import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const authUser = data?.claims;

  // Fetch the user's name from public.users table using UserRepository
  let displayName = 'there';
  if (authUser?.sub) {
    try {
      const userRepo = new UserRepository();
      const publicUser = await userRepo.findOne({ id: authUser.sub }, { select: 'first_name, last_name' });

      if (publicUser?.first_name) {
        displayName = publicUser.first_name;
        console.log('✅ [AuthButton] Found user name:', displayName);
      } else {
        console.log('⚠️ [AuthButton] No first_name found for user:', authUser.sub);
      }
    } catch (error) {
      console.error('❌ [AuthButton] Error fetching user name:', error);
    }
  }

  return authUser ? (
    <div className="flex items-center gap-4">
      <span className="text-foreground glow-text">Hey, {displayName}!</span>
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
