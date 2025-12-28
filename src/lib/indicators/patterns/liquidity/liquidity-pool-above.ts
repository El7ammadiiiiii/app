import type { PatternDefinition } from '../common/types';

const liquidityPoolAbove: PatternDefinition = {
  id: 'liquidity/liquidity-pool-above',
  title: 'Liquidity Pool (Above)',
  category: 'liquidity',
  family: 'liquidity',
  pythonNames: ['Liquidity Pool (Above)'],
  pythonCategories: ['liquidity'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['liquidity', 'pool'],
};

export default liquidityPoolAbove;
