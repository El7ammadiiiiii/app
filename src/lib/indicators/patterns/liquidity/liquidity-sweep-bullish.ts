import type { PatternDefinition } from '../common/types';

const liquiditySweepBullish: PatternDefinition = {
  id: 'liquidity/liquidity-sweep-bullish',
  title: 'Liquidity Sweep (Bullish)',
  category: 'liquidity',
  family: 'liquidity',
  pythonNames: ['Liquidity Sweep (Bullish)'],
  pythonCategories: ['liquidity'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['liquidity', 'sweep', 'bullish'],
};

export default liquiditySweepBullish;
