import type { PatternDefinition } from '../common/types';

const bullishBreakout: PatternDefinition = {
  id: 'breakouts/bullish-breakout',
  title: 'Bullish Breakout',
  category: 'breakouts',
  family: 'structure',
  pythonNames: ['Bullish Breakout'],
  pythonCategories: ['breakouts'],
  proOnly: true,
  defaultEnabled: true,
  tags: ['breakout', 'bullish'],
};

export default bullishBreakout;
