// Ícone do app (câmera estilizada), gerado como PNG pelo Next.
import { ImageResponse } from "next/og";

export function iconResponse(size: number) {
  const r = size * 0.22;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f14" }}>
        <div style={{ width: size * 0.78, height: size * 0.78, borderRadius: r, background: "linear-gradient(160deg, #ec4899, #f97316)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: size * 0.32, height: size * 0.32, borderRadius: size, border: `${Math.round(size * 0.05)}px solid white` }} />
          <div style={{ position: "absolute", top: size * 0.12, right: size * 0.12, width: size * 0.08, height: size * 0.08, borderRadius: size, background: "white" }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
