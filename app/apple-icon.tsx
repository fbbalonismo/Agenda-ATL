import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícone da Tela de Início: folha de calendário com um sino.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2f5bea" }}>
        <div style={{ width: 112, height: 112, borderRadius: 22, background: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ height: 30, background: "#f0352b" }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, fontWeight: 800, color: "#16202e" }}>8h</div>
        </div>
      </div>
    ),
    size,
  );
}
