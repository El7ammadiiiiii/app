import type { PatternDefinition } from '../common/types';

const bullishMomentum: PatternDefinition = {
  id: 'scalping/bullish-momentum',
  title: 'Bullish Momentum',
  category: 'scalping',
  family: 'momentum',
  pythonNames: ['Bullish Momentum'],
  pythonCategories: ['scalping'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['momentum', 'bullish'],
};

export default bullishMomentum;
