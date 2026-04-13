import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSessionById } from "@/lib/supabase";
import { getPersonaDetails } from "@/lib/personaEngine";
import type { Persona } from "@/lib/personaEngine";
import { PredictionCardClient } from "./PredictionCardClient";

interface Props {
  params: { sessionId: string };
}

// ---------------------------------------------------------------------------
// Open Graph metadata — generated per-session
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getSessionById(params.sessionId);

  if (!session) {
    return {
      title: "Prediction Not Found | Kaltura Future Teller",
      description: "This prediction could not be found or may have expired.",
    };
  }

  const title = `${session.visitor_name}'s 2026 Prediction | Kaltura Future Teller`;
  const description = session.card_summary;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Kaltura Future Teller",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ---------------------------------------------------------------------------
// Not-found view (shown inline — friendlier than a hard 404)
// ---------------------------------------------------------------------------

function NotFoundView({ sessionId }: { sessionId: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="text-7xl mb-6 select-none">🔮</div>
      <h1 className="text-4xl font-bold text-white mb-4">
        The oracle couldn&rsquo;t find this prediction
      </h1>
      <p
        className="text-xl max-w-md leading-relaxed mb-8"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Session{" "}
        <code
          className="text-sm px-2 py-1 rounded-md font-mono"
          style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "rgba(255,215,0,0.7)",
          }}
        >
          {sessionId}
        </code>{" "}
        could not be located. It may have expired or the link may be incorrect.
      </p>
      <a
        href="/"
        className="inline-block px-8 py-4 rounded-xl font-bold text-lg text-white tracking-normal"
        style={{
          backgroundColor: "#5BC686",
          boxShadow: "0 0 24px rgba(91,198,134,0.4)",
        }}
      >
        Visit the Future Teller →
      </a>
      <div className="mt-16 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/kaltura-logo.png"
          alt="Kaltura"
          style={{ height: "60px", width: "auto" }}
        />
        <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
        <span
          className="text-sm tracking-tight"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Future Teller
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PredictionPage({ params }: Props) {
  const session = await getSessionById(params.sessionId);

  if (!session) {
    return <NotFoundView sessionId={params.sessionId} />;
  }

  const details = getPersonaDetails(session.persona as Persona);

  // Build the share URL from the request headers (works in both dev and prod)
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const shareUrl = `${proto}://${host}/prediction/${params.sessionId}`;

  return (
    <PredictionCardClient
      session={session}
      details={details}
      shareUrl={shareUrl}
    />
  );
}
