export const VPN_API = (process.env.REACT_APP_VPN_API_URL || "/api/vpn").replace(/\/+$/, "");

export const CLIENT_ID_KEY = "client_id";
/** Session issued by exchanging the bot's one-time login link. */
export const TG_SESSION_KEY = "tg_session";

export type LinkKind = "subscription" | "user" | "auth" | "session";

/** What a link token is for. The server owns the key, so it decides. */
export const describeLink = (token: string) =>
  vpnApi<{ kind: LinkKind }>(`/api/link/${encodeURIComponent(token)}`);

/** Trades the bot's one-time login link for a durable session token. */
export const exchangeTgLink = (token: string) =>
  vpnApi<{ session: string; tg_id: string }>("/api/auth/tg", "POST", { token });

export type ServerProtocols = Record<string, string>;

export type GateTarget = {
  name: string;
  has_protocols: boolean;
  protocols: ServerProtocols;
  server_key: string;
};

export type ServerEntry = {
  key: string;
  name: string;
  status: string;
  description: string;
  has_protocols: boolean;
  protocols: ServerProtocols;
  is_gate: boolean;
  targets: Record<string, GateTarget>;
};

export type ConfigEntry = {
  id: number | string;
  server_key: string;
  server_name: string;
  created_at: string;
  vless_config?: string;
  sub_link?: string;
  sub_id?: string;
  /** Transport suffix, so two configs on one server are distinguishable. */
  protocol?: string;
};

/** One hop from a gate to an exit behind it, dialled by the gate's own panel. */
export type StatusExit = {
  gate: string;
  /** True when a balancer offers several exits, so they need telling apart. */
  shared: boolean;
  index: number;
  online: boolean;
  delay_ms: number | null;
};

export type StatusEntry = {
  key: string;
  name: string;
  description: string;
  online: boolean;
  details: string;
  /** False for an exit reachable only through a gate: it has no panel to poll. */
  has_panel: boolean;
  exits: StatusExit[];
};

export type SubscriptionView = {
  server_name: string;
  vless_config: string;
  sub_link: string;
  created_at: string;
  sub_url: string;
  sub_app: string;
};

export type CostItem = {
  label: string;
  amount: number;
  currency: string;
  period: "month" | "quarter";
  monthly_rub: number;
  metered: boolean;
  per_gb_rub?: number;
  used_gb?: number | null;
  traffic_rub?: number | null;
  live?: boolean;
  /** Set when the meter only started partway through the month. */
  since?: string | null;
};

/** Traffic actually recorded for a closed month. Flat fees are today's prices. */
export type CostsPrevious = {
  period: string;
  known: boolean;
  items: { label: string; used_gb: number; traffic_rub: number }[];
  metered_total_rub: number;
  total_rub: number;
};

export type CostsView = {
  period: string;
  previous?: CostsPrevious;
  currency: string;
  rates: { USD: number | null; EUR: number | null; as_of: string; source: string };
  items: CostItem[];
  fixed_total_rub: number;
  metered_total_rub: number;
  total_rub: number;
};

export type Challenge = { digest: string; difficulty: number };

export class VpnApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * True when the server could not parse the fingerprint at all, as opposed to
 * parsing it and deciding it looks like a bot. Only the former is worth
 * retrying: a fresh payload fixes a malformed one, but re-sending a valid
 * payload that scored badly just repeats the same verdict.
 */
export function isPayloadRejection(e: unknown): boolean {
  return e instanceof VpnApiError && e.status === 403 && /invalid payload/i.test(e.message);
}

export async function vpnApi<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(`${VPN_API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const parsed = await res.json();
      if (parsed?.detail) detail = String(parsed.detail);
    } catch {}
    throw new VpnApiError(detail, res.status);
  }
  return res.json();
}

export const qrUrl = (subId: string) => `${VPN_API}/api/qr/${encodeURIComponent(subId)}.png`;

export const shortDate = (value: string) => (value || "").split(/[T ]/)[0];

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
