import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "알약 렌즈 - 약국 조제 카운터",
    short_name: "알약 렌즈",
    description: "초정밀 AI Vision 기반 스마트 약국 알약 카운팅 앱",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#064e3b",
    theme_color: "#059669",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
