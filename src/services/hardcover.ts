import { createHardcoverClient } from './hardcover/hardcoverClient';
import { validateHardcoverConnection } from './hardcover/hardcoverConnection';
import { searchHardcoverBooks, findBookInHardcover } from './hardcover/hardcoverSearch';
import { getCurrentlyReadingAudiobooks } from './hardcover/hardcoverUserBooks';
import {
  updateAudiobookProgressByEditionId,
  getBookReadInfo,
  BookReadInfo,
  updateBookStatus,
} from './hardcover/hardcoverProgress';
import { HardcoverBook } from '../types';
import { HardcoverAudiobook } from '../hardcoverTypes';
import config from '../config/config';

const clientInstance = createHardcoverClient();

export function createHardcoverService() {
  const client = clientInstance;

  return {
    validateConnection: async (): Promise<boolean> => {
      return validateHardcoverConnection(client);
    },

    search: async (
      query: string,
      queryType: string = 'Book',
      perPage: number = 25,
      page: number = 1
    ): Promise<HardcoverBook[]> => {
      return searchHardcoverBooks(client, query, queryType, perPage, page);
    },

    findBook: async (
      book: Readonly<{
        title: string;
        isbn: string | null;
        asin: string | null;
        authors: string[];
      }>
    ): Promise<HardcoverBook | null> => findBookInHardcover(client, book),

    getCurrentlyReadingAudiobooks: async (userId?: string): Promise<HardcoverAudiobook[]> =>
      getCurrentlyReadingAudiobooks(client, userId),

    updateAudiobookProgress: async (params: {
      editionId: number;
      progressSeconds: number;
      userId?: string;
      bookReadInfo: BookReadInfo;
    }): Promise<boolean> =>
      updateAudiobookProgressByEditionId({
        client,
        ...params,
      }),

    getBookReadInfo: async (editionId: number, userId?: string): Promise<BookReadInfo | null> =>
      getBookReadInfo({ client, editionId, userId }),

    updateBookStatus: async (
      userBookId: number,
      editionId: number,
      statusId: number
    ): Promise<boolean> => updateBookStatus({ client, userBookId, editionId, statusId }),

    getFinishedThreshold: (): number => config.hardcover.finishedThreshold,
  };
}

const HardcoverService = createHardcoverService();
export default HardcoverService;
