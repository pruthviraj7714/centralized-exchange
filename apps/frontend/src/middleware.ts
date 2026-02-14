import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token?.accessToken;

    if (token && (pathname === "/")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (
      !token &&
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/trade") ||
        pathname.startsWith("/portfolio") ||
        pathname.startsWith("/wallet") ||
        pathname.startsWith("/assets"))
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn : "/"
    }
  }
);

export const config = {
  matcher: [
    "/", 
    "/portfolio", 
    "/wallet", 
    "/assets", 
    "/trade/:path*", 
    "/dashboard/:path*",
  ],
};
