import axios from 'axios';
import logger from '../logger';
import { AudiobookshelfClient } from '../../types';

export async function validateAudiobookshelfConnection(
  client: AudiobookshelfClient
): Promise<boolean> {
  try {
    logger.info('Validating connection to Audiobookshelf');
    const apiClient = client.getClient();

    const response = await apiClient.get<{ success: boolean }>('/ping');

    if (response.status === 200) {
      logger.info('Successfully connected to Audiobookshelf');
      return true;
    } else {
      logger.warn(`Unexpected response from Audiobookshelf: ${response.status}`);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode =
      axios.isAxiosError(error) && error.response ? error.response.status : 'unknown';
    const errorDetails = axios.isAxiosError(error) && error.response ? error.response.data : {};

    logger.error(`Failed to connect to Audiobookshelf at ${client.getBaseURL()}`, {
      error: errorMessage,
      statusCode,
      details: JSON.stringify(errorDetails),
    });

    if (statusCode === 404) {
      logger.error(`
        The Audiobookshelf API endpoint was not found (404). Please check:
        1. Your ABS_URL setting in .env file: ${client.getBaseURL()}
        2. Make sure Audiobookshelf server is running
        3. Try using the full URL including 'http://' or 'https://'
        4. The Audiobookshelf server might be using a different API path
      `);
    } else if (statusCode === 401 || statusCode === 403) {
      logger.error(`
        Authentication failed with Audiobookshelf (${statusCode}). Please check:
        1. Your ABS_API_KEY setting in .env file
        2. Make sure the API key is valid and not expired
        3. Verify that your user has the correct permissions
      `);
    }

    return false;
  }
}
