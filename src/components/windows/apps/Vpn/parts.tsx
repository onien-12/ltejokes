import React, { useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { copyText, qrUrl } from "./api";
import { Translate } from "./i18n";

/** Pieces shared by the subscription view and the config list. */

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

  const text = copied ? t("copied") : label ?? t("copy");
  const icon = copied
    ? "material-symbols:check-rounded"
    : idleIcon ?? "material-symbols:content-copy-outline-rounded";

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

/** Long configs are the norm now, so this scrolls rather than stretching the window. */
export function ConfigBlock({ value, locked, muted }: { value: string; locked?: boolean; muted?: boolean }) {
  return (
    <div
      className={clsx(
        "scrollable relative max-h-24 overflow-auto rounded-lg border border-white/[0.07] bg-[#151515] p-2.5",
        muted && "border-dashed",
      )}
    >
      <code
        className={clsx(
          "block select-text whitespace-pre-wrap break-all font-code text-[10.5px] leading-[1.6]",
          locked ? "select-none text-gray-600 blur-[3px]" : "text-gray-400",
        )}
      >
        {value}
      </code>
    </div>
  );
}

/** QR is rendered by the backend, so the site needs no QR library. */
export function QrPanel({ subId, t, open, onToggle }: { subId: string; t: Translate; open: boolean; onToggle: () => void }) {
  if (!subId) return null;
  return (
    <>
      <Chip onClick={onToggle} icon="material-symbols:qr-code-2" active={open}>
        {t("qrCode")}
      </Chip>
      {open && (
        <div className="mt-3 flex w-full justify-center">
          <div className="rounded-xl bg-white p-3 shadow-lg">
            {/* Big enough to scan off the screen from a phone held at arm's length;
                the backend renders it well above this size, so it stays sharp. */}
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

/** Panel status strings arrive with their own glyph; show a dot and drop the emoji. */
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
