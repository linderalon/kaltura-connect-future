import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";
import Providers from "./providers";

// ─── Kaltura Centra No.1 ───────────────────────────────────────────────────
// next/font/local handles preloading, subsetting, and font-display automatically.
// Paths are relative to THIS file (src/app/layout.tsx → src/fonts/).
const centra = localFont({
  src: [
    { path: "../fonts/CentraNo1-Hairline.otf",       weight: "100", style: "normal"  },
    { path: "../fonts/CentraNo1-HairlineItalic.otf",  weight: "100", style: "italic"  },
    { path: "../fonts/CentraNo1-Thin.otf",            weight: "200", style: "normal"  },
    { path: "../fonts/CentraNo1-ThinItalic.otf",      weight: "200", style: "italic"  },
    { path: "../fonts/CentraNo1-Light.otf",           weight: "300", style: "normal"  },
    { path: "../fonts/CentraNo1-LightItalic.otf",     weight: "300", style: "italic"  },
    { path: "../fonts/CentraNo1-Book.otf",            weight: "400", style: "normal"  },
    { path: "../fonts/CentraNo1-BookItalic.otf",      weight: "400", style: "italic"  },
    { path: "../fonts/CentraNo1-Medium.otf",          weight: "500", style: "normal"  },
    { path: "../fonts/CentraNo1-MediumItalic.otf",    weight: "500", style: "italic"  },
    { path: "../fonts/CentraNo1-Bold.otf",            weight: "700", style: "normal"  },
    { path: "../fonts/CentraNo1-BoldItalic.otf",      weight: "700", style: "italic"  },
    { path: "../fonts/CentraNo1-Extrabold.otf",       weight: "800", style: "normal"  },
    { path: "../fonts/CentraNo1-ExtraboldItalic.otf", weight: "800", style: "italic"  },
    { path: "../fonts/CentraNo1-Black.otf",           weight: "900", style: "normal"  },
    { path: "../fonts/CentraNo1-BlackItalic.otf",     weight: "900", style: "italic"  },
  ],
  variable: "--font-centra",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Kaltura Future Teller",
  description: "A mystical experience powered by Kaltura — Connect 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={centra.variable}>
      <head>
        {/* Pre-warm the connection to the Kaltura avatar service */}
        <link rel="preconnect" href="https://meet.avatar.us.kaltura.ai" />
        <link rel="dns-prefetch" href="https://meet.avatar.us.kaltura.ai" />
        <link rel="preconnect" href="https://cfvod.kaltura.com" />
      </head>
      <body
        className={centra.className}
        style={{
          backgroundColor: "#0A0A0A",
          color: "#ffffff",
          minHeight: "100vh",
        }}
      >
        <Providers>
          <GlobalHeader />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
