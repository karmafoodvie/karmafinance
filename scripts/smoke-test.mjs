// Einfacher End-to-End-Smoke-Test gegen eine laufende Instanz
// (lokal via `npm run dev` oder gegen ein Vercel-Preview).
//
// Voraussetzung: ein Test-Account mit role='admin', der die Umgebung
// nicht stört (z. B. dein eigener Login). Läuft NICHT automatisch in
// CI, weil er echte Schreibvorgänge gegen die DB macht.
//
// Seit der Zwei-Faktor-Pflicht (siehe README, Abschnitt
// "Zwei-Faktor-Login") landet der Login zuerst auf /mfa-setup (falls
// der Test-Account noch keinen Faktor hat) oder /mfa-challenge (falls
// schon einer existiert). Ohne SMOKE_TOTP_SECRET bricht der Test dort
// kontrolliert ab, statt den restlichen Ablauf zu verfälschen — Login
// selbst gilt dann trotzdem als "OK", nur die Folgeschritte werden
// übersprungen. Mit SMOKE_TOTP_SECRET wird der Code automatisch
// erzeugt (otplib) und der Test läuft komplett durch.
//
// Verwendung:
//   npx playwright install chromium   # einmalig
//   SMOKE_EMAIL=du@karmafood.at SMOKE_PASSWORD=... node scripts/smoke-test.mjs
//   # optional: SMOKE_BASE_URL=https://dein-preview.vercel.app
//   # optional, für den vollen Durchlauf inkl. 2FA:
//   #   SMOKE_TOTP_SECRET=<Base32-Secret des Test-Accounts>
//   #   (steht bei /mfa-setup unter "Manuell eintragen" — einmal für den
//   #   Test-Account einrichten und das Secret hier eintragen)

import { chromium } from "playwright";
import { authenticator } from "otplib";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const TOTP_SECRET = process.env.SMOKE_TOTP_SECRET;

if (!EMAIL || !PASSWORD) {
  console.error("SMOKE_EMAIL und SMOKE_PASSWORD müssen gesetzt sein.");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

async function step(name, fn) {
  try {
    await fn();
    console.log(`OK   ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

await step("root redirects to /login when logged out", async () => {
  await page.goto(BASE + "/");
  await page.waitForURL(/\/login/);
});

await step("login", async () => {
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|mfa-setup|mfa-challenge)/, {
    timeout: 10000,
  });
});

let reachedDashboard = page.url().includes("/dashboard");

if (!reachedDashboard) {
  if (!TOTP_SECRET) {
    console.log(
      "SKIP restliche Schritte: Login OK, aber 2FA-Seite erreicht " +
        "(" + page.url() + ") und SMOKE_TOTP_SECRET ist nicht gesetzt.",
    );
  } else {
    await step("Zwei-Faktor-Code eingeben", async () => {
      const code = authenticator.generate(TOTP_SECRET);
      await page.fill("#code", code);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    });
    reachedDashboard = page.url().includes("/dashboard");
  }
}

if (reachedDashboard) {
  await step("dashboard renders KPI tiles and charts", async () => {
    await page.waitForSelector("text=Umsatz gesamt");
    await page.waitForSelector("svg.recharts-surface");
  });

  await step("standorte page renders all active locations", async () => {
    await page.goto(BASE + "/erfassen/standorte");
    await page.waitForSelector("text=Börse (1010)");
    await page.waitForSelector("text=Inkustraße");
  });

  await step("shopify page renders form", async () => {
    await page.goto(BASE + "/erfassen/shopify");
    await page.waitForSelector("#shopify-payout");
  });

  await step("lieferdienste page renders wolt + foodora", async () => {
    await page.goto(BASE + "/erfassen/lieferdienste");
    await page.waitForSelector("text=Wolt");
    await page.waitForSelector("text=Foodora");
  });

  await step("no client-side console/page errors captured", async () => {
    if (errors.length) throw new Error(errors.join(" | "));
  });

  await step("sign out returns to login", async () => {
    await page.goto(BASE + "/dashboard");
    await page.click("text=Abmelden");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
}

await browser.close();
console.log("DONE");
