import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { useFingerprintStore } from "../../../../store/useFingerprintStore";
import { useSystemStore } from "../../../../store/useSystemStore";
import {
  Challenge,
  CLIENT_ID_KEY,
  ConfigEntry,
  describeLink,
  exchangeTgLink,
  ServerEntry,
  StatusEntry,
  TG_SESSION_KEY,
  vpnApi,
} from "./api";
import { useLang } from "./i18n";
import Auth from "./Auth";
import Configs from "./Configs";
import Servers from "./Servers";
import Subscription from "./Subscription";
import MyConfigs from "./MyConfigs";
import Costs from "./Costs";
import PowOverlay from "./PowOverlay";
import { Card, Chip, CopyButton, ErrorBox, ExitList, Loader, StatusPill } from "./parts";

type Tab = "configs" | "servers" | "status";
type Toast = { id: number; message: string; kind: "success" | "error" };

const TABS: { key: Tab; icon: string }[] = [
  { key: "configs", icon: "material-symbols:key-outline-rounded" },
  { key: "servers", icon: "material-symbols:dns-outline-rounded" },
  { key: "status", icon: "material-symbols:monitor-heart-outline-rounded" },
];

export default function Vpn({
  subscription,
  userToken,
  winId,
}: {
  subscription?: string;
  userToken?: string;
  winId?: string;
}) {
  const { lang, t, toggleLang } = useLang();
  const setCustomWindow = useSystemStore((s) => s.setCustomWindow);
  const boot = useFingerprintStore((s) => s.boot);
  const fpStatus = useFingerprintStore((s) => s.status);
  const attempt = useFingerprintStore((s) => s.attempt);
  const refresh = useFingerprintStore((s) => s.refresh);
  const solveHashPow = useFingerprintStore((s) => s.solveHashPow);
  const solveAesPow = useFingerprintStore((s) => s.solveAesPow);

  const [clientId, setClientId] = useState<string | null>(() => localStorage.getItem(CLIENT_ID_KEY));
  const [tgSession, setTgSession] = useState<string | null>(() => localStorage.getItem(TG_SESSION_KEY));
  // A token in the link may be a subscription or a one-time login; the server
  // says which, so the app never has to guess from the string.
  const [linkKind, setLinkKind] = useState<"subscription" | "auth" | "pending" | "dead">(
    subscription ? "pending" : "subscription",
  );
  const [debugNoAntibot, setDebugNoAntibot] = useState(false);
  const [tab, setTab] = useState<Tab>("configs");

  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [statuses, setStatuses] = useState<StatusEntry[] | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Deliberately outside the tabs: the costs are public, so they must be readable
  // without an invite code and from the subscription view too.
  const [showCosts, setShowCosts] = useState(false);

  const showToast = useCallback((message: string, kind: "success" | "error" = "success") => {
    const toast: Toast = { id: Date.now() + Math.random(), message, kind };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== toast.id)), 2500);
  }, []);

  useEffect(() => {
    if (!subscription && !userToken) boot();
  }, [boot, subscription, userToken]);

  // Resolve what the link token is, then act on it: show the config, or spend a
  // login link once and keep the session it returns.
  useEffect(() => {
    if (!subscription) return;
    let cancelled = false;

    describeLink(subscription)
      .then(async ({ kind }) => {
        if (cancelled) return;
        if (kind !== "auth") {
          if (winId) setCustomWindow({ id: winId, name: "VPN - config" });
          return setLinkKind("subscription");
        }

        const { session } = await exchangeTgLink(subscription);
        if (cancelled) return;
        localStorage.setItem(TG_SESSION_KEY, session);
        setTgSession(session);
        setLinkKind("auth");
      })
      .catch((e) => {
        if (cancelled) return;
        // A spent login link is the common case: the message it came from is
        // still in the chat. Fall back to whatever session this browser has.
        if (localStorage.getItem(TG_SESSION_KEY)) return setLinkKind("auth");
        setLinkKind("dead");
        setError(e?.message || t("errReqFailed"));
      });

    return () => {
      cancelled = true;
    };
  }, [subscription, t]);

  const loadMain = useCallback(async () => {
    if (!clientId && !tgSession) return;
    const who = tgSession ? `session=${encodeURIComponent(tgSession)}` : `client_id=${encodeURIComponent(clientId!)}`;
    setLoading(true);
    setError(null);
    try {
      const [serverRes, configRes] = await Promise.all([
        vpnApi<{ servers: ServerEntry[] }>("/api/servers"),
        vpnApi<{ configs: ConfigEntry[] }>(`/api/configs?${who}`),
      ]);
      setServers(serverRes.servers || []);
      setConfigs(configRes.configs || []);
    } catch (e: any) {
      setError(e?.message || t("errReqFailed"));
    } finally {
      setLoading(false);
    }
  }, [clientId, tgSession, t]);

  useEffect(() => {
    if (linkKind === "auth" || (!subscription && (clientId || tgSession))) loadMain();
  }, [subscription, clientId, tgSession, linkKind, loadMain]);

  useEffect(() => {
    if (tab !== "status" || statuses || statusError) return;
    vpnApi<{ statuses: StatusEntry[] }>("/api/status")
      .then((res) => setStatuses(res.statuses || []))
      .catch((e) => setStatusError(e?.message || t("errReqFailed")));
  }, [tab, statuses, statusError, t]);

  const solveChallenge = useCallback(
    async (configId: string) => {
      const challenge = await vpnApi<Challenge>("/api/configs/challenge", "POST", {
        config_id: configId,
        client_id: clientId || "",
        session: tgSession || "",
        action: configId === "alloc" ? "alloc" : "reveal",
      });
      const solved = await solveHashPow(challenge.digest, challenge.difficulty);
      return { digest: challenge.digest, solution: solved.solution };
    },
    [clientId, tgSession, solveHashPow],
  );

  const allocate = useCallback(
    async (serverKey: string) => {
      if (busy || (!clientId && !tgSession)) return;

      const existing = configs.find((c) => c.server_key === serverKey);
      if (existing) {
        showToast(t("configAlreadyExists"));
        setTab("configs");
        return;
      }

      setBusy(true);
      try {
        let powSolution = -1;
        let powDigest = "";
        if (!debugNoAntibot) {
          const solved = await solveChallenge("alloc");
          powSolution = solved.solution;
          powDigest = solved.digest;
        }

        // The backend answers with an encrypted puzzle; the config is inside it.
        // attempt() retries with a fresh fingerprint, then a re-downloaded
        // bundle, if the payload itself is rejected.
        const puzzle = await attempt((payload) =>
          vpnApi<unknown>("/api/allocate", "POST", {
            client_id: clientId || "",
            session: tgSession || "",
            server_key: serverKey,
            n: payload,
            pow_solution: powSolution,
            pow_digest: powDigest,
          }),
        );
        const { result } = await solveAesPow(puzzle);

        const created: ConfigEntry = {
          id: result.id,
          server_key: result.server_key || serverKey,
          server_name: result.server_name || serverKey,
          vless_config: result.vless_config || "",
          sub_link: result.sub_link || "",
          sub_id: result.sub_id || "",
          created_at: new Date().toISOString(),
        };
        setConfigs((prev) => [created, ...prev.filter((c) => String(c.id) !== String(created.id))]);

        refresh();
        setTab("configs");
        showToast(t("configAllocated"));
      } catch (e: any) {
        showToast(e?.message || t("errReqFailed"), "error");
      } finally {
        setBusy(false);
      }
    },
    [attempt, busy, clientId, tgSession, configs, debugNoAntibot, refresh, showToast, solveAesPow, solveChallenge, t],
  );

  const reveal = useCallback(
    async (configId: ConfigEntry["id"]) => {
      if (!clientId && !tgSession) return;
      try {
        const solved = await solveChallenge(String(configId));
        const revealed = await vpnApi<{ vless_config: string; sub_link: string; sub_id: string }>(
          "/api/configs/reveal",
          "POST",
          {
            config_id: String(configId),
            client_id: clientId || "",
            session: tgSession || "",
            solution: solved.solution,
          },
        );
        setConfigs((prev) => prev.map((c) => (String(c.id) === String(configId) ? { ...c, ...revealed } : c)));
      } catch (e: any) {
        showToast(e?.message || t("errReqFailed"), "error");
      }
    },
    [clientId, tgSession, showToast, solveChallenge, t],
  );

  const logout = () => {
    localStorage.removeItem(CLIENT_ID_KEY);
    localStorage.removeItem(TG_SESSION_KEY);
    setClientId(null);
    setTgSession(null);
    setConfigs([]);
    setServers([]);
    refresh();
  };

  // A telegram session counts as signed in even while a link is being resolved.
  const authed = (!subscription || linkKind === "auth") && !userToken && (!!clientId || !!tgSession);

  return (
    <div className="scrollable relative flex h-full w-full flex-col bg-[#1c1c1c] text-left font-sans text-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
        {authed ? (
          <div className="flex min-w-0 items-center gap-0.5 rounded-lg bg-black/30 p-0.5">
            {TABS.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-all",
                  tab === key ? "bg-white/[0.09] text-white" : "text-gray-500 hover:text-gray-300",
                )}
              >
                <Icon icon={icon} width="14" height="14" />
                <span className="hidden sm:inline">
                  {key === "configs" ? t("navConfigs") : key === "servers" ? t("navServers") : t("navStatus")}
                </span>
                {key === "configs" && configs.length > 0 && (
                  <span className="rounded-full bg-blue-500/25 px-1.5 text-[9.5px] font-bold text-blue-200">
                    {configs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-300">
            <Icon icon="material-symbols:vpn-lock-outline-rounded" width="16" height="16" className="text-blue-400" />
            VPN
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setShowCosts((v) => !v)}
            title={t("costsTitle")}
            className={clsx(
              "flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-bold transition-colors",
              showCosts ? "bg-emerald-500/20 text-emerald-300" : "text-gray-500 hover:bg-white/[0.06] hover:text-gray-300",
            )}
          >
            <Icon icon="material-symbols:payments-outline-rounded" width="15" height="15" />
          </button>
          {authed && (
            <button
              onClick={() => fpStatus === "failed" && refresh()}
              title={fpStatus === "failed" ? t("fpRetryHint") : undefined}
              className={clsx(
                "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                fpStatus === "ready" && "text-emerald-400",
                fpStatus === "failed" && "cursor-pointer text-red-400 hover:bg-white/[0.06]",
                (fpStatus === "idle" || fpStatus === "loading") && "text-amber-400",
              )}
            >
              <Icon
                icon={
                  fpStatus === "ready"
                    ? "material-symbols:verified-user-outline-rounded"
                    : fpStatus === "failed"
                      ? "material-symbols:gpp-maybe-outline"
                      : "material-symbols:shield-outline"
                }
                width="15"
                height="15"
              />
            </button>
          )}
          <button
            onClick={toggleLang}
            className="rounded-md px-1.5 py-1 text-[10px] font-bold text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300"
          >
            {lang === "ru" ? "EN" : "RU"}
          </button>
          {authed && (
            <button
              onClick={logout}
              title={t("logout")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <Icon icon="material-symbols:logout-rounded" width="15" height="15" />
            </button>
          )}
        </div>
      </header>

      <main className="scrollable flex-1 overflow-y-auto px-3.5 py-3">
        {showCosts ? (
          <Costs t={t} lang={lang} />
        ) : subscription && linkKind === "pending" ? (
          <Loader label={t("loading")} />
        ) : subscription && linkKind === "subscription" ? (
          <Subscription subId={subscription} t={t} onToast={showToast} />
        ) : userToken ? (
          <MyConfigs userToken={userToken} t={t} onToast={showToast} />
        ) : !clientId && !tgSession ? (
          <>
            {linkKind === "dead" && <ErrorBox message={t("linkSpent")} />}
            <Auth
            t={t}
            onAuthed={(id, debug) => {
              localStorage.setItem(CLIENT_ID_KEY, id);
              setDebugNoAntibot(debug);
              setClientId(id);
            }}
            />
          </>
        ) : (
          <>
            {error && <ErrorBox message={error} />}

            {loading ? (
              <Loader label={t("loadingData")} />
            ) : tab === "configs" ? (
              <Configs configs={configs} t={t} onReveal={reveal} onToast={showToast} />
            ) : tab === "servers" ? (
              <Servers servers={servers} busy={busy} t={t} onAllocate={allocate} />
            ) : statusError ? (
              <div>
                <ErrorBox message={statusError} />
                <Chip
                  icon="material-symbols:refresh-rounded"
                  onClick={() => {
                    setStatusError(null);
                    setStatuses(null);
                  }}
                >
                  {t("retry")}
                </Chip>
              </div>
            ) : statuses === null ? (
              <Loader label={t("loading")} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {statuses.map((s) => (
                  <Card key={s.key || s.name}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-white">{s.name}</span>
                      <StatusPill status={s.online ? t("online") : t("offline")} online={s.online} />
                    </div>
                    {s.description && (
                      <p className="mt-1 text-[11px] leading-snug text-gray-500">{s.description}</p>
                    )}
                    {s.has_panel ? (
                      <p className="mt-1 font-code text-[10px] text-gray-600">{s.details}</p>
                    ) : (
                      <p className="mt-1 text-[10px] italic text-gray-600">{t("statusNoPanel")}</p>
                    )}
                    <ExitList exits={s.exits} t={t} />
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Only an invite-code account has an id worth showing. A telegram session
          is identified by the account it signed in with, not by a device id. */}
      {authed && clientId && (
        <footer className="flex shrink-0 items-center gap-2 border-t border-white/[0.07] px-3.5 py-2">
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">{t("yourId")}</span>
          <span className="truncate font-code text-[10px] text-gray-500">{clientId}</span>
          <span className="ml-auto shrink-0">
            <CopyButton value={clientId} t={t} onFail={(m) => showToast(m, "error")} />
          </span>
        </footer>
      )}

      <PowOverlay t={t} />

      {toasts.length > 0 && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-[11.5px] font-medium shadow-xl backdrop-blur",
                toast.kind === "error" ? "bg-red-600/90 text-white" : "bg-emerald-600/90 text-white",
              )}
            >
              <Icon
                icon={
                  toast.kind === "error"
                    ? "material-symbols:error-outline-rounded"
                    : "material-symbols:check-circle-outline-rounded"
                }
                width="15"
                height="15"
              />
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
