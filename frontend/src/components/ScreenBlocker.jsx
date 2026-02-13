import React, { useEffect, useState, useCallback } from "react";
import { LayoutDashboard } from "lucide-react";


export default function ScreenBlocker({
  minWidth = 1024,
  minHeight = 700,
  allowBypass = false,
  className = "",
}) {
  const [isSupported, setIsSupported] = useState(true);
  const [bypassed, setBypassed] = useState(false);

  const evaluateSupport = useCallback(() => {
    if (typeof window === "undefined") return false;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w >= minWidth && h >= minHeight;
  }, [minWidth, minHeight]);

  useEffect(() => {
    // initial check
    setIsSupported(evaluateSupport());

    const handleResize = () => setIsSupported(evaluateSupport());
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [evaluateSupport]);

  // when bypassed, we allow access regardless of size
  if (isSupported || bypassed) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black text-white p-6 ${className}`}
      aria-live="assertive"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-xl text-center">
        <div className="flex items-center justify-center mb-4">
          <LayoutDashboard className="w-12 h-12" />
        </div>

        <h1 className="text-2xl font-semibold mb-2">Screen Not Supported</h1>

        <p className="text-sm text-zinc-300 mb-6">
          This admin console requires a larger screen to ensure full functionality.
          Minimum: <strong>{minWidth}px</strong> × <strong>{minHeight}px</strong>.
          Please open this site on a tablet or desktop, or resize your window.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setIsSupported(evaluateSupport())}
            className="px-4 py-2 rounded-md border border-zinc-600 bg-zinc-900 hover:bg-zinc-800"
          >
            Retry / Recheck
          </button>

          {allowBypass && (
            <button
              onClick={() => setBypassed(true)}
              className="px-4 py-2 rounded-md border border-transparent text-sm text-zinc-300"
            >
              Continue anyway
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-500 mt-6">
          If you are on a laptop or desktop and still see this message, try increasing
          your browser window size or connecting an external display.
        </p>
      </div>
    </div>
  );
}
