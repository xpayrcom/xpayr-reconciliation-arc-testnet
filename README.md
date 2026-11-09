<div align="center">
  <a href="https://xpayr.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://xpayr.com/public/images/xpayr-logo-white.png" />
      <source media="(prefers-color-scheme: light)" srcset="https://xpayr.com/public/images/xpayr-logo-black.png" />
      <img src="https://xpayr.com/public/images/xpayr-logo-white.png" alt="XPayr Official Logo" width="220" />
    </picture>
  </a>
  <p>
    <a href="https://xpayr.com"><img src="https://xpayr.com/partner-badge.php?type=powered_by&theme=dark" alt="Powered by XPayr" height="28" /></a>
    <a href="https://mcp.xpayr.com"><img src="https://img.shields.io/badge/MCP_Portal-mcp.xpayr.com-029bfd?style=for-the-badge" alt="XPayr MCP Portal" height="28" /></a>
    <a href="https://docs.xpayr.com"><img src="https://img.shields.io/badge/Docs-docs.xpayr.com-10b981?style=for-the-badge" alt="XPayr Docs" height="28" /></a>
    <a href="https://www.npmjs.com/package/@xpayr/mcp-server"><img src="https://img.shields.io/npm/v/@xpayr/mcp-server?style=for-the-badge&color=cb3837&label=MCP%20NPM" alt="NPM @xpayr/mcp-server" height="28" /></a>
  </p>
  <p>
    <a href="https://xpayr.com"><b>Official Website</b></a> •
    <a href="https://mcp.xpayr.com"><b>AI &amp; MCP Portal (21 Tools)</b></a> •
    <a href="https://docs.xpayr.com"><b>Developer Docs</b></a> •
    <a href="https://xpayr.com/developers"><b>Developer Hub</b></a> •
    <a href="https://xpayr.com/tools/crypto-payment-fee-calculator"><b>0.5% Fee Calculator</b></a>
  </p>
</div>

---

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
