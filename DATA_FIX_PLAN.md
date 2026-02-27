# Data Fix Plan

## 1. Problem
Many charts were showing fake data (TVL used for Price/Gas/etc.). I removed the fake data mapping.
Result: `ChartCard` now receives `fullData={null}`, renders an empty space `<div className="h-4" />`.
User sees "missing charts" (empty boxes underneath the value).

## 2. Solution: Restore Visualization using *Real* Data

I will enrich the `ChartCard` calls with derived charts from `recent_blocks` (25 data points).
It's not "historical" (months/years) but it's "live activity" (last few minutes/hours).

### Candidates for Real Data (from `recent_blocks`)

1. **Daily Transactions Chart**
   - *Current*: `fullData={null}`
   - *Fix*: Map `recent_blocks.map(b => [b.timestamp * 1000, b.txn_count])`
   - *Title*: "Recent Activity (Transactions per Block)"

2. **Daily Gas Used Chart**
   - *Current*: `fullData={null}`
   - *Fix*: Map `recent_blocks.map(b => [b.timestamp * 1000, b.gas_used])`
   - *Title*: "Recent Gas Usage"

3. **Average Block Time Chart** (13.0s)
   - *Current*: `fullData={null}`
   - *Fix*: Calculate time diffs between blocks.
   - *Map*: `blocks.map((b, i) => [b.timestamp*1000, (b.timestamp - blocks[i+1]?.timestamp)])`

4. **Average Block Size Chart**
   - *Current*: `fullData={null}`
   - *Fix*: I don't have block size in `recent_blocks` enriched data (only gas used). Can use `gas_used` as proxy or skip.

5. **Average Gas Price Chart**
   - *Current*: `fullData={null}` (Value: 0.3 Gwei)
   - *Fix*: Can I get gas price per block?
     - `recent_blocks` has `base_fee_per_gas` usually? Let's check `rpc_enricher.py`.
     - `rpc_enricher.py` fetches `eth_getBlockByNumber(full=False)`.
     - The output `recent_blocks` has fields: `number`, `txn_count`, `gas_used`, `gas_used_pct`, `failed_txn_count`, `reward`, `builder`.
     - It does *not* seem to have `base_fee` or `gas_price` stored in `recent_blocks` array in `crawler/data/latest/ethereum.json` structure (based on `await_terminal` output).
     - However, I have `gas_estimates` array: `[ { action, cost_usd, ... } ]` - point in time.
     - So Gas Price Chart might have to stay empty or flat.

6. **Block Count & Rewards Chart**
   - *Current*: `fullData={null}`
   - *Fix*: Map `recent_blocks.map(b => [b.timestamp*1000, b.reward])` (if reward available).
   - In `ethereum.json` snippet: `reward: 274.2140 ETH` (Wait, that's absurdly high for one block. Usually ~2 ETH. Ah, likely total daily reward in the big stat, but per-block reward in the list?).
   - Let's check `recent_blocks` data from previous `read_file` output. `reward` field is present.

### Candidates for "No Data" UI Improvement
For charts where I truly have *no* time-series (Price, Market Cap, Supply Growth, ERC-20 Transfers):
- **Current**: `<div className="h-4" />` inside `ChartCard`.
- **Improved**: Render a subtle "No historical data" message or just collapse the space so it looks like a Stat Card.
- **Even Better**: If `fullData` is null, don't render the bottom padding/div at all in `ChartCard`. Just make it a nice compact card.

## 3. Implementation Steps

1. **Modify `ChartCard` component**:
   - If `!hasFullChart`, render a different layout or just hide the chart area cleanly (reduce padding).
   - The current `<div className="h-4" />` is why it looks "empty".

2. **Prepare `recentBlocksSeries` in `page.tsx`**:
   - Create helper memo `recentBlocksSeries` that maps `recent_blocks` to time-series format `[ts, value][]`.
     - `txsSeries`: `[ts, txn_count]`
     - `gasSeries`: `[ts, gas_used]`
     - `rewardSeries`: `[ts, reward]`
     - `gasPctSeries`: `[ts, gas_used_pct]`

3. **Wire up the Real Charts**:
   - **Daily Transactions** → Pass `txsSeries`. Change label to "Recent Txs (25 Blocks)".
   - **Daily Gas Used** → Pass `gasSeries`. Change label to "Recent Gas (25 Blocks)".
   - **Block Rewards** → Pass `rewardSeries`.
   - **Network Utilization** → Pass `gasPctSeries`.

4. **Address "Price History"**:
   - I still don't have price history.
   - Users *expect* price history.
   - I can't fake it.
   - I will leave it as a Stat Card (no chart) but improve the UI so it doesn't look "broken".

Let's start by improving `ChartCard` to handle no-data gracefully, then wire up the block data.
