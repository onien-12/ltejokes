export const VPN_API = (process.env.REACT_APP_VPN_API_URL || "/api/vpn").replace(/\/+$/, "");

export const CLIENT_ID_KEY = "client_id";

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
};

export type StatusEntry = {
  name: string;
  description: string;
  online: boolean;
  details: string;
};

export type SubscriptionView = {
  server_name: string;
  vless_config: string;
  sub_link: string;
  created_at: string;
  sub_url: string;
  sub_app: string;
};

export type Challenge = { digest: string; difficulty: number };

export class VpnApiError extends Error {}

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
    throw new VpnApiError(detail);
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
