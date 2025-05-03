import logger from '../logger';
import { createAudiobookshelfService } from '../audiobookshelf';
import { createHardcoverService } from '../hardcover';
import { findBookInHardcover } from './matcher';
import { syncAudiobookProgress } from './progressSync';
import { MediaProgress } from '../../audiobookshelfTypes';
import { SyncCache } from '../../types';

type AudiobookshelfService = ReturnType<typeof createAudiobookshelfService>;
type HardcoverService = ReturnType<typeof createHardcoverService>;

type SyncResults = Readonly<{
  foundCount: number;
  notFoundCount: number;
  updatedProgressCount: number;
}>;

export async function syncBooksToHardcover(
  absService: AudiobookshelfService,
  hardcoverService: HardcoverService
): Promise<void> {
  try {
    logger.info('Starting book sync process between Audiobookshelf and Hardcover');

    const currentlyListening = await getCurrentlyListening(absService);

    if (currentlyListening.length === 0) {
      logger.warn('No books to sync - no currently listening books found');
      return;
    }

    const booksToSync: MediaProgress[] = [...currentlyListening];

    logger.info(`Finding ${booksToSync.length} books in Hardcover for sync`);

    const cache: SyncCache = {
      audiobookDetails: new Map(),
      hardcoverAudiobooks: null,
      hardcoverUserId: null,
    };

    const results = await processBooksSync({
      absService,
      hardcoverService,
      books: booksToSync,
      cache,
    });

    logger.info(
      `Book sync completed. Found: ${results.foundCount}, Not Found: ${results.notFoundCount}, Progress Updated: ${results.updatedProgressCount}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error during book sync process', { error: errorMessage });
    throw error;
  }
}

async function getCurrentlyListening(absService: AudiobookshelfService): Promise<MediaProgress[]> {
  try {
    const currentlyListening = await absService.getCurrentlyListening();

    logger.info(`Found ${currentlyListening.length} books currently in progress on Audiobookshelf`);
    return currentlyListening;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to get currently listening books: ${errorMessage}`);
    return [];
  }
}

async function processBooksSync({
  absService,
  hardcoverService,
  books,
  cache,
}: {
  absService: AudiobookshelfService;
  hardcoverService: HardcoverService;
  books: MediaProgress[];
  cache: SyncCache;
}): Promise<SyncResults> {
  let foundCount = 0;
  let notFoundCount = 0;
  let updatedProgressCount = 0;

  if (!cache.hardcoverUserId) {
    await hardcoverService.validateConnection();
    try {
      const hardcoverAudiobooks = await hardcoverService.getCurrentlyReadingAudiobooks();
      cache.hardcoverAudiobooks = hardcoverAudiobooks;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error pre-fetching Hardcover data: ${errorMessage}`);
    }
  }

  const processedIds = new Set<string>();

  for (const bookProgress of books) {
    try {
      if (processedIds.has(bookProgress.libraryItemId)) {
        logger.debug(`Skipping duplicate book with ID: ${bookProgress.libraryItemId}`);
        continue;
      }

      processedIds.add(bookProgress.libraryItemId);

      const found = await findBookInHardcover({
        absService,
        hardcoverService,
        bookProgress,
        cache,
      });

      if (found) {
        foundCount++;

        const progressUpdated = await syncAudiobookProgress({
          absService,
          hardcoverService,
          bookProgress,
          cache,
        });

        if (progressUpdated) {
          updatedProgressCount++;
        }
      } else {
        notFoundCount++;
      }
    } catch (error) {
      notFoundCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error syncing book: ${errorMessage}`);
    }
  }

  return {
    foundCount,
    notFoundCount,
    updatedProgressCount,
  };
}
