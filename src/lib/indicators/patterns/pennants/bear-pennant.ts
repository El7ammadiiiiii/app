import type { PatternDefinition } from '../common/types';

const bearPennant: PatternDefinition = {
  id: 'pennants/bear-pennant',
  title: 'Bear Pennant',
  shortTitle: 'Bear Pennant',
  description:
    'Continuation pattern that forms after a strong sell-off (flagpole) and a brief converging pause before sellers attempt another leg lower.',
  category: 'pennants',
  family: 'chart',
  pythonNames: ['Bear Pennant', 'Bearish Pennant'],
  pythonCategories: ['pennants', 'flags'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'bearish', 'compression'],
};

export default bearPennant;
