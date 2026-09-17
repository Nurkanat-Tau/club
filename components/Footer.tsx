import Link from "next/link";
import { waLink } from "@/lib/phone";

export function Footer() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
  return (
    <footer className="mt-auto flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-line px-4 py-6 text-sm text-muted">
      <Link href="/new-club" className="underline">Создать клуб</Link>
      <Link href="/org/login" className="underline">Вход для организаторов</Link>
      <Link href="/privacy" className="underline">Данные и правила</Link>
      {contact && (
        <a href={waLink(contact, "Здравствуйте! Вопрос про Club.")} className="underline" target="_blank" rel="noopener noreferrer">
          Связаться
        </a>
      )}
    </footer>
  );
}
