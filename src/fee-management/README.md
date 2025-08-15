# Fee Management System

This module implements the Fee Harvester and Fee Distributor functionalities for the D1C token system using Solana's Transfer Fee extension.

## Overview

- Every transfer with the D1C token withholds a 3.5% fee at the recipient’s account. Example: sending 100 tokens results in the recipient receiving 96.5 tokens and 3.5 tokens being withheld on the recipient’s token account.
- Withheld fees are later harvested and distributed by OPS according to the rules below.
- Wallets can be marked `fee_exempt` in the `d1c_wallet` table. When a transaction’s sender is `fee_exempt`, any withheld fee for that transfer is harvested back to the same recipient (effectively making the sender pay no fee).

### End-to-end flow summary

1. Transfer happens → 3.5% is withheld on recipient’s token account.
2. Harvesting:
   - If sender is `fee_exempt`: harvest that withheld amount back to the recipient (refund).
   - If sender is not `fee_exempt`: harvest the withheld amount to the OPS wallet.
3. Distribution (for amounts accumulated in OPS):
   - 1% stays in OPS (already collected during harvest).
   - 2% goes to the user’s linked college, or the COMMUNITY wallet if none was linked at the time of the tx.
   - 0.5% is burned only if the current burn period cap has not been reached; otherwise the would-be burn is fully routed to the college portion.
4. Colleges receive their full 2% because OPS is `fee_exempt` and any fee withheld on the college transfer is subsequently harvested back to the college.

## Fee Harvesting

- OPS runs harvesting over transactions where `fee_harvested = false`.
- For each unharvested transaction:
  - Determine sender’s address.
  - Check `d1c_wallet.fee_exempt`:
    - Sender is `fee_exempt = true`: withdraw the 3.5% withheld amount back to the recipient’s token account (refund).
    - Sender is `fee_exempt = false`: withdraw the 3.5% withheld amount to the OPS wallet (to be distributed later).
- Mark processed transactions as `fee_harvested = true` (and `fee_distributed = true` for the exempt-refund case).
- Notes:
  - OPS is stored in `d1c_wallet` and should be `fee_exempt = true`.
  - Harvesting uses Token-2022 transfer-fee APIs to withdraw withheld amounts.

## Fee Distribution (of the 3.5% fee accumulated in OPS)

- The 1% OPS share is already realized when harvesting to OPS occurs.
- The 2% college share:
  - If the user had a linked college at the time of the transaction, send to that college’s wallet.
  - Otherwise, send to the COMMUNITY wallet.
- College gets the full 2%:
  - Previously, sending 2 tokens could result in ~1.93 received due to the transfer fee.
  - Now, OPS (which is `fee_exempt = true`) sends the 2 tokens, and any withheld fee on that transfer is harvested back to the college’s own token account. Outcome: the college ends up with the full 2 tokens.
- The 0.5% burn:
  - Enforced by a burn cap per rolling period (1 year).
  - If burning the calculated amount would exceed the remaining cap for the current period, we do not burn any portion of it; instead, the full would-be burn amount is added to the college share.

## Burn Cap Policy

- Burn cap is enforced via the `burn_tracker` table with:
  - `periodStartAt` (timestamptz): start of current 1-year period.
  - `burnedAmount` (decimal): total burned in this period.
- The first burn creates the initial period with `periodStartAt = now`.
- The active period rolls forward on each anniversary (e.g., a burn on Aug 13, 2025 sets the period to Aug 13, 2025 → Aug 12, 2026; the next period starts Aug 13, 2026, and so on).
- Cap amount per period: 100,000 tokens.
- Burn is all-or-nothing per distribution execution:
  - If full burn fits under the remaining cap → burn and increment `burnedAmount`.
  - If not → burn none and route the entire burn amount to the college/community transfer.

## Database

- `transaction`:
  - `fee_harvested` (boolean): fees have been harvested from recipient’s token account.
  - `fee_distributed` (boolean): fees have been distributed.
- `d1c_wallet`:
  - `walletType` enum: `OPS`, `COMMUNITY`, …
  - `walletAddress` unique.
  - `fee_exempt` boolean (default false). Set to true for OPS and any other wallets that must send without fees.
- `burn_tracker`:
  - `periodStartAt` timestamptz unique.
  - `burnedAmount` decimal.

## API Endpoints

- Fee Harvesting:
  - `POST /fee-management/harvest-from-transactions`
  - `POST /fee-management/harvest-from-accounts`
  - `POST /fee-management/withdraw-from-mint`
- Fee Distribution:
  - `POST /fee-management/distribute-fees`
  - `GET /fee-management/distribution-summary`
  - `GET /fee-management/distribution-preview`
- Monitoring:
  - `GET /fee-management/total-fees`
  - `GET /fee-management/unharvested-transactions-count`
  - `GET /fee-management/unharvested-transactions`
  - `GET /fee-management/undistributed-transactions-count`
  - `GET /fee-management/undistributed-transactions`

## Configuration

- Environment variables:
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
TOKEN_MINT_ADDRESS=YourTokenMintAddressHere
OPS_WALLET_SECRET_KEY=[1,2,3,...]
WITHDRAW_AUTHORITY_SECRET_KEY=[1,2,3,...]
```
- Ensure `d1c_wallet` contains:
  - OPS wallet with `fee_exempt = true`
  - COMMUNITY wallet
- The withdraw authority must match your mint’s transfer-fee configuration.

## Usage Example

```typescript
// Complete fee processing cycle - fees go to OPS wallet, then distributed.
const result = await feeManagementService.harvestAndDistributeFees({ useTransactionBased: true });

console.log(`Processed ${result.harvestResult.transactionsProcessed} transactions`);
console.log(`Harvested ${result.harvestResult.totalFeesHarvested} tokens to OPS wallet`);
console.log(`Distributed: College ${result.distributionResult.collegeAmount}, Burned ${result.distributionResult.burnedAmount}`);
```

## Security

- Protect withdraw authority secrets.
- Restrict who can trigger harvesting and distribution.
- Monitor fee patterns.