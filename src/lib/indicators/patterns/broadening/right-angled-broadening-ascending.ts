import type { PatternDefinition } from '../common/types';

const rightAngledBroadeningAscending: PatternDefinition = {
  id: 'broadening/right-angled-broadening-ascending',
  title: 'Right-Angled Ascending Broadening',
  description:
    'Hybrid broadening pattern with a rising horizontal resistance cap and expanding swing lows, typically resolving higher.',
  category: 'broadening',
  family: 'chart',
  pythonNames: [
    'Right Angled Ascending Broadening',
    'Ascending Right Angled Broadening',
  ],
  pythonCategories: ['broadening'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['volatility', 'bullish', 'expansion'],
};

export default rightAngledBroadeningAscending;
