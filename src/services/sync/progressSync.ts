import logger from '../logger';
import { FormattedBook, SyncCache } from '../../types';
import { createAudiobookshelfService } from '../audiobookshelf';
import { createHardcoverService } from '../hardcover';
import { MediaProgress } from '../../audiobookshelfTypes';
import { HardcoverAudiobook } from '../../hardcoverTypes';

type AudiobookshelfService = ReturnType<typeof createAudiobookshelfService>;
type HardcoverService = ReturnType<typeof createHardcoverService>;

export enum ProgressSyncResult {
  UPDATED = 'UPDATED',
  SKIPPED = 'SKIPPED',
  NOT_FOUND = 'NOT_FOUND',
  ERROR = 'ERROR',
}

export async function syncAudiobookProgress({
  absService,
  hardcoverService,
  bookProgress,
  cache,
}: {
  absService: AudiobookshelfService;
  hardcoverService: HardcoverService;
  bookProgress: MediaProgress;
  cache?: SyncCache;
}): Promise<ProgressSyncResult> {
  try {
    logger.info(`Syncing progress for book ID: ${bookProgress.libraryItemId}`);

    let formattedBook: FormattedBook | undefined;
    try {
      if (cache?.audiobookDetails?.has(bookProgress.libraryItemId)) {
        const cachedData = cache.audiobookDetails.get(bookProgress.libraryItemId);
        formattedBook = cachedData?.formattedBook;
        logger.debug(`Using cached book data for progress sync: ${bookProgress.libraryItemId}`);
      } else {
        formattedBook = await absService.formatBookForHardcover(bookProgress);

        if (cache?.audiobookDetails) {
          cache.audiobookDetails.set(bookProgress.libraryItemId, {
            formattedBook,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to format book data for progress sync: ${errorMessage}`);
      return ProgressSyncResult.ERROR;
    }

    if (!formattedBook) {
      logger.warn(`Formatted book data is undefined for ID: ${bookProgress.libraryItemId}`);
      return ProgressSyncResult.ERROR;
    }

    let currentlyReadingAudiobooks;
    if (cache?.hardcoverAudiobooks) {
      currentlyReadingAudiobooks = cache.hardcoverAudiobooks;
      logger.debug('Using cached Hardcover audiobooks list');
    } else {
      currentlyReadingAudiobooks = await hardcoverService.getCurrentlyReadingAudiobooks();

      if (cache) {
        cache.hardcoverAudiobooks = currentlyReadingAudiobooks;
      }
    }

    const matchingAudiobook = findMatchingAudiobook(formattedBook, currentlyReadingAudiobooks);

    if (!matchingAudiobook) {
      logger.warn(
        `No matching audiobook in progress found on Hardcover for "${formattedBook.book.title}"`
      );
      return ProgressSyncResult.NOT_FOUND;
    }

    logger.info(
      `Found matching audiobook on Hardcover - "${formattedBook.book.title}" (Edition ID: ${matchingAudiobook.edition_id})`
    );

    const result = await updateHardcoverProgress(
      hardcoverService,
      matchingAudiobook.edition_id,
      formattedBook.progress.currentTimeSeconds,
      cache?.hardcoverUserId
    );

    if (result === true) {
      return ProgressSyncResult.UPDATED;
    } else if (result === 'skipped') {
      return ProgressSyncResult.SKIPPED;
    } else {
      return ProgressSyncResult.ERROR;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error syncing audiobook progress: ${errorMessage}`);
    return ProgressSyncResult.ERROR;
  }
}

function findMatchingAudiobook(
  formattedBook: Readonly<FormattedBook>,
  hardcoverAudiobooks: HardcoverAudiobook[]
): HardcoverAudiobook | null {
  if (!hardcoverAudiobooks || hardcoverAudiobooks.length === 0) {
    return null;
  }

  if (formattedBook.book.isbn) {
    const isbnMatch = hardcoverAudiobooks.find(
      audiobook =>
        audiobook.isbn_10 === formattedBook.book.isbn ||
        audiobook.isbn_13 === formattedBook.book.isbn
    );

    if (isbnMatch) {
      logger.info(`Found audiobook match by ISBN: ${formattedBook.book.isbn}`);
      return isbnMatch;
    }
  }

  if (formattedBook.book.asin) {
    const asinMatch = hardcoverAudiobooks.find(
      audiobook => audiobook.asin === formattedBook.book.asin
    );

    if (asinMatch) {
      logger.info(`Found audiobook match by ASIN: ${formattedBook.book.asin}`);
      return asinMatch;
    }
  }

  const titleMatch = hardcoverAudiobooks.find(
    audiobook => audiobook.title.toLowerCase() === formattedBook.book.title.toLowerCase()
  );

  if (titleMatch) {
    logger.info(`Found audiobook match by title: "${formattedBook.book.title}"`);
    return titleMatch;
  }

  return null;
}

async function updateHardcoverProgress(
  hardcoverService: HardcoverService,
  editionId: number,
  progressSeconds: number,
  userId?: string | null
): Promise<boolean | 'skipped'> {
  try {
    logger.info(
      `Updating Hardcover progress for edition ID: ${editionId} to ${progressSeconds} seconds`
    );

    const roundedProgress = Math.round(progressSeconds);

    const bookReadInfo = await hardcoverService.getBookReadInfo(editionId, userId || undefined);

    if (!bookReadInfo) {
      logger.error(`Cannot update progress without book read info for edition: ${editionId}`);
      return false;
    }

    const currentProgressSeconds =
      bookReadInfo.progressSeconds !== null ? bookReadInfo.progressSeconds : 0;

    if (currentProgressSeconds === roundedProgress) {
      logger.info(
        `Skipping update for edition ID: ${editionId} - progress already at ${roundedProgress} seconds`
      );
      return 'skipped';
    }

    const result = await hardcoverService.updateAudiobookProgress(
      editionId,
      roundedProgress,
      userId || undefined
    );

    if (result) {
      logger.info(`Successfully updated progress for edition ID: ${editionId}`);
    } else {
      logger.warn(`Failed to update progress for edition ID: ${editionId}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error updating Hardcover progress: ${errorMessage}`);
    return false;
  }
}
