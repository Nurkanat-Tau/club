import type { City } from "./types";

export const CITIES: City[] = [
  { slug: "shymkent", name: "Шымкент", active: true },
  { slug: "almaty", name: "Алматы", active: false },
  { slug: "astana", name: "Астана", active: false },
  { slug: "turkistan", name: "Туркестан", active: false },
];

export const getCity = (slug: string) => CITIES.find((c) => c.slug === slug && c.active) ?? null;
