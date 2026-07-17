import { getAddress } from "ethers";
import { ARC_TESTNET, streamConfig } from "../src/config.mjs";
import { classifyLog, decodePaymentSplit, selectBatch } from "../src/indexer.mjs";
import { rpc } from "../src/rpc.mjs";

const address = getAddress(process.env.XPAYR_SPLITTER_ADDRESS || "");
const stream = streamConfig({ contractAddress: address, activationBlock: Number(process.env.START_BLOCK || 0) });
const chainId = Number.parseInt(await rpc("eth_chainId", []), 16);
if (chainId !== ARC_TESTNET.chain_id) throw new Error("Arc Testnet chain ID mismatch");
const head = Number.parseInt(await rpc("eth_blockNumber", []), 16);
const batch = selectBatch(stream.activation_block, head, Number(process.env.BATCH_SIZE || 1000));
if (!batch.has_work) process.exit(0);
const logs = await rpc("eth_getLogs", [{ address, fromBlock: `0x${batch.from_block.toString(16)}`, toBlock: `0x${batch.to_block.toString(16)}` }]);
for (const rawLog of logs) {
  const classified = classifyLog(stream, rawLog);
  if (classified.accepted) console.log(JSON.stringify({ identity: classified.event_identity, integrity_hash: classified.integrity_hash, payment_split: decodePaymentSplit(classified.event) }));
}
console.error(JSON.stringify({ scanned: [batch.from_block, batch.to_block], next_block: batch.next_block, events: logs.length }));
