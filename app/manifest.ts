import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Club — сообщества рядом",
    short_name: "Club",
    description: "Клубы и встречи по интересам в вашем городе",
    start_url: "/shymkent",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#ea580c",
    lang: "ru",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
