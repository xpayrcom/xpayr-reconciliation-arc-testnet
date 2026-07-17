import { ARC_TESTNET } from "./config.mjs";

export async function rpc(method, params, { url = ARC_TESTNET.rpc_url, fetch: fetchImpl = globalThis.fetch } = {}) {
  if (url !== ARC_TESTNET.rpc_url && !process.env.ALLOW_SECONDARY_RPC) throw new Error("RPC URL is not allowlisted");
  const response = await fetchImpl(url, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(12_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error || !("result" in body)) throw new Error(body.error?.message || `RPC failure ${response.status}`);
  return body.result;
}
