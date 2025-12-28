import type { PatternDefinition } from '../common/types';

const resistanceTrendline: PatternDefinition = {
  id: 'trendlines/resistance-trendline',
  title: 'Resistance Trendline',
  category: 'trendlines',
  family: 'trend',
  pythonNames: ['Resistance Trendline'],
  pythonCategories: ['trendlines'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['resistance', 'trendline'],
};

export default resistanceTrendline;
