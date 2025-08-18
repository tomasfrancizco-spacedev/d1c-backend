# Fee Management System

This module implements the Fee Harvester and Fee Distributor functionalities for the D1C token system using Solana's Transfer Fee extension.

## Overview

- Every transfer with the D1C token withholds a 3.5% fee at the recipient's account. Example: sending 100 tokens results in the recipient receiving 96.5 tokens and 3.5 tokens being withheld on the recipient's token account.
- Withheld fees are harvested to the OPS wallet and then distributed using a mint/burn mechanism to maintain supply neutrality.

### End-to-end flow summary

1. Transfer happens → 3.5% is withheld on recipient's token account.
2. Harvesting: Harvest all withheld amounts to the OPS wallet.
3. Distribution (supply neutral mint/burn approach):
   - 1% stays in OPS (already collected during harvest).
   - 2% is minted directly to the college's ATA (or COMMUNITY wallet if no linked college).
   - 2% is burned from the OPS wallet to maintain supply neutrality.
   - 0.5% is burned from OPS wallet (deflationary) only if the current burn period cap has not been reached; otherwise the would-be burn amount is minted to the college instead.

## Fee Harvesting

- OPS runs harvesting over transactions where `fee_harvested = false`.
- For each unharvested transaction, withdraw the 3.5% withheld amount to the OPS wallet.
- Mark processed transactions as `fee_harvested = true`.
- Harvesting uses Token-2022 transfer-fee APIs to withdraw withheld amounts.

## Fee Distribution (supply neutral mint/burn approach)

- The 1% OPS share remains in the OPS wallet (already collected during harvest).
- The 2% college share:
  - Mint 2% directly to the college's ATA (or COMMUNITY wallet if no linked college).
  - Burn 2% from the OPS wallet to maintain supply neutrality.
- The 0.5% deflationary burn:
  - Enforced by a burn cap per rolling period (1 year).
  - If burning the calculated amount would exceed the remaining cap for the current period, we do not burn any portion of it; instead, the full would-be burn amount is minted to the college along with their regular 2%.
  - Burn from OPS wallet and update burn tracker.

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
MINT_AUTHORITY_SECRET_KEY=[1,2,3,...]
```
- Ensure `d1c_wallet` contains:
  - OPS wallet
  - COMMUNITY wallet
- The withdraw authority must match your mint's transfer-fee configuration.
- The mint authority must be configured to allow minting new tokens to college wallets.

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