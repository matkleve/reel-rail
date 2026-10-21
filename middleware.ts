import { next } from "@vercel/functions";

/**
 * Password gate for the hosted app (Vercel Routing Middleware; runs before
 * every request, never in the browser).
 *
 * A login page + long-lived cookie rather than HTTP Basic Auth: Basic Auth
 * prompts are unreliable in installed PWAs (iPad home-screen apps in
 * particular), a cookie is not.
 *
 * The password lives only in the REEL_PASSWORD environment variable. The
 * cookie holds a hash of it, so changing the password logs everyone out.
 * Without REEL_PASSWORD the app stays locked (fail closed).
 */

const COOKIE = "reel_auth";
const LOGIN_PATH = "/__login";
// The browser fetches these without cookies; the app cannot install without them.
const PUBLIC = /^\/(manifest\.webmanifest|icon(-\d+)?\.(png|svg)|apple-touch-icon\.png)$/;

async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`reel-rail:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  return raw
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === COOKIE)?.[1];
}

function loginPage(error: boolean, status: number): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#131316">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="reel-rail">
<link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<title>reel-rail</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0c0e;color:#f2f2f4;font:16px system-ui,-apple-system,sans-serif}
form{display:flex;flex-direction:column;gap:12px;width:min(320px,calc(100vw - 32px))}
h1{margin:0 0 8px;font-size:40px;letter-spacing:-.03em}
input{height:48px;padding:0 14px;border:1px solid #3c3c44;border-radius:12px;background:#131316;color:inherit;font:inherit}
input:focus{outline:none;border-color:#6f9dff;box-shadow:0 0 0 3px rgb(111 157 255/.2)}
button{height:48px;border:0;border-radius:12px;background:#f2f2f4;color:#0c0c0e;font:600 16px system-ui,-apple-system,sans-serif;cursor:pointer}
p{margin:0;color:#f77b7b}</style></head><body>
<form method="post" action="${LOGIN_PATH}"><h1>reel-rail</h1>
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
${error ? "<p>Wrong password.</p>" : ""}<button>Open</button></form></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (PUBLIC.test(url.pathname)) return next();

  const password = process.env.REEL_PASSWORD;
  if (!password) return new Response("reel-rail: REEL_PASSWORD is not set.", { status: 503 });
  const token = await tokenFor(password);

  if (url.pathname === LOGIN_PATH && request.method === "POST") {
    const form = await request.formData();
    if (form.get("password") !== password) return loginPage(true, 401);
    return new Response(null, {
      status: 303,
      headers: {
        location: "/",
        "set-cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`,
      },
    });
  }

  if (cookieValue(request) === token) return next();
  return loginPage(false, 401);
}
