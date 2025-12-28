import type { PatternDefinition } from '../common/types';

const risingWedge: PatternDefinition = {
  id: 'wedges/rising-wedge',
  title: 'Rising Wedge',
  category: 'wedges',
  family: 'chart',
  pythonNames: ['Rising Wedge'],
  pythonCategories: ['wedges'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['reversal', 'bearish'],
};

export default risingWedge;
