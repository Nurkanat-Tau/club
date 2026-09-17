// End-to-end run against a real, throwaway Postgres (it is WIPED). Needs `npm run build` and playwright.
// The database URL is hardcoded below — change it for your machine. Run: node tests/e2e/full-flow.e2e.mjs
import { chromium } from "playwright";
import { execSync, spawn } from "node:child_process";
const B = "http://localhost:3200";
const env = { ...process.env, PORT: "3200", DATABASE_URL: "postgres://tester:pw@localhost:5432/club_test",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef0123", ADMIN_EMAILS: "boss@club.test" };
let server;
execSync(`psql postgres://tester:pw@localhost:5432/club_test -qc "drop schema public cascade; create schema public;"`);
const start = async () => {
  server = spawn("npm", ["start"], { cwd: process.cwd(), env, stdio: "ignore", detached: true });
  for (let i = 0; i < 40; i++) { try { await fetch(B + "/"); return; } catch { await new Promise((r) => setTimeout(r, 250)); } }
  throw new Error("server did not start");
};
const stop = () => { try { process.kill(-server.pid); } catch {} };
const step = (s) => console.log("✓", s);
const errors = [];
await start();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
try {
  const org = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  org.on("pageerror", (e) => errors.push(e.message));
  await org.goto(B + "/shymkent");
  await org.getByText("Пока ни одного клуба").waitFor();
  await org.screenshot({ path: "/tmp/n1-empty.png", fullPage: true });
  step("empty city page");

  await org.getByRole("link", { name: "Создать клуб" }).first().click();
  await org.waitForURL(/new-club/);
  await org.fill("#name", "Шахматы в кофейне");
  await org.selectOption("#category", "chess");
  if (await org.locator("#description").isVisible()) throw new Error("optional fields should start collapsed");
  await org.fill("#schedule_text", "Каждое воскресенье в 16:00");
  await org.fill("#meeting_point", "Антикафе на Тауке хана");
  await org.fill("#email", "Erlan@Club.test");
  await org.fill("#password", "123");
  await org.evaluate(() => document.querySelectorAll("input[minlength]").forEach((i) => i.removeAttribute("minlength")));
  await org.getByRole("button", { name: "Создать клуб" }).click();
  await org.getByText(/минимум 6 символов/).waitFor();
  if ((await org.inputValue("#name")) !== "Шахматы в кофейне") throw new Error("form not refilled");
  step("short sign-up form; errors keep input");
  await org.getByText("Ещё о клубе").click();
  await org.fill("#description", "Быстрые партии и дружеские турниры для взрослых любителей.");
  await org.fill("#organizer_name", "Ерлан");
  await org.fill("#password", "secret1");
  await org.fill("#chat_link", "https://chat.whatsapp.com/abc");
  await org.getByRole("button", { name: "Создать клуб" }).click();
  await org.waitForURL(/\/org\?welcome=1/, { timeout: 8000 }).catch(async (e) => { await org.screenshot({ path: "/tmp/dbg.png", fullPage: true }); console.log("cat=", await org.inputValue("#category"), "err=", await org.locator(".err").allTextContents()); throw e; });
  await org.getByText("Клуб создан!").waitFor();
  step("club created + organizer logged in");

  await org.getByRole("link", { name: "Создать первую встречу" }).click();
  await org.fill('input[name="title"]', "Воскресный блиц");
  const d = new Date(Date.now() + 2 * 86400000 + 5 * 3600000).toISOString().slice(0, 10);
  await org.fill('input[name="date"]', d);
  await org.fill('input[name="time"]', "16:00");
  await org.fill('input[name="price_text"]', "1500");
  await org.fill('input[name="capacity"]', "20");
  await org.getByRole("button", { name: "Создать встречу" }).click();
  await org.waitForURL(/created=1/);
  await org.getByText(/Встреча создана/).first().waitFor().catch(() => {});
  const evUrl0 = org.url();
  await org.goto(B + "/org/events/new");
  await org.fill('input[name="title"]', "Вчерашняя встреча");
  await org.fill('input[name="date"]', "2020-01-01");
  await org.evaluate(() => document.querySelectorAll("input[min]").forEach((i) => i.removeAttribute("min")));
  await org.fill('input[name="time"]', "10:00");
  await org.getByRole("button", { name: "Создать встречу" }).click();
  await org.locator(".err").first().waitFor();
  if (await org.inputValue('input[name="title"]') !== "Вчерашняя встреча") throw new Error("event form not refilled");
  step("past-dated event rejected, input kept");
  const evUrl = evUrl0.replace("/org/events/", "/e/").split("?")[0];
  step("event created");

  // second organizer with same email must fail
  const dup = await (await browser.newContext()).newPage();
  await dup.goto(B + "/new-club");
  await dup.fill("#name", "Другой клуб"); await dup.selectOption("#category", "books");
  await dup.fill("#schedule_text", "пт 19:00"); await dup.fill("#meeting_point", "библиотека");
  await dup.fill("#email", "erlan@club.test"); await dup.fill("#password", "anotherpass");
  await dup.getByRole("button", { name: "Создать клуб" }).click();
  await dup.getByText(/уже зарегистрирован — введите свой пароль/).waitFor();
  step("duplicate email rejected");

  // member
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  m.on("pageerror", (e) => errors.push(e.message));
  await m.goto(B + "/shymkent");
  await m.getByText("Воскресный блиц").waitFor();
  await m.locator('a[href="/c/shahmaty-v-kofeyne"]').click();
  await m.getByRole("button", { name: "Вступить в клуб" }).click();
  await m.fill("#phone", "87012223344");
  await m.getByRole("button", { name: "Вступить в клуб" }).click();
  await m.getByText("Как вас зовут?").waitFor();
  await m.fill("#name", "Дана");
  await m.getByRole("button", { name: "Вступить в клуб" }).click();
  await m.getByText("Вы участник клуба").waitFor();
  await m.goto(evUrl);
  await m.getByRole("button", { name: "Я приду" }).click();
  await m.getByText(/Вы записаны/).first().waitFor();
  await m.getByText("1 500 ₸").first().waitFor();
  await m.screenshot({ path: "/tmp/f-event.png", fullPage: true });
  await m.goto(B + "/shymkent"); await m.screenshot({ path: "/tmp/f-city.png", fullPage: true });
  await m.goto(B + "/c/shahmaty-v-kofeyne"); await m.screenshot({ path: "/tmp/f-club.png", fullPage: true });
  await m.goto(evUrl);
  step("member joined + RSVP");

  await org.goto(B + "/org");
  await org.getByRole("link", { name: /Воскресный блиц/ }).click();
  await org.getByText("Дана", { exact: true }).waitFor();
  step("organizer sees member");

  // ---- another device ----
  const d2 = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  d2.on("pageerror", (e) => errors.push(e.message));
  await d2.goto(B + "/me");
  await d2.getByRole("heading", { name: "Войти" }).waitFor();
  await d2.fill("#login-phone", "+7 700 000 00 00");
  await d2.getByRole("button", { name: "Войти" }).click();
  await d2.getByText(/Такого номера ещё нет/).waitFor();
  await d2.fill("#login-phone", "+7 701 222 33 44");
  await d2.getByRole("button", { name: "Войти" }).click();
  await d2.getByText("Воскресный блиц").waitFor();
  await d2.getByText("Шахматы в кофейне").first().waitFor();
  step("second device: just the phone number shows the same events + clubs");

  // third device: known phone in the RSVP form signs in without a new profile
  const d3 = await (await browser.newContext()).newPage();
  await d3.goto(evUrl);
  await d3.getByRole("button", { name: "Я приду" }).click();
  await d3.fill("#phone", "87012223344");
  await d3.getByRole("button", { name: "Я приду" }).click();
  await d3.getByText(/Вы записаны/).first().waitFor();
  await d3.getByText("Идут: 1").first().waitFor();
  step("same phone on another device = same person (no duplicate)");

  // organizer: walk-in + cancel-with-confirm on a second event
  await org.goto(B + "/org/events/new");
  await org.fill('input[name="title"]', "Разовая встреча");
  await org.fill('input[name="date"]', d);
  await org.fill('input[name="time"]', "18:30");
  await org.getByRole("button", { name: "Создать встречу" }).click();
  await org.waitForURL(/created=1/);
  const ev2 = org.url().split("?")[0];
  await org.getByRole("button", { name: "Отменить встречу" }).click();
  await org.getByRole("button", { name: "Да, отменить" }).click();
  await org.getByText(/отменена/i).first().waitFor();
  await m.goto(ev2.replace("/org/events/", "/e/"));
  await m.getByText(/отменена/i).first().waitFor();
  await org.goto(ev2);
  await org.getByRole("button", { name: "Удалить встречу" }).click();
  await org.getByRole("button", { name: "Да, удалить" }).click();
  await org.waitForURL(B + "/org");
  if ((await m.goto(ev2.replace("/org/events/", "/e/"))).status() !== 404) throw new Error("deleted event still there");
  step("cancel + delete event in two taps; members see the cancelled notice");

  // SEO / sharing
  const robots = await (await fetch(B + "/robots.txt")).text();
  if (!robots.includes("Disallow: /admin") || !robots.includes("sitemap.xml")) throw new Error("robots: " + robots);
  const sm = await (await fetch(B + "/sitemap.xml")).text();
  if (!sm.includes("/c/shahmaty-v-kofeyne")) throw new Error("sitemap missing club");
  for (const u of ["/og.png", "/apple-touch-icon.png", "/c/shahmaty-v-kofeyne/opengraph-image", evUrl + "/opengraph-image"]) {
    const r = await fetch(u.startsWith("http") ? u : B + u);
    if (r.status !== 200 || !String(r.headers.get("content-type")).startsWith("image/")) throw new Error(u + " -> " + r.status);
  }
  if ((await fetch(B + "/", { redirect: "manual" })).status >= 400) throw new Error("home broken");
  step("robots, sitemap, OG images, icons");

  // restart server: data must persist
  stop(); await new Promise((r) => setTimeout(r, 1000)); await start();
  step("server restarted");
  await m.goto(B + "/me");
  await m.getByText("Воскресный блиц").waitFor();
  await org.goto(B + "/org/members");
  await org.getByText("Дана", { exact: true }).waitFor();
  step("data persisted after restart (member + organizer sessions still valid)");

  // logout / login
  await org.getByRole("button", { name: "Выйти" }).click();
  await org.waitForURL(/login/);
  await org.fill("#email", "erlan@club.test"); await org.fill("#password", "wrongpass");
  await org.getByRole("button", { name: "Войти" }).click();
  await org.getByText("Неверный email или пароль").waitFor();
  await org.fill("#password", "secret1");
  await org.getByRole("button", { name: "Войти" }).click();
  await org.waitForURL(B + "/org");
  step("login with stored password");
  await org.goto(B + "/admin"); await org.waitForURL(B + "/org");
  step("non-admin blocked from /admin");

  // admin creates own club, lands on /admin, hides the chess club
  const adm = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  adm.on("pageerror", (e) => errors.push(e.message));
  await adm.goto(B + "/new-club");
  await adm.fill("#name", "English Speaking Club"); await adm.selectOption("#category", "english");
  await adm.fill("#schedule_text", "чт 19:00"); await adm.fill("#meeting_point", "кофейня");
  await adm.fill("#email", "boss@club.test"); await adm.fill("#password", "adminpass1");
  await adm.getByRole("button", { name: "Создать клуб" }).click();
  await adm.waitForURL(/\/org/);
  await adm.goto(B + "/admin");
  await adm.getByText("По клубам").waitFor();
  step("admin email is admin automatically");
  await adm.goto(B + "/admin");
  await adm.getByText("По клубам").waitFor();
  await adm.screenshot({ path: "/tmp/n3-admin.png", fullPage: true });
  await adm.locator("li", { hasText: "Шахматы" }).getByRole("button", { name: "Скрыть" }).click();
  await adm.locator("li", { hasText: "Шахматы" }).getByText("скрыт", { exact: true }).waitFor({ timeout: 8000 }).catch(async (e) => { await adm.screenshot({ path: "/tmp/dbg.png", fullPage: true }); throw e; });
  await m.goto(B + "/shymkent");
  if (await m.getByText("Шахматы в кофейне").count()) throw new Error("hidden club still visible");
  const hid = await m.goto(B + "/c/shahmaty-v-kofeyne");
  if (hid.status() !== 404) throw new Error("hidden club page status " + hid.status());
  await org.goto(B + "/c/shahmaty-v-kofeyne");
  await org.getByText(/скрыт/i).first().waitFor();
  await m.goto(B + "/shymkent");
  await m.getByText("English Speaking Club").first().waitFor();
  step("admin hides club");
  await adm.goto(B + "/admin");
  await adm.locator("li", { hasText: "Шахматы" }).getByRole("button", { name: "Показать" }).click();
  await adm.locator("li", { hasText: "Шахматы" }).getByRole("button", { name: "Скрыть" }).waitFor();

  // ---- organizer edits everything ----
  await org.goto(B + "/org/club");
  await org.fill("#name", "Шахматный клуб Шымкента");
  await org.selectOption("#category", "games");
  await org.fill("#description", "Новое описание: блиц, рапид и турниры каждую неделю.");
  await org.fill("#organizer_name", "Ерлан Серикович");
  await org.getByRole("button", { name: "Сохранить изменения" }).click();
  await org.getByText("Сохранено").waitFor();
  if ((await org.inputValue("#category")) !== "games") throw new Error("category not kept");
  await m.goto(B + "/c/shahmaty-v-kofeyne");
  await m.getByRole("heading", { name: "Шахматный клуб Шымкента" }).waitFor();
  await m.getByText("Ерлан Серикович").waitFor();
  await m.getByText("🎮").first().waitFor();
  step("organizer edits name/category/description; same link still works");

  // ---- organizer deletes own club ----
  await org.goto(B + "/org/club");
  await org.getByRole("button", { name: "Удалить клуб" }).click();
  await org.getByRole("button", { name: "Отмена" }).click();
  await org.getByRole("button", { name: "Удалить клуб" }).click();
  await org.getByRole("button", { name: "Да, удалить клуб" }).click();
  await org.waitForURL(/new-club\?deleted=1/);
  await org.getByText("Клуб удалён.").waitFor();
  if (await org.locator("#email").count()) throw new Error("account fields shown to signed-in organizer");
  await m.goto(B + "/shymkent");
  if (await m.getByText("Шахматный клуб Шымкента").count()) throw new Error("deleted club still listed");
  const gone = await m.goto(evUrl);
  if (gone.status() !== 404) throw new Error("deleted event still reachable: " + gone.status());
  await m.goto(B + "/me");
  if (await m.getByText("Воскресный блиц").count()) throw new Error("deleted event still in member list");
  step("organizer deletes own club in two taps; club, events, sign-ups gone");

  // same organizer on another device: no club -> sent to /new-club; can sign up again with email+password
  const org2 = await (await browser.newContext()).newPage();
  await org2.goto(B + "/org/login");
  await org2.fill("#email", "erlan@club.test"); await org2.fill("#password", "secret1");
  await org2.getByRole("button", { name: "Войти" }).click();
  await org2.waitForURL(/new-club/);
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(B + "/new-club");
  await anon.fill("#name", "Блиц-клуб"); await anon.selectOption("#category", "chess");
  await anon.fill("#schedule_text", "пт 19:00"); await anon.fill("#meeting_point", "антикафе");
  await anon.fill("#email", "erlan@club.test"); await anon.fill("#password", "wrongpassword");
  await anon.getByRole("button", { name: "Создать клуб" }).click();
  await anon.getByText(/уже зарегистрирован — введите свой пароль/).waitFor();
  await anon.fill("#password", "secret1");
  await anon.getByRole("button", { name: "Создать клуб" }).click();
  await anon.waitForURL(/\/org\?welcome=1/);
  step("organizer without a club can start a new one (needs correct password)");

  // ---- admin edits + deletes someone else's club ----
  await adm.goto(B + "/admin");
  await adm.locator("li", { hasText: "Блиц-клуб" }).getByRole("link", { name: "Изменить / удалить" }).click();
  await adm.waitForURL(/org\/club\?club=/);
  await adm.getByRole("button", { name: "Удалить клуб" }).click();
  await adm.getByRole("button", { name: "Да, удалить клуб" }).click();
  await adm.waitForURL(/admin\?deleted=1/);
  if (await adm.locator("li", { hasText: "Блиц-клуб" }).count()) throw new Error("admin delete failed");
  step("admin deletes another organizer's club");

  // ---- admin resets a password and a PIN ----
  await adm.fill("#rp-email", "erlan@club.test");
  await adm.getByRole("button", { name: "Выдать временный пароль" }).click();
  const msg = await adm.getByText(/Новый временный пароль/).textContent();
  const temp = msg.match(/: (\S+) —/)[1];
  const org3 = await (await browser.newContext()).newPage();
  await org3.goto(B + "/org/login");
  await org3.fill("#email", "erlan@club.test"); await org3.fill("#password", temp);
  await org3.getByRole("button", { name: "Войти" }).click();
  await org3.waitForURL(/\/org|new-club/);
  // member deletes own profile in two taps
  await m.goto(B + "/me");
  await m.getByRole("button", { name: "Удалить мой профиль" }).click();
  await m.getByRole("button", { name: "Да, удалить всё" }).click();
  await m.getByText("Ваш профиль и все данные удалены.").waitFor();
  await adm.screenshot({ path: "/tmp/f-admin.png", fullPage: true });
  step("admin password reset works; member deleted own profile");

  // ---- admin deletes all ----
  await adm.getByRole("button", { name: /Удалить все клубы/ }).click();
  await adm.getByRole("button", { name: "Да, удалить все" }).click();
  await adm.getByText("Все клубы удалены (1).").waitFor();
  await m.goto(B + "/shymkent");
  await m.getByText("Пока ни одного клуба").waitFor();
  await adm.goto(B + "/admin");
  await adm.getByRole("link", { name: "Создать клуб" }).waitFor();
  step("admin deletes all clubs; site empty; admin keeps access");
} finally {
  await browser.close();
  stop();
  console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no browser errors");
}
