import { TOKEN_METADATA } from "@repo/common";

export function LoadingSkeleton({pageType}:{pageType: "dashboard" | "market" | "portfolio"}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
      <div className="relative">
        {Object.values(TOKEN_METADATA).map((crypto, index) => {
          const angle = (index / Object.values(TOKEN_METADATA).length) * 360;
          const radius = 200;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;

          return (
            <div
              key={crypto.name}
              className="absolute animate-float"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: "translate(-50%, -50%)",
                animationDelay: `${index * 0.2}s`,
                animationDuration: "3s",
              }}
            >
              <div
                className="w-16 h-16 rounded-full border-2 bg-white p-2 shadow-2xl backdrop-blur-sm animate-pulse"
                style={{
                  borderColor: crypto.color,
                  animationDelay: `${index * 0.15}s`,
                  boxShadow: `0 0 20px ${crypto.color}40`,
                }}
              >
                <img
                  src={crypto.logo}
                  alt={crypto.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          );
        })}

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-cyan-500 animate-spin"></div>

            <div className="absolute inset-3 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-xl"></div>

            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-emerald-400 animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Loading {pageType}
          </h2>
          <p className="text-slate-400 animate-pulse">
            Fetching latest prices...
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-emerald-500/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-20px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
