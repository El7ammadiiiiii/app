import type { PatternDefinition } from '../common/types';

const bearishMomentum: PatternDefinition = {
  id: 'scalping/bearish-momentum',
  title: 'Bearish Momentum',
  category: 'scalping',
  family: 'momentum',
  pythonNames: ['Bearish Momentum'],
  pythonCategories: ['scalping'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['momentum', 'bearish'],
};

export default bearishMomentum;
