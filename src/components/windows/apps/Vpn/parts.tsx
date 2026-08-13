import React, { useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { copyText, qrUrl, StatusExit } from "./api";
import { Translate } from "./i18n";

export function Card({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-[#232323] p-3.5 transition-colors",
        accent ? "border-blue-500/30 bg-blue-500/[0.04]" : "border-white/[0.07] hover:border-white/[0.14]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{children}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-gray-500">{hint}</div>}
    </div>
  );
}

export function Chip({
  children,
  onClick,
  disabled,
  active,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        "transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-blue-400/60 bg-blue-500/20 text-blue-200"
          : "border-white/10 bg-white/[0.04] text-gray-200 hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-white",
      )}
    >
      {icon && <Icon icon={icon} width="14" height="14" />}
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  icon,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white",
        "shadow-[0_2px_10px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#333] disabled:text-gray-500 disabled:shadow-none",
        className,
      )}
    >
      {icon && <Icon icon={icon} width="16" height="16" />}
      {children}
    </button>
  );
}

export function CopyButton({
  value,
  label,
  t,
  onFail,
  primary,
  className,
  idleIcon,
}: {
  value: string;
  label?: string;
  t: Translate;
  onFail?: (message: string) => void;
  primary?: boolean;
  className?: string;
  /** Overrides the copy glyph so two adjacent copy buttons stay distinguishable. */
  idleIcon?: string;
}) {
  const [copied, setCopied] = useState(false);

  const run = async () => {
    const ok = await copyText(value);
    if (!ok) return onFail?.(t("errCopy"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const text = copied ? t("copied") : (label ?? t("copy"));
  const icon = copied
    ? "material-symbols:check-rounded"
    : (idleIcon ?? "material-symbols:content-copy-outline-rounded");

  if (primary) {
    return (
      <PrimaryButton onClick={run} icon={icon} className={className}>
        {text}
      </PrimaryButton>
    );
  }
  return (
    <Chip onClick={run} icon={icon} active={copied}>
      {text}
    </Chip>
  );
}

export function ConfigBlock({ value, muted }: { value: string; muted?: boolean }) {
  return (
    <div
      className={clsx(
        "scrollable relative max-h-24 overflow-auto rounded-lg border border-white/[0.07] bg-[#151515] p-2.5",
        muted && "border-dashed",
      )}
    >
      <code
        className="block select-text whitespace-pre-wrap break-all font-code text-[10.5px] leading-[1.6] text-gray-400"
      >
        {value}
      </code>
    </div>
  );
}

/**
 * Stands in for a config that has not been revealed yet.
 *
 * The earlier version blurred a fake config under a dark scrim, which mostly
 * read as a rendering fault. A panel that is plainly meant to be closed says the
 * same thing without looking broken: locked strip, one action, whole thing is
 * the button.
 */
export function LockedConfig({ onReveal, busy, t }: { onReveal: () => void; busy?: boolean; t: Translate }) {
  return (
    <button
      onClick={onReveal}
      disabled={busy}
      className={clsx(
        "group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-3 text-left",
        "border-white/[0.07] bg-[#151515] transition-colors",
        busy ? "cursor-wait" : "hover:border-blue-400/40 hover:bg-[#181a1f]",
      )}
    >
      {/* Faint hatching, so the strip reads as deliberately covered. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 8px, transparent 8px 16px)",
        }}
      />

      <span
        className={clsx(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          busy ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.06] text-gray-400 group-hover:text-blue-300",
        )}
      >
        <Icon
          icon={busy ? "material-symbols:lock-open-right-outline-rounded" : "material-symbols:lock-outline"}
          width="16"
          height="16"
        />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-gray-300">{t("hiddenSecurity")}</span>
        <span className="mt-0.5 block truncate font-code text-[10px] text-gray-600">
          vless://••••••••••••••••••••••••••
        </span>
      </span>

      <span
        className={clsx(
          "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
          busy ? "bg-blue-500/15 text-blue-300" : "bg-blue-600 text-white group-hover:bg-blue-500",
        )}
      >
        {busy ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-blue-300/40 border-t-blue-300" />
        ) : (
          <Icon icon="material-symbols:visibility-outline-rounded" width="13" height="13" />
        )}
        {busy ? t("loading") : t("revealToView")}
      </span>
    </button>
  );
}

export function QrPanel({
  subId,
  t,
  open,
  onToggle,
}: {
  subId: string;
  t: Translate;
  open: boolean;
  onToggle: () => void;
}) {
  if (!subId) return null;
  return (
    <>
      <Chip onClick={onToggle} icon="material-symbols:qr-code-2" active={open}>
        {t("qrCode")}
      </Chip>
      {open && (
        <div className="mt-3 flex w-full justify-center">
          <div className="rounded-xl bg-white p-3 shadow-lg">
            <img
              src={qrUrl(subId)}
              alt={t("qrCode")}
              className="block h-44 w-44 sm:h-56 sm:w-56 [image-rendering:pixelated]"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function HappHelp({ t }: { t: Translate }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5",
          "text-left text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/[0.12]",
        )}
      >
        <Icon icon="material-symbols:warning-outline-rounded" width="16" height="16" />
        <span className="flex-1">{t("helpButton")}</span>
        <Icon icon={open ? "material-symbols:expand-less" : "material-symbols:expand-more"} width="16" height="16" />
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-white/[0.07] bg-[#1b1b1b] p-3">
          <div className="mb-2.5 text-[11px] font-semibold leading-snug text-amber-200/90">{t("helpWarn")}</div>
          <ol className="space-y-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <li key={n} className="flex gap-2.5 text-[11.5px] leading-snug text-gray-400">
                <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[9px] font-bold text-blue-300">
                  {n}
                </span>
                <span>{t(`helpStep${n}` as Parameters<Translate>[0])}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status, online }: { status: string; online?: boolean }) {
  const isOffline = online === false || /❌|⛔|🔴/.test(status);
  const isOnline = online === true || status.includes("✅");
  const label = status.replace(/[✅❌⛔🔴⚠️]/g, "").trim() || status;

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        isOnline && "bg-emerald-500/15 text-emerald-300",
        isOffline && "bg-red-500/15 text-red-300",
        !isOnline && !isOffline && "bg-white/[0.06] text-gray-400",
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isOnline && "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
          isOffline && "bg-red-400",
          !isOnline && !isOffline && "bg-gray-500",
        )}
      />
      {label}
    </span>
  );
}

/**
 * Latency from each gate to the exit behind it.
 *
 * A gate answering a ping says nothing about whether the exit it relays to is
 * still up, so these are measured by the gate's own panel dialling the exit.
 * Exits are named by the server they lead to and numbered when a balancer
 * offers several — never by address, which resold nodes change without notice.
 */
export function ExitList({ exits, t }: { exits?: StatusExit[]; t: Translate }) {
  if (!exits?.length) return null;

  return (
    <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
      {exits.map((exit, index) => (
        <div key={`${exit.gate}-${exit.index}-${index}`} className="flex items-center gap-1.5 text-[10.5px]">
          <Icon
            icon="material-symbols:subdirectory-arrow-right-rounded"
            width="12"
            height="12"
            className="shrink-0 text-gray-600"
          />
          <span className="truncate text-gray-400">
            {t("statusVia")} {exit.gate}
            {exit.shared && (
              <span className="text-gray-600">
                {" · "}
                {t("statusExit")} {exit.index}
              </span>
            )}
          </span>
          <span
            className={clsx(
              "ml-auto shrink-0 font-code",
              exit.online ? "text-emerald-300/80" : "text-red-300/80",
            )}
          >
            {exit.online ? `${exit.delay_ms} ms` : t("statusExitDown")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] text-red-300">
      <Icon icon="material-symbols:error-outline-rounded" width="15" height="15" className="mt-px shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon icon={icon} width="34" height="34" className="text-gray-700" />
      <div className="mt-2.5 text-xs font-medium text-gray-400">{title}</div>
      {hint && <div className="mt-1 max-w-[240px] text-[11px] leading-snug text-gray-600">{hint}</div>}
    </div>
  );
}

export function Loader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-blue-400" />
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
