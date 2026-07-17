import { getAddress } from "ethers";

export const ARC_TESTNET = Object.freeze({ network_key: "arc-testnet", chain_id: 5042002, rpc_url: "https://rpc.testnet.arc.network" });

export function streamConfig({ contractAddress, activationBlock = 0 }) {
  return Object.freeze({ ...ARC_TESTNET, contract_address: getAddress(contractAddress), activation_block: Number(activationBlock), event_group: "xpayr-payment-splitter", abi_version: "v1", read_only: true, mainnet_enabled: false });
}
