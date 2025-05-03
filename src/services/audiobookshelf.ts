import { createAudiobookshelfClient } from './audiobookshelf/audiobookshelfClient';
import { validateAudiobookshelfConnection } from './audiobookshelf/audiobookshelfConnection';
import { getCurrentlyListeningBooks } from './audiobookshelf/audiobookshelfProgress';
import { formatAudiobookForHardcover } from './audiobookshelf/audiobookshelfFormatters';
import { FormattedBook } from '../types';
import { MediaProgress } from '../audiobookshelfTypes';

export function createAudiobookshelfService() {
  const client = createAudiobookshelfClient();

  return {
    validateConnection: async (): Promise<boolean> => validateAudiobookshelfConnection(client),

    getCurrentlyListening: async (): Promise<MediaProgress[]> => getCurrentlyListeningBooks(client),

    formatBookForHardcover: async (mediaProgress: MediaProgress): Promise<FormattedBook> =>
      formatAudiobookForHardcover(client, mediaProgress),
  };
}

const AudiobookshelfService = createAudiobookshelfService();
export default AudiobookshelfService;
