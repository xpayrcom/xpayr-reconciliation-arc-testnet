import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JsonRpcProvider, getAddress } from "ethers";
import { classifyLog, decodePaymentSplit, health } from "../src/indexer.mjs";

const evidence = JSON.parse(await readFile(new URL("../evidence/arc-testnet-payment-split.json", import.meta.url), "utf8"));
const provider = new JsonRpcProvider("https://rpc.testnet.arc.network", evidence.chain_id, { staticNetwork: true });

try {
  const [receipt, head] = await Promise.all([
    provider.send("eth_getTransactionReceipt", [evidence.transaction_hash]),
    provider.getBlockNumber(),
  ]);
  assert.ok(receipt, "Known receipt is unavailable");
  assert.equal(Number.parseInt(receipt.status, 16), 1);
  assert.equal(Number.parseInt(receipt.blockNumber, 16), evidence.block_number);
  assert.equal(receipt.blockHash.toLowerCase(), evidence.block_hash.toLowerCase());

  const rawLog = receipt.logs.find((log) =>
    Number.parseInt(log.logIndex, 16) === evidence.log_index
      && log.address.toLowerCase() === evidence.splitter_contract.toLowerCase());
  assert.ok(rawLog, "Expected PaymentSplit log is unavailable");

  const classified = classifyLog({
    chain_id: evidence.chain_id,
    contract_address: evidence.splitter_contract,
    activation_block: evidence.block_number,
  }, rawLog, "arc-public-rpc");
  assert.equal(classified.classification, "accepted");
  const split = decodePaymentSplit(classified.event);
  assert.equal(split.payment_id_bytes32.toLowerCase(), evidence.payment_id.toLowerCase());
  assert.equal(getAddress(split.payer), getAddress(evidence.payer));
  assert.equal(getAddress(split.token), getAddress(evidence.token));
  assert.equal(split.amount_units, evidence.amount_units);
  assert.equal(split.platform_amount_units, evidence.platform_amount_units);
  assert.equal(split.vendor_amount_units, evidence.vendor_amount_units);
  assert.equal(getAddress(split.platform_wallet), getAddress(evidence.platform_wallet));
  assert.equal(getAddress(split.vendor_wallet), getAddress(evidence.vendor_wallet));

  const modelHealth = health({
    finalized_head_block: head,
    last_scanned_block: head,
    cursor_lag_seconds: 0,
    consecutive_failures: 0,
    provider_disagreement: false,
    duplicate_conflict: false,
    continuity_broken: false,
  });
  assert.equal(modelHealth.state, "healthy");

  const statusResponse = await fetch(`https://xpayr.com/api/v1/payments/${encodeURIComponent(evidence.session_id)}/status`, {
    headers: { "User-Agent": "XPayr-Arc-Reconciliation-Verifier/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(statusResponse.status, 200);
  const payment = await statusResponse.json();
  assert.equal(payment.status, "completed");

  console.log(JSON.stringify({
    ok: true,
    event_identity: classified.event_identity,
    integrity_hash: classified.integrity_hash,
    transaction_hash: evidence.transaction_hash,
    block_number: evidence.block_number,
    payment_status: payment.status,
    read_model_health: modelHealth.state,
  }));
} finally {
  provider.destroy();
}
