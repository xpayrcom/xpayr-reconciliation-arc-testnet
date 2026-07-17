import assert from "node:assert/strict";
import test from "node:test";
import { AbiCoder, Interface, zeroPadValue } from "ethers";
import abi from "../config/payment-splitter.abi.json" with { type: "json" };
import { streamConfig } from "../src/config.mjs";
import { PAYMENT_SPLIT_TOPIC, classifyLog, compareReceipts, decodePaymentSplit, dedupe, health, selectBatch } from "../src/indexer.mjs";

const contract = "0x1111111111111111111111111111111111111111";
const payer = "0x2222222222222222222222222222222222222222";
const token = "0x3600000000000000000000000000000000000000";
const platform = "0x3333333333333333333333333333333333333333";
const vendor = "0x4444444444444444444444444444444444444444";
const paymentId = `0x${"a".repeat(64)}`;
const iface = new Interface(abi);
const encoded = iface.encodeEventLog(iface.getEvent("PaymentSplit"), [paymentId, payer, token, 1_000_000n, 5_000n, 995_000n, platform, vendor]);
const rawLog = { address: contract, blockNumber: "0x64", blockHash: `0x${"b".repeat(64)}`, transactionHash: `0x${"c".repeat(64)}`, transactionIndex: "0x1", logIndex: "0x2", topics: encoded.topics, data: encoded.data, removed: false };

test("selects bounded cursor batches", () => assert.deepEqual(selectBatch(10, 25, 10), { has_work: true, from_block: 10, to_block: 19, next_block: 20 }));
test("accepts only allowlisted PaymentSplit logs", () => {
  assert.equal(encoded.topics[0].toLowerCase(), PAYMENT_SPLIT_TOPIC);
  const accepted = classifyLog(streamConfig({ contractAddress: contract, activationBlock: 10 }), rawLog);
  assert.equal(accepted.accepted, true);
  assert.equal(decodePaymentSplit(accepted.event).vendor_amount_units, "995000");
  assert.equal(classifyLog(streamConfig({ contractAddress: vendor }), rawLog).accepted, false);
});
test("deduplicates identical events and stops conflicts", () => {
  const accepted = classifyLog(streamConfig({ contractAddress: contract }), rawLog);
  assert.equal(dedupe(accepted.integrity_hash, accepted.event).status, "duplicate");
  assert.equal(dedupe(`sha256:${"0".repeat(64)}`, accepted.event).stop_cursor, true);
});
test("reports health and provider disagreement", () => {
  assert.equal(health({ finalized_head_block: 100, last_scanned_block: 99, cursor_lag_seconds: 5, consecutive_failures: 0 }).state, "healthy");
  assert.equal(health({ finalized_head_block: 100, last_scanned_block: 1, cursor_lag_seconds: 5, consecutive_failures: 0 }).state, "degraded");
  assert.equal(compareReceipts({ transactionHash: "0x1", blockHash: "0x2", blockNumber: "0x3", status: "0x1" }, { transactionHash: "0x1", blockHash: "0x9", blockNumber: "0x3", status: "0x1" }).consistent, false);
});
