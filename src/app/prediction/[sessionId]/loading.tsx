export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Hero skeleton */}
      <div
        className="py-12 px-8 text-center border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-5 w-64 rounded-full mx-auto mb-4 animate-pulse"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="h-10 w-96 rounded-full mx-auto mb-3 animate-pulse"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        />
        <div
          className="h-6 w-52 rounded-full mx-auto animate-pulse"
          style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
        />
      </div>

      {/* Card skeleton */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div
          className="rounded-3xl overflow-hidden animate-pulse"
          style={{ backgroundColor: "#16213E", border: "1px solid rgba(255,215,0,0.08)" }}
        >
          {/* Card header band */}
          <div
            className="h-28"
            style={{ backgroundColor: "rgba(91,198,134,0.25)" }}
          />

          <div className="px-10 py-10 flex flex-col items-center gap-6">
            {/* Visitor name */}
            <div
              className="h-14 w-72 rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            />

            {/* Emoji placeholder */}
            <div
              className="w-28 h-28 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            />

            {/* Persona name */}
            <div
              className="h-7 w-52 rounded-lg"
              style={{ backgroundColor: "rgba(255,215,0,0.12)" }}
            />

            {/* Summary placeholder */}
            <div className="w-full space-y-3">
              <div
                className="h-5 w-full rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
              />
              <div
                className="h-5 w-5/6 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              />
            </div>

            {/* Divider */}
            <div
              className="w-full h-px"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />

            {/* Prediction text placeholder lines */}
            {[100, 95, 98, 90, 96, 85, 92].map((w, i) => (
              <div
                key={i}
                className="h-4 rounded-lg"
                style={{
                  width: `${w}%`,
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Button skeletons */}
        <div className="flex gap-4 mt-8 justify-center flex-wrap">
          {[180, 200, 240].map((w, i) => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{
                width: w,
                backgroundColor: "rgba(255,255,255,0.07)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
