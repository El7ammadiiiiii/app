import type { PatternDefinition } from '../common/types';

const ascendingChannel: PatternDefinition = {
  id: 'channels/ascending-channel',
  title: 'Ascending Channel',
  category: 'channels',
  family: 'chart',
  pythonNames: ['Ascending Channel'],
  pythonCategories: ['channels'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'channel'],
};

export default ascendingChannel;
