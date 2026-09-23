import { ImageResponse } from "next/og";

export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
          borderRadius: 44,
          fontSize: 104,
          boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        }}
      >
        💊
      </div>
    ),
    {
      ...size,
    }
  );
}
