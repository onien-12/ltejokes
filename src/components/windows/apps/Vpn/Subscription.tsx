import { useEffect, useState } from "react";
import { shortDate, SubscriptionView, vpnApi } from "./api";
import { Translate } from "./i18n";
import { Card, ConfigBlock, CopyButton, ErrorBox, HappHelp, Loader, QrPanel, SectionLabel } from "./parts";

/**
 * One config, opened straight from a `#c=open(vpn, <sub_id>)` link.
 *
 * No fingerprint and no proof-of-work here: the token is the credential, and the
 * phone this gets opened on is exactly where browser fingerprinting fails.
 */
export default function Subscription({
  subId,
  t,
  onToast,
}: {
  subId: string;
  t: Translate;
  onToast: (message: string, kind?: "success" | "error") => void;
}) {
  const [data, setData] = useState<SubscriptionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    vpnApi<SubscriptionView>(`/api/subscription/${encodeURIComponent(subId)}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError(t("subUnknown")));

    return () => {
      cancelled = true;
    };
  }, [subId, t]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loader label={t("loading")} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-white">
          {data.server_name || "—"}
        </div>
        {data.created_at && (
          <div className="shrink-0 text-[10px] text-gray-600">
            {t("createdAt")} {shortDate(data.created_at)}
          </div>
        )}
      </div>

      <Card accent>
        <SectionLabel>{t("subTitle")}</SectionLabel>
        <ConfigBlock value={data.vless_config} />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <CopyButton primary value={data.vless_config} label={t("copy")} t={t} onFail={(m) => onToast(m, "error")} />
          <QrPanel subId={subId} t={t} open={qrOpen} onToggle={() => setQrOpen((v) => !v)} />
        </div>
      </Card>

      {data.sub_url && (
        <Card>
          <SectionLabel hint={t("subHint")}>{t("subLink")}</SectionLabel>
          <ConfigBlock value={data.sub_url} muted />
          <div className="mt-2.5">
            <CopyButton
              value={data.sub_url}
              label={t("copy")}
              idleIcon="material-symbols:link-rounded"
              t={t}
              onFail={(m) => onToast(m, "error")}
            />
          </div>
        </Card>
      )}

      <HappHelp t={t} />
    </div>
  );
}
