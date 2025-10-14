import { createAuthenticatedServerClient } from "@/features/shared/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/protected/dashboard";
  const returnUrl = searchParams.get("returnUrl");

  // Use a more reliable method to determine the correct origin
  // In production, always use the production URL regardless of the request origin
  const origin = process.env.NODE_ENV === 'production'
    ? 'https://skedy.io'
    : new URL(request.url).origin;

  console.log("Confirmation route called with:", {
    token_hash: !!token_hash,
    type,
    next,
    returnUrl,
    requestUrl: request.url,
    determinedOrigin: origin,
    nodeEnv: process.env.NODE_ENV
  });

  if (!token_hash || !type) {
    console.log("Missing confirmation token_hash or type in URL");
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent('Invalid confirmation link - missing token')}`);
  }

  const supabase = await createAuthenticatedServerClient();

  try {
    // Use verifyOtp for email confirmation tokens
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (!error) {
      // Check for returnUrl first (from sign-up with return URL), then next, then default to protected
      let redirectPath = "/protected/dashboard";

      if (returnUrl) {
        // Decode the return URL and redirect to it
        const decodedReturnUrl = decodeURIComponent(returnUrl);
        redirectPath = decodedReturnUrl;
      } else if (next && next !== "/protected/dashboard") {
        redirectPath = next;
      }

      console.log("✅ Email confirmation successful, redirecting to:", `${origin}${redirectPath}`);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    } else {
      console.error("Email confirmation error:", error);
      return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error?.message || 'Confirmation failed')}`);
    }
  } catch (err) {
    console.error("Unexpected error during email confirmation:", err);
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent('Unexpected error during confirmation')}`);
  }
}
