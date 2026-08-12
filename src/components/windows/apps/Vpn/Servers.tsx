import { useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { ServerEntry, ServerProtocols } from "./api";
import { Translate } from "./i18n";
import { Card, Chip, EmptyState, SectionLabel, StatusPill } from "./parts";

/** Transport glyphs, matching the set the Telegram bot uses. */
const PROTO_ICONS: Record<string, string> = {
  tcp: "material-symbols:bolt-rounded",
  grpc: "material-symbols:swap-horiz-rounded",
  xhttp: "material-symbols:extension-outline-rounded",
  hy2: "material-symbols:rocket-launch-outline-rounded",
};

/**
 * Gateways first and direct servers behind a toggle — the same ordering the
 * standalone page uses, because gateways hold up better under blocking.
 */
export default function Servers({
  servers,
  busy,
  t,
  onAllocate,
}: {
  servers: ServerEntry[];
  busy: boolean;
  t: Translate;
  onAllocate: (serverKey: string) => void;
}) {
  const [showDirect, setShowDirect] = useState(false);

  const gates = servers.filter((s) => s.is_gate);
  const directs = servers.filter((s) => !s.is_gate);

  // A server with no declared transports is allocated on its default inbound;
  // "tcp" is that default, so it is passed without a suffix.
  const protocolChips = (serverKey: string, protocols: ServerProtocols) => {
    const entries = Object.entries(protocols || {});
    if (entries.length === 0) {
      return (
        <Chip disabled={busy} icon="material-symbols:add-rounded" onClick={() => onAllocate(serverKey)}>
          {t("create")}
        </Chip>
      );
    }
    return entries.map(([key, name]) => (
      <Chip
        key={key}
        disabled={busy}
        icon={PROTO_ICONS[key] || "material-symbols:lan-outline"}
        onClick={() => onAllocate(key === "tcp" ? serverKey : `${serverKey}-${key}`)}
      >
        {name}
      </Chip>
    ));
  };

  if (servers.length === 0) {
    return <EmptyState icon="material-symbols:cloud-off-outline-rounded" title={t("noServers")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {gates.length > 0 && (
        <div>
          <SectionLabel hint={t("gatesRecommended")}>{t("gates")}</SectionLabel>

          <div className="flex flex-col gap-2.5">
            {gates.map((gate) => (
              <Card key={gate.key} accent>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon
                      icon="material-symbols:swap-horizontal-circle-outline-rounded"
                      width="17"
                      height="17"
                      className="shrink-0 text-blue-300"
                    />
                    <span className="truncate text-[13px] font-semibold text-white">{gate.name}</span>
                  </div>
                  <StatusPill status={gate.status} />
                </div>
                {gate.description && (
                  <p className="mt-1 text-[11px] leading-snug text-gray-500">{gate.description}</p>
                )}

                <div className="mt-2.5 flex flex-col gap-1.5">
                  {Object.entries(gate.targets || {}).map(([key, target]) => (
                    <div key={key} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-300">
                        <Icon
                          icon="material-symbols:arrow-right-alt-rounded"
                          width="15"
                          height="15"
                          className="text-blue-400"
                        />
                        <span className="truncate">{target.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {protocolChips(target.server_key, target.protocols)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {directs.length > 0 && (
        <div>
          <button
            onClick={() => setShowDirect((v) => !v)}
            aria-expanded={showDirect}
            className={clsx(
              "flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2",
              "text-left text-[11px] font-semibold text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-gray-200",
            )}
          >
            <Icon icon="material-symbols:lan-outline" width="15" height="15" />
            <span className="flex-1">{showDirect ? t("hideDirect") : t("showDirect")}</span>
            <Icon
              icon={showDirect ? "material-symbols:expand-less" : "material-symbols:expand-more"}
              width="16"
              height="16"
            />
          </button>

          {showDirect && (
            <>
              <p className="mt-2 px-0.5 text-[11px] leading-snug text-gray-500">{t("directWarning")}</p>
              <div className="mt-2 flex flex-col gap-2.5">
                {directs.map((srv) => (
                  <Card key={srv.key}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-white">{srv.name}</span>
                      <StatusPill status={srv.status} />
                    </div>
                    {srv.description && (
                      <p className="mt-1 text-[11px] leading-snug text-gray-500">{srv.description}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">{protocolChips(srv.key, srv.protocols)}</div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
