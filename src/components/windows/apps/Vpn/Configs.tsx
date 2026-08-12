import { useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { ConfigEntry, shortDate } from "./api";
import { Translate } from "./i18n";
import { Card, ConfigBlock, CopyButton, EmptyState, HappHelp, PrimaryButton, QrPanel } from "./parts";

const PLACEHOLDER =
  "vless://••••••••-••••-••••-••••-••••••••••••@hidden.server.com:443?encryption=none&security=reality&sni=hidden#Server";

function ConfigCard({
  config,
  t,
  onReveal,
  onToast,
}: {
  config: ConfigEntry;
  t: Translate;
  onReveal: (id: ConfigEntry["id"]) => Promise<void>;
  onToast: (message: string, kind?: "success" | "error") => void;
}) {
  const [revealing, setRevealing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const revealed = !!config.vless_config && config.vless_config.length > 10;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            icon="material-symbols:vpn-key-outline"
            width="16"
            height="16"
            className="shrink-0 text-gray-500"
          />
          <span className="truncate text-[13px] font-semibold text-white">
            {config.server_name || config.server_key}
          </span>
          {/* Two configs on one server differ only by transport. */}
          {config.protocol && (
            <span className="shrink-0 rounded bg-white/[0.07] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-gray-400">
              {config.protocol}
            </span>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-gray-600">{shortDate(config.created_at)}</span>
      </div>

      <div className="relative mt-2.5">
        <ConfigBlock value={revealed ? config.vless_config! : PLACEHOLDER} locked={!revealed} />
        {!revealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/50">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <Icon icon="material-symbols:lock-outline" width="13" height="13" />
              {t("hiddenSecurity")}
            </span>
            <PrimaryButton
              disabled={revealing}
              icon="material-symbols:visibility-outline-rounded"
              onClick={async () => {
                setRevealing(true);
                try {
                  await onReveal(config.id);
                } finally {
                  setRevealing(false);
                }
              }}
            >
              {revealing ? t("loading") : t("revealToView")}
            </PrimaryButton>
          </div>
        )}
      </div>

      {revealed && (
        <>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <CopyButton value={config.vless_config!} label={t("copy")} t={t} onFail={(m) => onToast(m, "error")} />
            {config.sub_id && (
              <QrPanel subId={config.sub_id} t={t} open={qrOpen} onToggle={() => setQrOpen((v) => !v)} />
            )}
            {config.sub_link && (
              <CopyButton
                value={config.sub_link}
                label={t("subLink")}
                idleIcon="material-symbols:link-rounded"
                t={t}
                onFail={(m) => onToast(m, "error")}
              />
            )}
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className={clsx(
                "ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-500/25 px-2 py-1.5",
                "text-[11px] font-medium text-amber-300/90 transition-colors hover:bg-amber-500/10 hover:text-amber-200",
              )}
            >
              <Icon icon="material-symbols:help-outline-rounded" width="13" height="13" />
              Happ
            </button>
          </div>
          {helpOpen && (
            <div className="mt-2.5">
              <HappHelp t={t} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function Configs({
  configs,
  t,
  onReveal,
  onToast,
}: {
  configs: ConfigEntry[];
  t: Translate;
  onReveal: (id: ConfigEntry["id"]) => Promise<void>;
  onToast: (message: string, kind?: "success" | "error") => void;
}) {
  if (configs.length === 0) {
    return (
      <EmptyState
        icon="material-symbols:vpn-key-off-outline"
        title={t("noConfigs")}
        hint={t("gatesRecommended")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {configs.map((config) => (
        <ConfigCard key={config.id} config={config} t={t} onReveal={onReveal} onToast={onToast} />
      ))}
    </div>
  );
}
