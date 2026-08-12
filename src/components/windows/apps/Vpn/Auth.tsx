import { useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { useFingerprintStore } from "../../../../store/useFingerprintStore";
import { vpnApi } from "./api";
import { Translate } from "./i18n";
import { ErrorBox, PrimaryButton } from "./parts";

type AuthResponse = { client_id?: string; antibot_client_id?: string; debug?: boolean };

export default function Auth({
  t,
  onAuthed,
}: {
  t: Translate;
  onAuthed: (clientId: string, debugNoAntibot: boolean) => void;
}) {
  const status = useFingerprintStore((s) => s.status);
  const attempt = useFingerprintStore((s) => s.attempt);
  const refresh = useFingerprintStore((s) => s.refresh);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (!code.trim()) return setError(t("errInviteCode"));

    setBusy(true);
    setError(null);
    try {
      // attempt() re-acquires the fingerprint, and finally re-downloads the
      // antifraud code, when the server says the payload was unusable. Without
      // it a bad payload stays cached and every retry fails identically.
      const result = await attempt((payload) =>
        vpnApi<AuthResponse>("/api/auth", "POST", { invite_code: code.trim(), n: payload }),
      );
      refresh();
      onAuthed(result.antibot_client_id || result.client_id || "", !!result.debug);
    } catch (e: any) {
      setError(e?.message || t("errReqFailed"));
    } finally {
      setBusy(false);
    }
  };

  const label = busy
    ? t("loading")
    : status === "ready"
      ? t("continue")
      : status === "failed"
        ? t("retry")
        : t("fpLoading");

  return (
    <div className="mx-auto flex h-full max-w-[320px] flex-col justify-center py-6">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
          <Icon icon="material-symbols:key-vertical-outline-rounded" width="24" height="24" />
        </div>
        <div className="mt-3 text-[15px] font-semibold text-white">{t("inviteTitle")}</div>
        <div className="mt-1 text-[11.5px] leading-snug text-gray-500">{t("inviteDesc")}</div>
      </div>

      {error && <ErrorBox message={error} />}

      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("invitePlaceholder")}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className={clsx(
          "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-center text-[13px] text-white",
          "font-code tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-600",
          "transition-colors focus:border-blue-500/60 focus:outline-none",
        )}
      />

      <PrimaryButton
        onClick={submit}
        disabled={busy || status === "loading" || status === "idle"}
        className="mt-2.5 w-full"
        icon={status === "ready" ? "material-symbols:arrow-forward-rounded" : undefined}
      >
        {label}
      </PrimaryButton>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-gray-600">
        {status === "ready" ? (
          <>
            <Icon
              icon="material-symbols:verified-user-outline-rounded"
              width="13"
              height="13"
              className="text-emerald-500"
            />
            {t("fpReady")}
          </>
        ) : status === "failed" ? (
          <button onClick={refresh} className="text-amber-400 underline" title={t("fpRetryHint")}>
            {t("fpFailed")}
          </button>
        ) : (
          <>
            <span className="h-2.5 w-2.5 animate-spin rounded-full border border-white/20 border-t-blue-400" />
            {t("fpLoading")}
          </>
        )}
      </div>
    </div>
  );
}
