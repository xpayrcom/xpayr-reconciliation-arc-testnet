# Read-only reconciliation architecture

The indexer is a derived read model. It does not own payment status and it never calls XPayr mutation endpoints.

## Pipeline

1. Verify Arc Testnet chain ID `5042002`.
2. Select a bounded block range from a durable cursor.
3. Fetch logs only from an allowlisted XPAYR contract.
4. Accept only the canonical `PaymentSplit` topic.
5. Deduplicate on `(chainId, transactionHash, logIndex)`.
6. Store an integrity hash alongside the decoded read model.
7. Stop the cursor on conflicting duplicates, continuity breaks, or provider disagreement.
8. Compare the derived record with XPayr payment and webhook state; raise a finding instead of rewriting either source.

Production storage should enforce a unique event-identity index and advance the cursor in the same transaction as accepted event inserts. A secondary RPC may be used for receipt comparison, but it must be explicitly allowlisted.

Arc is a trademark of Circle Internet Group, Inc. and/or its affiliates.
