# XPayr Reconciliation Indexer for Arc Testnet

[![CI](https://github.com/xpayrcom/xpayr-reconciliation-arc-testnet/actions/workflows/ci.yml/badge.svg)](https://github.com/xpayrcom/xpayr-reconciliation-arc-testnet/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-0f766e.svg)](LICENSE)

Read-only Arc Testnet reconciliation reference for XPAYR payment events, cursor checkpoints, deduplication, and RPC health monitoring.

> **Status:** Experimental read model · not a payment source of truth

## Purpose

Show how to derive an auditable read model from allowlisted XPAYR and Arc Testnet events without mutating payment status.

## Included

- Allowlisted event configuration
- Cursor and transaction-log deduplication primitives
- RPC lag, receipt, and reconciliation health checks

## Quick start

```bash
cp .env.example .env
npm install
npm test
```

Set `ARC_TESTNET_RPC_URL` only when you need to pin a specific official Arc Testnet endpoint; the known-payment verifier falls back across the published Arc RPC set when a historical receipt is temporarily missing on the primary endpoint.

## Operational boundary

This repository scans only an explicitly configured XPAYR splitter address and the canonical `PaymentSplit` event. It produces a derived reconciliation record and never mutates an XPayr payment session.

See [`docs/architecture.md`](docs/architecture.md) for cursor transactions, event identity, conflict handling, provider cross-checks, and health states. `npm run scan` is read-only and prints accepted records as NDJSON.

Use an XPayr test key before live credentials. Never expose `sk_test_*`, `sk_live_*`, agent keys, webhook secrets, or wallet private keys in browser code or commits.

## Arc status

This repository supports **Arc Testnet** only. It does not claim Arc Mainnet production availability or endorsement by Circle. Arc is a trademark of Circle Internet Group, Inc. and/or its affiliates.

## Live reconciliation evidence

The committed [`arc-testnet-payment-split.json`](evidence/arc-testnet-payment-split.json) fixture points to a real completed XPayr transaction. The scheduled read-only workflow retrieves the raw RPC receipt, applies the same allowlist and event-normalization path as the indexer, decodes `PaymentSplit`, validates every amount and recipient, and cross-checks the public XPayr payment status. It never mutates payment state.

## Documentation

- [Developer Hub](https://xpayr.com/developers)
- [Merchant API documentation](https://xpayr.com/doc-api)
- [Testnet checkout guide](https://xpayr.com/developers/testnet-checkout-api)
- [Webhook signature guide](https://xpayr.com/developers/webhook-signature-guide)

## Security

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability. Payment completion must be based on verified XPayr webhook/API state and canonical on-chain evidence, not browser callbacks alone.

## License

MIT. See [LICENSE](LICENSE).
