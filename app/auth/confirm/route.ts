import { createAuthenticatedServerClient } from "@/features/shared/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/protected/dashboard";
  const returnUrl = searchParams.get("returnUrl");

  // Use a more reliable method to determine the correct origin
  // In production, always use the production URL regardless of the request origin
  const origin = process.env.NODE_ENV === 'production'
    ? 'https://skedy.io'
    : new URL(request.url).origin;

  console.log("Confirmation route called with:", {
    next,
    returnUrl,
    requestUrl: request.url,
    determinedOrigin: origin,
    nodeEnv: process.env.NODE_ENV,
    allParams: Object.fromEntries(searchParams.entries())
  });

  const supabase = await createAuthenticatedServerClient();

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting user after confirmation:", error);
      return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error?.message || 'Confirmation failed')}`);
    }

    if (!user) {
      console.error("No user found after confirmation");
      return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent('Email confirmation failed - no user session')}`);
    }

    console.log("Email confirmation successful for user:", user.id);

    // Check for returnUrl first (from sign-up with return URL), then next, then default to protected
    let redirectPath = "/protected/dashboard";

    if (returnUrl) {
      // Decode the return URL and redirect to it
      const decodedReturnUrl = decodeURIComponent(returnUrl);
      redirectPath = decodedReturnUrl;
    } else if (next && next !== "/protected/dashboard") {
      redirectPath = next;
    }

    console.log("Redirecting confirmed user to:", `${origin}${redirectPath}`);
    return NextResponse.redirect(`${origin}${redirectPath}`);
  } catch (err) {
    console.error("Unexpected error during email confirmation:", err);
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent('Unexpected error during confirmation')}`);
  }
}
