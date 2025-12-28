import type { PatternDefinition } from '../common/types';

const broadeningBottom: PatternDefinition = {
  id: 'broadening/broadening-bottom',
  title: 'Broadening Bottom',
  description:
    'Bullish broadening formation where expanding volatility after a decline hints at accumulation and reversal attempts.',
  category: 'broadening',
  family: 'chart',
  pythonNames: ['Broadening Bottom', 'Broadening Bottom Pattern'],
  pythonCategories: ['broadening'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['reversal', 'bullish', 'volatility'],
};

export default broadeningBottom;
