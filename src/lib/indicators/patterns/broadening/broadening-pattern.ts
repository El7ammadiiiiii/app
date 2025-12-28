import type { PatternDefinition } from '../common/types';

const broadeningPattern: PatternDefinition = {
  id: 'broadening/broadening-pattern',
  title: 'Broadening Pattern',
  shortTitle: 'Megaphone',
  description:
    'Volatility expansion structure where swing highs and lows diverge, forming a megaphone-like shape that often precedes sharp breakouts.',
  category: 'broadening',
  family: 'chart',
  pythonNames: ['Broadening Pattern', 'Megaphone Pattern', 'Broadening Formation'],
  pythonCategories: ['broadening'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['volatility', 'expansion', 'neutral'],
};

export default broadeningPattern;
