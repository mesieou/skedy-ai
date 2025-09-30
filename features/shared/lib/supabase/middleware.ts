import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../../utils/utils";

/**
 * Middleware session management with publishable key
 * Use for: Next.js middleware, session refresh, route protection
 * Access: Session management and user verification
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip middleware check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // Create middleware client for session management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;

  // If there is no user and the user tries to access a protected route
  if (!user && pathname.startsWith("/protected")) {
    // Preserve the original URL (including query parameters) as a return URL
    const returnUrl = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/auth/login?returnUrl=${returnUrl}`, request.url));
  }

  // If user is authenticated and trying to access auth pages, redirect to protected
  if (user && (pathname === "/auth/login" || pathname === "/auth/sign-up")) {
    return NextResponse.redirect(new URL("/protected", request.url));
  }

  // If user is authenticated and on root, redirect to protected
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/protected", request.url));
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
