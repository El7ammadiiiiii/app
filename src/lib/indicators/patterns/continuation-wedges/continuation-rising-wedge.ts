import type { PatternDefinition } from '../common/types';

const continuationRisingWedge: PatternDefinition = {
  id: 'continuation-wedges/continuation-rising-wedge',
  title: 'Continuation Rising Wedge',
  description:
    'Bearish-leaning continuation formation where price grinds higher inside two rising but converging trendlines before resolving lower.',
  category: 'continuation-wedges',
  family: 'chart',
  pythonNames: [
    'Continuation Rising Wedge',
    'Rising Wedge (Continuation)',
  ],
  pythonCategories: ['continuation_wedges', 'wedges'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'bearish', 'wedge'],
};

export default continuationRisingWedge;
