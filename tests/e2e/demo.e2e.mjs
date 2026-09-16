// End-to-end smoke test (demo mode). Usage:
//   npm run build && ALLOW_DEMO=1 PORT=3100 npm start   (in another terminal)
//   npx -y -p playwright node tests/e2e/demo.e2e.mjs   (needs a Chromium: npx playwright install chromium)
import { chromium } from "playwright";
const B = "http://localhost:3100";
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const step = (s) => console.log("✓", s);

await page.goto(B + "/");
await page.screenshot({ path: "/tmp/01-home.png" });
await page.getByRole("link", { name: /Шымкент/ }).click();
await page.waitForURL(/shymkent/);
await page.getByText("Клубы-основатели").waitFor();
await page.screenshot({ path: "/tmp/02-city.png", fullPage: true });
step("city page");

await page.locator(`a[href="/c/english"]`).click();
await page.waitForURL(/\/c\/english/);
await page.getByRole("button", { name: "Вступить в клуб" }).click();
// bad phone first
await page.fill("#name", "Тест");
await page.fill("#phone", "123");
await page.check('input[name="consent"]');
await page.getByRole("button", { name: "Вступить в клуб" }).click();
await page.getByText(/казахстанский номер/).waitFor();
step("phone validation");
await page.fill("#phone", "8 707 555 44 33");
await page.getByRole("button", { name: "Вступить в клуб" }).click();
await page.getByText("Вы участник клуба").waitFor();
await page.screenshot({ path: "/tmp/03-club-joined.png", fullPage: true });
step("join club");
await page.reload();
await page.getByText("Вы участник клуба").waitFor();
step("membership persists");

await page.getByRole("link", { name: /Money & Dreams/ }).click();
await page.waitForURL(/\/e\//);
const eventUrl = page.url();
await page.getByRole("button", { name: "Я приду" }).click(); // known member -> one click
await page.getByText(/Вы записаны/).first().waitFor();
await page.reload();
await page.getByText("✅ Вы записаны").waitFor();
await page.screenshot({ path: "/tmp/04-event-going.png", fullPage: true });
step("rsvp");
const ics = await ctx.request.get(eventUrl + "/ics");
if (!(await ics.text()).includes("BEGIN:VEVENT")) throw new Error("ics broken");
step("ics");

await page.goto(B + "/me");
await page.getByText("Я записан(а)").waitFor();
await page.getByText("Money & Dreams").waitFor();
await page.screenshot({ path: "/tmp/05-me.png", fullPage: true });
step("me page");

// cancel
await page.goto(eventUrl);
await page.getByRole("button", { name: "Не смогу прийти" }).click();
await page.getByRole("button", { name: "Я приду" }).waitFor();
step("cancel rsvp");
await page.getByRole("button", { name: "Я приду" }).click();
await page.getByText(/Вы записаны/).first().waitFor();

// new visitor in another context, capacity + organizer
const org = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
org.on("pageerror", (e) => errors.push("org pageerror: " + e.message));
await org.goto(B + "/org");
await org.waitForURL(/login/);
await org.fill("#email", "english@club.kz");
await org.fill("#password", "wrong");
await org.getByRole("button", { name: "Войти" }).click();
await org.getByText("Неверный email или пароль").waitFor();
step("bad login rejected");
await org.fill("#password", "demo");
await org.getByRole("button", { name: "Войти" }).click();
await org.waitForURL(B + "/org");
await org.screenshot({ path: "/tmp/06-org.png", fullPage: true });
step("org login");

await org.getByRole("link", { name: /Money & Dreams/ }).click();
await org.getByText("Тест", { exact: true }).waitFor();
await org.screenshot({ path: "/tmp/07-org-event.png", fullPage: true });
step("organizer sees new rsvp");

// organizer cannot access another club via ?club=
await org.goto(B + "/org?club=club-run");
await org.getByText("English Speaking Club").first().waitFor();
step("club param ignored for non-admin");

// create event
await org.goto(B + "/org/events/new");
await org.fill('input[name="title"]', "E2E тестовая встреча");
await org.fill('input[name="starts_at"]', "2030-01-10T19:00");
await org.fill('input[name="capacity"]', "1");
await org.getByRole("button", { name: "Создать встречу" }).click();
await org.waitForURL(/created=1/);
const newEventUrl = org.url().replace("/org/events/", "/e/").split("?")[0];
step("create event");

// past event: mark attendance on ev-4 (english debate)
await org.goto(B + "/org/events/ev-6");
const notFound = await org.getByText("Страница не найдена").count();
if (!notFound) throw new Error("organizer could open other club's event");
step("other club event blocked");
await org.goto(B + "/org/events/ev-4");
await org.getByRole("button", { name: "Не пришёл" }).first().click();
await org.waitForTimeout(500);
step("mark attendance");

// member hits capacity 1
await page.goto(newEventUrl);
await page.getByRole("button", { name: "Я приду" }).click();
await page.getByText(/Вы записаны/).first().waitFor();
const stranger = await (await browser.newContext()).newPage();
await stranger.goto(newEventUrl);
await stranger.getByText("Мест больше нет").waitFor();
step("capacity respected");

// feedback on past event: member rsvp'd earlier? use /me after admin
// admin
const adm = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await adm.goto(B + "/org/login");
await adm.fill("#email", "admin@club.kz");
await adm.fill("#password", "demo");
await adm.getByRole("button", { name: "Войти" }).click();
await adm.waitForURL(/admin/);
await adm.getByText("Эксперимент: Шымкент").waitFor();
await adm.screenshot({ path: "/tmp/08-admin.png", fullPage: true });
await adm.getByRole("link", { name: /Горы рядом/ }).click();
await adm.getByText("Каньон Аксу").waitFor();
step("admin dashboard + club drilldown");

// direct POST attack: server action without session should not work -> covered by requireOrg
await org.goto(B + "/org/members");
await org.getByText("Тест", { exact: true }).waitFor();
step("members list");

// organizer blocked from admin
await org.goto(B + "/admin");
await org.waitForURL(B + "/org");
step("admin blocked for organizer");

const notfound = await ctx.request.get(B + "/almaty");
console.log("almaty status", notfound.status());
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no browser errors");
await browser.close();
