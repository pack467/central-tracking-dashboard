import { NextResponse, type NextRequest } from "next/server";
import { canonicalRoute } from "./app/lib/canonical-route";
export function proxy(request: NextRequest) { const target = canonicalRoute(new URL(request.url)); return target ? NextResponse.redirect(target.url, target.status) : NextResponse.next(); }
export const config = { matcher: ["/((?!api|_next|_vinext|.*\\..*).*)"] };
