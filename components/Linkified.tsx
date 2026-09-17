import { linkify } from "@/lib/text";

/** Plain text with clickable links; never overflows its box. */
export function Linkified({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-line break-words [overflow-wrap:anywhere] ${className}`}>
      {linkify(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="underline">
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}
