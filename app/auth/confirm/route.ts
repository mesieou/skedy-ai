import { createAuthenticatedServerClient as createClient } from "@/features/shared/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/protected";
  const origin = request.url.split('/auth/confirm')[0]; // Get the origin from the request

  console.log("Confirmation route called with:", {
    code: !!code,
    next
  });

  if (!code) {
    console.log("Missing confirmation code in URL");
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent('Invalid confirmation link - missing confirmation code')}`);
  }

  const supabase = await createClient();

  try {
    // Use exchangeCodeForSession instead of verifyOtp for email confirmation
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Email confirmation error with code:", error);
      return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error?.message || 'Confirmation failed')}`);
    }
  } catch (err) {
    console.error("Unexpected error during code confirmation:", err);
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent('Unexpected error during confirmation')}`);
  }
}
