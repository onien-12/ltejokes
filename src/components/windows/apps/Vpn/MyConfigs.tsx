import { useEffect, useState } from "react";
import { ConfigEntry, vpnApi } from "./api";
import { Translate } from "./i18n";
import Configs from "./Configs";
import { ErrorBox, Loader, SectionLabel } from "./parts";

type UserConfigsView = { configs: ConfigEntry[]; user_token: string; user_page: string };

/**
 * Every config a Telegram user owns, opened from `#c=open(configs, <token>)`.
 *
 * No proof-of-work and no reveal step: the token is the credential, the same
 * way a single subscription link works. It arrives from the bot, which is
 * already an authenticated channel.
 */
export default function MyConfigs({
  userToken,
  t,
  onToast,
}: {
  userToken: string;
  t: Translate;
  onToast: (message: string, kind?: "success" | "error") => void;
}) {
  const [configs, setConfigs] = useState<ConfigEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConfigs(null);
    setError(null);

    vpnApi<UserConfigsView>(`/api/user-configs/${encodeURIComponent(userToken)}`)
      .then((res) => !cancelled && setConfigs(res.configs || []))
      .catch(() => !cancelled && setError(t("subUnknown")));

    return () => {
      cancelled = true;
    };
  }, [userToken, t]);

  if (error) return <ErrorBox message={error} />;
  if (!configs) return <Loader label={t("loading")} />;

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel hint={t("myConfigsHint")}>
        {t("navConfigs")} — {configs.length}
      </SectionLabel>
      {/* Already revealed, so Configs renders them unlocked and onReveal is unused. */}
      <Configs configs={configs} t={t} onReveal={async () => {}} onToast={onToast} />
    </div>
  );
}
