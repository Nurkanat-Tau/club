"use client";
import { useState } from "react";

/** Uses the phone's share sheet when available, otherwise shows WhatsApp / Telegram / copy. */
export function ShareButton({ title, text, path, label = "Поделиться" }: { title: string; text: string; path: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = () => new URL(path, window.location.origin).toString();

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: url() });
        return;
      } catch {
        /* cancelled — fall through to the menu */
      }
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <button type="button" onClick={share} className="btn-ghost btn-sm">
        ↗ {label}
      </button>
      {open && (
        <div className="card absolute right-0 z-20 mt-2 flex w-56 flex-col p-2 text-sm shadow-lg">
          <a className="rounded-lg px-3 py-2 hover:bg-soft" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`}>WhatsApp</a>
          <a className="rounded-lg px-3 py-2 hover:bg-soft" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(text)}`}>Telegram</a>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-left hover:bg-soft"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url());
                setCopied(true);
              } catch {
                window.prompt("Скопируйте ссылку:", url());
              }
            }}
          >
            {copied ? "Ссылка скопирована ✓" : "Скопировать ссылку"}
          </button>
        </div>
      )}
    </div>
  );
}
