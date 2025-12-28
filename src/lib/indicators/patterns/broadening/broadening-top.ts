import type { PatternDefinition } from '../common/types';

const broadeningTop: PatternDefinition = {
  id: 'broadening/broadening-top',
  title: 'Broadening Top',
  description:
    'Bearish broadening structure where expanding swings after an uptrend signal distribution and potential reversal.',
  category: 'broadening',
  family: 'chart',
  pythonNames: ['Broadening Top', 'Broadening Top Pattern'],
  pythonCategories: ['broadening'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['reversal', 'bearish', 'volatility'],
};

export default broadeningTop;
