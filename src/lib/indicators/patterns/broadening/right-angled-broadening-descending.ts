import type { PatternDefinition } from '../common/types';

const rightAngledBroadeningDescending: PatternDefinition = {
  id: 'broadening/right-angled-broadening-descending',
  title: 'Right-Angled Descending Broadening',
  description:
    'Right-angled broadening pattern with horizontal support and expanding swing highs that usually breaks lower.',
  category: 'broadening',
  family: 'chart',
  pythonNames: [
    'Right Angled Descending Broadening',
    'Descending Right Angled Broadening',
  ],
  pythonCategories: ['broadening'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['volatility', 'bearish', 'expansion'],
};

export default rightAngledBroadeningDescending;
