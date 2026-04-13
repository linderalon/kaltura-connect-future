import { ImageResponse } from "next/og";
import { getSessionById } from "@/lib/supabase";
import { getPersonaDetails } from "@/lib/personaEngine";
import type { Persona } from "@/lib/personaEngine";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: { sessionId: string };
}

export default async function OGImage({ params }: Props) {
  const session = await getSessionById(params.sessionId);
  const details = session
    ? getPersonaDetails(session.persona as Persona)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          padding: "48px 64px",
          position: "relative",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #5BC686 0%, #FFD700 100%)",
          }}
        />

        {/* Content card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "#16213E",
            borderRadius: 24,
            padding: "40px 56px",
            width: "100%",
            border: "1px solid rgba(255,215,0,0.2)",
          }}
        >
          {session ? (
            <>
              {/* Emoji */}
              <div style={{ fontSize: 88, marginBottom: 12, lineHeight: 1 }}>
                {details?.emoji ?? "🔮"}
              </div>

              {/* Visitor name */}
              <div
                style={{
                  fontSize: 62,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  textAlign: "center",
                  marginBottom: 10,
                  lineHeight: 1.1,
                }}
              >
                {session.visitor_name}
              </div>

              {/* Persona name */}
              <div
                style={{
                  fontSize: 30,
                  color: "#FFD700",
                  textAlign: "center",
                  marginBottom: 22,
                  fontWeight: 600,
                }}
              >
                {details?.name ?? "Future Revealed"}
              </div>

              {/* Card summary */}
              <div
                style={{
                  fontSize: 24,
                  color: "rgba(255,255,255,0.7)",
                  textAlign: "center",
                  maxWidth: 860,
                  lineHeight: 1.55,
                }}
              >
                {session.card_summary}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 96, marginBottom: 20, lineHeight: 1 }}>
                🔮
              </div>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                Kaltura Future Teller
              </div>
              <div
                style={{
                  fontSize: 32,
                  color: "#FFD700",
                  textAlign: "center",
                  marginTop: 16,
                }}
              >
                Your 2026 destiny awaits
              </div>
            </>
          )}
        </div>

        {/* Kaltura branding */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#FFFFFF",
              display: "flex",
            }}
          >
            <span>K</span>
            <span style={{ color: "#5BC686" }}>altura</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 28 }}>|</div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)" }}>
            Kaltura Connect 2026
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #5BC686 0%, #FFD700 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
