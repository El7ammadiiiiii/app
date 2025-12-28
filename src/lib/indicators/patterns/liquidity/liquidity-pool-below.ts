import type { PatternDefinition } from '../common/types';

const liquidityPoolBelow: PatternDefinition = {
  id: 'liquidity/liquidity-pool-below',
  title: 'Liquidity Pool (Below)',
  category: 'liquidity',
  family: 'liquidity',
  pythonNames: ['Liquidity Pool (Below)'],
  pythonCategories: ['liquidity'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['liquidity', 'pool'],
};

export default liquidityPoolBelow;
