import { useEffect, useState } from "react";
import { Icon } from "@iconify-icon/react";
import clsx from "clsx";
import { CostsView, vpnApi } from "./api";
import { Translate } from "./i18n";
import { Card, ErrorBox, Loader, SectionLabel } from "./parts";

const SIGN: Record<string, string> = { RUB: "₽", USD: "$", EUR: "€" };

/** Thin space between thousands reads better than a comma for roubles. */
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;

/** An address deserves monospace; a description does not. */
const isAddress = (label: string) => /^[\d.:a-z-]+$/i.test(label);

/** "2026-07" -> "июль" / "July". */
function monthName(period: string, lang: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", { month: "long" });
}

/**
 * What the service costs to run. Free to use, so this is the whole answer to
 * "where does the money go" — providers are never named, only prices.
 */
export default function Costs({ t, lang }: { t: Translate; lang: string }) {
  const [data, setData] = useState<CostsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    vpnApi<CostsView>("/api/costs")
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError(e?.message || t("errReqFailed")));
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loader label={t("loading")} />;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel hint={t("costsIntro")}>{t("costsTitle")}</SectionLabel>
      </div>

      <Card>
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {data.items.map((item, i) => (
            <div key={`${item.label}-${i}`} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={clsx(
                    "min-w-0 truncate text-[12.5px] text-gray-300",
                    isAddress(item.label) && "font-code text-[11.5px]",
                  )}
                >
                  {item.label}
                </span>
                <span className="shrink-0 text-[12.5px] font-semibold text-white">
                  {rub(item.monthly_rub)}
                  <span className="ml-1 text-[10px] font-normal text-gray-600">/{t("perMonth")}</span>
                </span>
              </div>

              {/* The original price, so the conversion can be checked rather than trusted. */}
              {(item.currency !== "RUB" || item.period === "quarter") && (
                <div className="mt-0.5 text-[10.5px] text-gray-600">
                  {item.amount}&nbsp;{SIGN[item.currency] ?? item.currency}
                  {item.period === "quarter" && ` / 3 ${t("months")}`}
                </div>
              )}

              {item.metered && (
                <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-blue-300/80">
                  <Icon icon="material-symbols:swap-vert-rounded" width="12" height="12" />
                  {item.live ? (
                    <span>
                      {item.since ? `${t("costsTrafficSince")} ${item.since}` : t("costsTraffic")}:{" "}
                      {item.used_gb?.toLocaleString("ru-RU")} {t("gb")} ×{" "}
                      {item.per_gb_rub} ₽ = <b>{rub(item.traffic_rub ?? 0)}</b>
                    </span>
                  ) : (
                    <span className="text-gray-600">{t("costsTrafficUnavailable")}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card accent>
        <div className="flex items-baseline justify-between text-[12px] text-gray-400">
          <span>{t("costsFixed")}</span>
          <span>{rub(data.fixed_total_rub)}</span>
        </div>
        {data.metered_total_rub > 0 && (
          <div className="mt-1 flex items-baseline justify-between text-[12px] text-gray-400">
            <span>{t("costsMetered")}</span>
            <span>{rub(data.metered_total_rub)}</span>
          </div>
        )}
        <div className="mt-2 flex items-baseline justify-between border-t border-white/[0.08] pt-2">
          <span className="text-[13px] font-semibold text-white">{t("costsTotal")}</span>
          <span className="text-[15px] font-bold text-white">{rub(data.total_rub)}</span>
        </div>
      </Card>

      {data.previous?.known && (
        <Card>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-gray-400">
              {t("costsPrevious")} — {monthName(data.previous.period, lang)}
            </span>
            <span className="text-[13px] font-semibold text-white">{rub(data.previous.total_rub)}</span>
          </div>
          {data.previous.items.map((item, i) => (
            <div key={i} className="mt-1 flex items-baseline justify-between text-[10.5px] text-gray-600">
              <span className={clsx(isAddress(item.label) && "font-code")}>{item.label}</span>
              <span>
                {item.used_gb.toLocaleString("ru-RU")} {t("gb")} = {rub(item.traffic_rub)}
              </span>
            </div>
          ))}
        </Card>
      )}

      {data.rates.USD && data.rates.EUR && (
        <div className="px-0.5 text-[10.5px] leading-snug text-gray-600">
          {data.rates.source === "cbr" ? t("costsRatesCbr") : t("costsRatesFallback")}
          {data.rates.as_of ? ` ${data.rates.as_of}` : ""}: 1&nbsp;$ = {data.rates.USD.toFixed(2)} ₽,
          {" "}1&nbsp;€ = {data.rates.EUR.toFixed(2)} ₽
        </div>
      )}
    </div>
  );
}
