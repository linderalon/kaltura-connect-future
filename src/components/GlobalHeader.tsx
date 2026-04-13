import Link from "next/link";

export default function GlobalHeader() {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
      {/* Kaltura logo — top left */}
      <Link href="/" className="flex items-center gap-2 group">
        {/* Wordmark with Kaltura red accent */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/kaltura-logo.png`}
          alt="Kaltura"
          style={{ height: "70px", width: "auto" }}
        />
      </Link>

      {/* App title — top right */}
      <span
        className="text-sm font-medium tracking-tight uppercase"
        style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Centra No1', sans-serif", fontWeight: 500 }}
      >
        Future Teller&nbsp;&nbsp;|&nbsp;&nbsp;Kaltura Connect 2026
      </span>
    </header>
  );
}
