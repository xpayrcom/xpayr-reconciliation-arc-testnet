import { createHash } from "node:crypto";
import { Interface, getAddress } from "ethers";
import abi from "../config/payment-splitter.abi.json" with { type: "json" };

export const splitterInterface = new Interface(abi);
export const PAYMENT_SPLIT_TOPIC = splitterInterface.getEvent("PaymentSplit").topicHash.toLowerCase();

const hex = (value, bytes) => {
  const normalized = String(value || "").toLowerCase();
  if (!new RegExp(`^0x[a-f0-9]{${bytes * 2}}$`).test(normalized)) throw new TypeError(`Expected ${bytes}-byte hex value`);
  return normalized;
};

export function selectBatch(nextBlock, finalizedHead, batchSize = 1000) {
  if (!Number.isSafeInteger(nextBlock) || nextBlock < 0 || !Number.isSafeInteger(finalizedHead) || finalizedHead < 0 || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000) throw new TypeError("Invalid cursor batch inputs");
  if (nextBlock > finalizedHead) return { has_work: false, from_block: null, to_block: null, next_block: nextBlock };
  const toBlock = Math.min(finalizedHead, nextBlock + batchSize - 1);
  return { has_work: true, from_block: nextBlock, to_block: toBlock, next_block: toBlock + 1 };
}

export function normalizeLog(log, providerId = "primary") {
  const blockNumber = Number.parseInt(log.blockNumber, 16);
  const transactionIndex = Number.parseInt(log.transactionIndex, 16);
  const logIndex = Number.parseInt(log.logIndex, 16);
  if (![blockNumber, transactionIndex, logIndex].every(Number.isSafeInteger)) throw new TypeError("Invalid event indexes");
  const topics = (log.topics || []).map((topic) => hex(topic, 32));
  if (!topics.length || !/^0x(?:[a-f0-9]{2})*$/.test(String(log.data))) throw new TypeError("Malformed event payload");
  return { network_key: "arc-testnet", chain_id: 5042002, block_number: blockNumber, block_hash: hex(log.blockHash, 32), tx_hash: hex(log.transactionHash, 32), transaction_index: transactionIndex, log_index: logIndex, contract_address: getAddress(log.address), topic0: topics[0], topics, data_hex: String(log.data).toLowerCase(), removed: Boolean(log.removed), provider_id: providerId };
}

export function eventIdentity(event) { return `${event.chain_id}:${event.tx_hash}:${event.log_index}`; }

export function integrityHash(event) {
  const canonical = JSON.stringify({ chain_id: event.chain_id, block_number: event.block_number, block_hash: event.block_hash, transaction_index: event.transaction_index, contract_address: event.contract_address.toLowerCase(), topic0: event.topic0, topics: event.topics, data_hex: event.data_hex, removed: event.removed });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function classifyLog(stream, rawLog, providerId = "primary") {
  try {
    const event = normalizeLog(rawLog, providerId);
    if (event.chain_id !== stream.chain_id || event.contract_address.toLowerCase() !== stream.contract_address.toLowerCase() || event.topic0 !== PAYMENT_SPLIT_TOPIC || event.block_number < stream.activation_block) return { classification: "ignored", accepted: false };
    return { classification: "accepted", accepted: true, event, event_identity: eventIdentity(event), integrity_hash: integrityHash(event) };
  } catch (error) {
    return { classification: "rejected", accepted: false, stop_cursor: true, error: error.message };
  }
}

export function decodePaymentSplit(event) {
  const decoded = splitterInterface.decodeEventLog("PaymentSplit", event.data_hex, event.topics);
  return { payment_id_bytes32: decoded.paymentId, payer: decoded.payer, token: decoded.token, amount_units: decoded.amount.toString(), platform_amount_units: decoded.platformAmount.toString(), vendor_amount_units: decoded.vendorAmount.toString(), platform_wallet: decoded.platformWallet, vendor_wallet: decoded.vendorWallet, tx_hash: event.tx_hash, block_number: event.block_number, log_index: event.log_index };
}

export function dedupe(storedIntegrityHash, candidate) {
  const candidateHash = integrityHash(candidate);
  if (storedIntegrityHash === undefined || storedIntegrityHash === null) return { status: "new", safe: true, integrity_hash: candidateHash };
  if (storedIntegrityHash === candidateHash) return { status: "duplicate", safe: true, integrity_hash: candidateHash };
  return { status: "conflict", safe: false, stop_cursor: true, finding: "duplicate_event_conflict", integrity_hash: candidateHash };
}

export function health(metrics, thresholds = {}) {
  const limits = { max_lag_blocks: 25, max_lag_seconds: 120, stalled_seconds: 300, max_consecutive_failures: 2, ...thresholds };
  const lagBlocks = Math.max(0, metrics.finalized_head_block - metrics.last_scanned_block);
  const unsafe = Boolean(metrics.provider_disagreement || metrics.duplicate_conflict || metrics.continuity_broken);
  let state = "healthy";
  if (unsafe) state = "unsafe";
  else if (metrics.cursor_lag_seconds >= limits.stalled_seconds && lagBlocks > 0) state = "stalled";
  else if (lagBlocks > limits.max_lag_blocks || metrics.cursor_lag_seconds > limits.max_lag_seconds || metrics.consecutive_failures > limits.max_consecutive_failures) state = "degraded";
  return { state, cursor_lag_blocks: lagBlocks, cursor_lag_seconds: metrics.cursor_lag_seconds, automated_repair_allowed: false };
}

export function compareReceipts(primary, secondary) {
  const fields = ["transactionHash", "blockHash", "blockNumber", "status"];
  const mismatches = fields.filter((field) => String(primary?.[field] || "").toLowerCase() !== String(secondary?.[field] || "").toLowerCase());
  return { consistent: mismatches.length === 0, mismatches };
}
