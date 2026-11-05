import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda Alertas",
    short_name: "Agenda",
    description: "Agende compromissos por voz, foto, PDF ou toque.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fa",
    theme_color: "#2f5bea",
    lang: "pt-BR",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
