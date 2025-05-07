import { createHardcoverClient } from './hardcover/hardcoverClient';
import { validateHardcoverConnection } from './hardcover/hardcoverConnection';
import { searchHardcoverBooks, findBookInHardcover } from './hardcover/hardcoverSearch';
import { getCurrentlyReadingAudiobooks } from './hardcover/hardcoverUserBooks';
import {
  updateAudiobookProgressByEditionId,
  getBookReadInfo,
  getUserBookReadId,
  BookReadInfo,
} from './hardcover/hardcoverProgress';
import { HardcoverBook } from '../types';
import { HardcoverAudiobook } from '../hardcoverTypes';

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

    updateAudiobookProgress: async (
      editionId: number,
      progressSeconds: number,
      userId?: string
    ): Promise<boolean> =>
      updateAudiobookProgressByEditionId(client, editionId, progressSeconds, userId),

    getBookReadInfo: async (editionId: number, userId?: string): Promise<BookReadInfo | null> =>
      getBookReadInfo(client, editionId, userId),

    getUserBookReadId: async (editionId: number, userId?: string): Promise<number | null> => {
      const info = await getBookReadInfo(client, editionId, userId);
      return getUserBookReadId(info);
    },
  };
}

const HardcoverService = createHardcoverService();
export default HardcoverService;
