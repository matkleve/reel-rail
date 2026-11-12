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

/** The login page's words — German when the browser asks for German first, like the app (src/i18n). */
const WORDS = {
  en: { lang: "en", password: "Password", open: "Open", wrong: "Wrong password." },
  de: { lang: "de", password: "Passwort", open: "Öffnen", wrong: "Falsches Passwort." },
};

function wordsFor(request: Request) {
  return /^de\b/i.test(request.headers.get("accept-language") ?? "") ? WORDS.de : WORDS.en;
}

// Colours and type of the app's light "Sand" theme (src/styles/tokens.css) — this page runs
// before the app's CSS exists, so they are repeated here.
function loginPage(error: boolean, status: number, w = WORDS.en): Response {
  const html = `<!doctype html><html lang="${w.lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f5ede3">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="reel-rail">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<title>reel-rail</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5ede3;color:#2b211b;font:16px ui-rounded,system-ui,-apple-system,sans-serif}
form{display:flex;flex-direction:column;align-items:stretch;gap:12px;width:min(320px,calc(100vw - 32px))}
img{width:88px;height:88px;margin:0 auto 4px;filter:drop-shadow(0 12px 24px rgb(120 80 50/.22))}
h1{margin:0 0 10px;font:600 34px/1.1 Georgia,"Times New Roman",serif;text-align:center;letter-spacing:-.02em}
input{height:52px;padding:0 18px;border:0;border-radius:999px;background:#fff;color:inherit;font:inherit;box-shadow:0 1px 3px rgb(120 80 50/.1)}
input:focus{outline:none;box-shadow:0 0 0 3px rgb(200 100 59/.35)}
button{height:52px;border:0;border-radius:999px;background:#c8643b;color:#fff;font:700 16px ui-rounded,system-ui,-apple-system,sans-serif;cursor:pointer}
button:active{transform:scale(.98)}
p{margin:0;color:#b53c30;text-align:center}</style></head><body>
<form method="post" action="${LOGIN_PATH}"><img src="/icon.svg" alt=""><h1>reel-rail</h1>
<input type="password" name="password" placeholder="${w.password}" aria-label="${w.password}" autocomplete="current-password" autofocus required>
${error ? `<p>${w.wrong}</p>` : ""}<button>${w.open}</button></form></body></html>`;
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
    if (form.get("password") !== password) return loginPage(true, 401, wordsFor(request));
    return new Response(null, {
      status: 303,
      headers: {
        location: "/",
        "set-cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`,
      },
    });
  }

  if (cookieValue(request) === token) return next();
  return loginPage(false, 401, wordsFor(request));
}
