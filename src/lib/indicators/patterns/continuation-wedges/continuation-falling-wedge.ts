import type { PatternDefinition } from '../common/types';

const continuationFallingWedge: PatternDefinition = {
  id: 'continuation-wedges/continuation-falling-wedge',
  title: 'Continuation Falling Wedge',
  description:
    'Bullish continuation structure defined by two descending, converging trendlines that compress before trend continuation higher.',
  category: 'continuation-wedges',
  family: 'chart',
  pythonNames: [
    'Continuation Falling Wedge',
    'Falling Wedge (Continuation)',
  ],
  pythonCategories: ['continuation_wedges', 'wedges'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'bullish', 'wedge'],
};

export default continuationFallingWedge;
