import type { PatternDefinition } from '../common/types';

const reversalFallingWedge: PatternDefinition = {
  id: 'reversal-wedges/reversal-falling-wedge',
  title: 'Reversal Falling Wedge',
  description:
    'Bullish reversal wedge where price grinds lower within converging trendlines before breaking higher and reversing trend.',
  category: 'reversal-wedges',
  family: 'chart',
  pythonNames: ['Reversal Falling Wedge', 'Falling Wedge (Reversal)'],
  pythonCategories: ['reversal_wedges', 'wedges'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['reversal', 'bullish', 'wedge'],
};

export default reversalFallingWedge;
