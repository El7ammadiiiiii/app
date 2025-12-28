import type { PatternDefinition } from '../common/types';

const reversalRisingWedge: PatternDefinition = {
  id: 'reversal-wedges/reversal-rising-wedge',
  title: 'Reversal Rising Wedge',
  description:
    'Classical bearish reversal wedge where price loses momentum inside converging rising trendlines before breaking down.',
  category: 'reversal-wedges',
  family: 'chart',
  pythonNames: ['Reversal Rising Wedge', 'Rising Wedge (Reversal)'],
  pythonCategories: ['reversal_wedges', 'wedges'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['reversal', 'bearish', 'wedge'],
};

export default reversalRisingWedge;
