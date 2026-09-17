"use client";
import { useState } from "react";
import { formatPhoneInput } from "@/lib/phone";

/** Phone field that formats Kazakhstan numbers as you type (+7 701 123 45 67). */
export function PhoneInput({ id, name = "phone", defaultValue = "" }: { id: string; name?: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <input
      id={id}
      name={name}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      required
      maxLength={20}
      className="input"
      placeholder="+7 701 123 45 67"
      value={value}
      onChange={(e) => setValue(formatPhoneInput(e.target.value))}
    />
  );
}
