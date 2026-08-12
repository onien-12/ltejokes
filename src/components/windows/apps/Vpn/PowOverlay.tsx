import { useFingerprintStore } from "../../../../store/useFingerprintStore";
import { Translate } from "./i18n";

/**
 * Covers the window while a proof-of-work runs. The work is probabilistic, so
 * `max` is the expected count rather than a ceiling and the bar can sit at 100%
 * while the search continues.
 */
export default function PowOverlay({ t }: { t: Translate }) {
  const pow = useFingerprintStore((s) => s.pow);
  if (!pow) return null;

  const total = pow.max || 1;
  const percent = Math.min(100, (pow.progress / total) * 100);
  const done = (pow.progress / 1000).toFixed(0);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[85%] max-w-sm rounded-lg border border-[#444] bg-[#1e1e1e] p-6 text-center">
        <div className="text-sm font-semibold text-white">{t("powTitle")}</div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
          <div className="h-full bg-blue-500 transition-[width] duration-200" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 text-xs text-gray-400">
          {pow.progress > total
            ? `${t("powTrying")} ${done}k ${pow.unit}`
            : `${t("powTrying")} ${done}k / ${(total / 1000).toFixed(0)}k ${pow.unit}`}
        </div>
        <div className="mt-1 text-xs text-gray-500">{pow.seconds.toFixed(1)}s</div>
      </div>
    </div>
  );
}
