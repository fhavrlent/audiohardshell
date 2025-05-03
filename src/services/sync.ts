import { createAudiobookshelfService } from './audiobookshelf';
import { createHardcoverService } from './hardcover';
import logger from './logger';
import { syncBooksToHardcover } from './sync/orchestrator';

export function createSyncService() {
  try {
    const absService = createAudiobookshelfService();
    const hardcoverService = createHardcoverService();

    return {
      findBooksInHardcover: async (): Promise<void> =>
        syncBooksToHardcover(absService, hardcoverService),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error initializing sync service: ${errorMessage}`);
    throw error;
  }
}

const SyncService = createSyncService();
export default SyncService;
