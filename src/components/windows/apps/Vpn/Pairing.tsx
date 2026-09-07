import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { PairingView, pairQrUrl, vpnApi } from "./api";
import { Translate } from "./i18n";
import { Card, Chip, Loader } from "./parts";

/**
 * Hands this account to a second device: a QR for a camera, and six characters
 * for anyone typing.
 *
 * Both spend the same single-use row, and it lasts ten minutes. A six-character
 * code is only about 2^30, so what keeps it safe is that hardly any are ever
 * live at once — it exists for the moment between reading it off one screen and
 * entering it on another, and is deliberately useless after that.
 */
export default function Pairing({ clientId, session, t }: {
  clientId: string | null;
  session: string | null;
  t: Translate;
}) {
  const [pair, setPair] = useState<PairingView | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const issue = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await vpnApi<PairingView>("/api/pair/issue", "POST", {
        client_id: clientId || "",
        session: session || "",
      });
      setPair(res);
      setLeft(res.expires_in);
    } catch (e: any) {
      setError(e?.message || t("errReqFailed"));
    } finally {
      setBusy(false);
    }
  }, [clientId, session, t]);

  useEffect(() => {
    issue();
  }, [issue]);

  // Counting down matters here: the code on screen stops working silently, and
  // a user retyping a dead code has no way to tell that is what went wrong.
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const expired = !!pair && left <= 0;

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Icon
          icon="material-symbols:phonelink-ring-outline-rounded"
          width="17"
          height="17"
          className="shrink-0 text-blue-300"
        />
        <span className="text-[13px] font-semibold text-white">{t("pairTitle")}</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-gray-500">{t("pairHint")}</p>

      {error && <p className="mt-2 text-[11px] text-red-300">{error}</p>}

      {!pair && !error && <Loader label={t("loading")} />}

      {pair && (
        <>
          <div className="mt-3 flex flex-col items-center gap-3">
            <div className="relative rounded-xl bg-white p-2.5">
              <img
                src={pairQrUrl(pair.token)}
                alt={t("pairTitle")}
                className="block h-40 w-40 [image-rendering:pixelated] sm:h-48 sm:w-48"
              />
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/70 text-[11px] font-semibold text-white">
                  {t("pairExpired")}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              {/* Grouped in threes and spaced out: it is meant to be read aloud
                  and typed, not scanned by eye. */}
              <span
                className={clsx(
                  "select-all font-code text-[22px] font-bold tracking-[0.35em] sm:text-[26px]",
                  expired ? "text-gray-600 line-through" : "text-white",
                )}
                aria-label={pair.code.split("").join(" ")}
              >
                {pair.code.slice(0, 3)} {pair.code.slice(3)}
              </span>
              <span className="mt-1 text-[10.5px] text-gray-600">
                {expired
                  ? t("pairExpired")
                  : `${t("pairExpires")} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} ${t("pairMinutes")}`}
              </span>
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            <Chip onClick={issue} disabled={busy} icon="material-symbols:refresh-rounded">
              {t("pairNew")}
            </Chip>
          </div>
        </>
      )}
    </Card>
  );
}
