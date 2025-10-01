import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ✅ If logged in and trying to access "/" or "/auth/*", send to dashboard
    if (token && (pathname === "/" || pathname.startsWith("/auth"))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // ✅ If not logged in and trying to access protected routes, send to landing page "/"
    if (
      !token &&
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/trade") ||
        pathname.startsWith("/assets"))
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Otherwise allow request
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/", // landing page doubles as sign-in
    },
  }
);

export const config = {
  matcher: [
    "/", 
    "/auth/:path*", 
    "/assets", 
    "/trade/:path*", 
    "/dashboard/:path*",
  ],
};
