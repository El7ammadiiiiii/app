import type { PatternDefinition } from '../common/types';

const horizontalChannel: PatternDefinition = {
  id: 'channels/horizontal-channel',
  title: 'Horizontal Channel',
  category: 'channels',
  family: 'chart',
  pythonNames: ['Horizontal Channel'],
  pythonCategories: ['channels'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['ranging', 'channel'],
};

export default horizontalChannel;
