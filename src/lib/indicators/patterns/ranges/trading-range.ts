import type { PatternDefinition } from '../common/types';

const tradingRange: PatternDefinition = {
  id: 'ranges/trading-range',
  title: 'Trading Range',
  category: 'ranges',
  family: 'structure',
  pythonNames: ['Trading Range'],
  pythonCategories: ['ranges'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['ranging', 'neutral'],
};

export default tradingRange;
