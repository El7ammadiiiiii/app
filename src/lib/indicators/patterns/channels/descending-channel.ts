import type { PatternDefinition } from '../common/types';

const descendingChannel: PatternDefinition = {
  id: 'channels/descending-channel',
  title: 'Descending Channel',
  category: 'channels',
  family: 'chart',
  pythonNames: ['Descending Channel'],
  pythonCategories: ['channels'],
  proOnly: false,
  defaultEnabled: true,
  tags: ['continuation', 'channel'],
};

export default descendingChannel;
