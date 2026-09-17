import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

async function fonts() {
  const dir = path.join(process.cwd(), "lib/fonts");
  const [bold, regular] = await Promise.all([
    readFile(path.join(dir, "DejaVuSans-Bold.ttf")),
    readFile(path.join(dir, "DejaVuSans.ttf")),
  ]);
  return [
    { name: "DejaVu", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "DejaVu", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}

/** Link-preview card (WhatsApp / Telegram / Instagram). Cyrillic-safe font, no emoji (needs network). */
export async function ogCard({ kicker, title, lines, color }: { kicker: string; title: string; lines: string[]; color: string }) {
  const t = title.length > 70 ? title.slice(0, 67) + "…" : title;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#faf7f2", fontFamily: "DejaVu", padding: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#ea580c", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700 }}>C</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#1c1917" }}>Club · Шымкент</div>
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 30, color, fontWeight: 700 }}>{kicker}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: t.length > 40 ? 58 : 72, fontWeight: 700, color: "#1c1917", lineHeight: 1.1 }}>{t}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 8 }}>
          {lines.filter(Boolean).slice(0, 3).map((l, i) => (
            <div key={i} style={{ display: "flex", fontSize: 30, color: "#57534e" }}>{l.length > 80 ? l.slice(0, 77) + "…" : l}</div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: color, display: "flex" }} />
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
