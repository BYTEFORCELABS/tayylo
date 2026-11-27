import { NextResponse, type NextRequest } from "next/server";

/**
 * admin.tayylo.com is served by this same deployment. Requests to the admin
 * host are rewritten into src/app/admin/* (so /users there renders
 * /admin/users), and /admin/* is unreachable on every other host.
 *
 * This only routes. Access control happens in the admin pages and
 * /api/admin/* handlers (src/lib/admin/auth.ts), which re-check the staff
 * role in the database on every request.
 *
 * Local development: open http://admin.localhost:3000.
 */
function isAdminHost(host: string) {
  const name = host.split(":")[0].toLowerCase();
  const configured = process.env.ADMIN_HOST?.split(":")[0].toLowerCase();
  return name === configured || name.startsWith("admin.");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  if (isAdminHost(host)) {
    // The API (including /api/auth) is shared with the apps; only pages move.
    if (pathname.startsWith("/api/")) return NextResponse.next();
    // Keep URLs clean: /admin/users → /users on the admin host.
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice("/admin".length) || "/";
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files (anything with an extension).
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
