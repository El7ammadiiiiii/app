import type { PatternDefinition } from '../common/types';

const bearishBreakout: PatternDefinition = {
  id: 'breakouts/bearish-breakout',
  title: 'Bearish Breakout',
  category: 'breakouts',
  family: 'structure',
  pythonNames: ['Bearish Breakout'],
  pythonCategories: ['breakouts'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['breakout', 'bearish'],
};

export default bearishBreakout;
