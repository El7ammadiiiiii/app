import type { PatternDefinition } from '../common/types';

const bullPennant: PatternDefinition = {
  id: 'pennants/bull-pennant',
  title: 'Bull Pennant',
  shortTitle: 'Bull Pennant',
  description:
    'Continuation pattern marked by a sharp impulsive rally (flagpole) followed by a small converging consolidation before trend resumption.',
  category: 'pennants',
  family: 'chart',
  pythonNames: ['Bull Pennant', 'Bullish Pennant'],
  pythonCategories: ['pennants', 'flags'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'bullish', 'compression'],
};

export default bullPennant;
