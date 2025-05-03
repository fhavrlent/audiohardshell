import cron from 'node-cron';
import config from './config/config';
import { createSyncService } from './services/sync';
import logger from './services/logger';
import fs from 'fs';

let syncService: ReturnType<typeof createSyncService>;

function validateConfiguration(): void {
  const missingConfigs: string[] = [];

  if (!config.audiobookshelf.url) missingConfigs.push('ABS_URL');
  if (!config.audiobookshelf.apiKey) missingConfigs.push('ABS_API_KEY');
  if (!config.audiobookshelf.userId) missingConfigs.push('ABS_USER_ID');
  if (!config.hardcover.apiKey) missingConfigs.push('HARDCOVER_API_KEY');

  if (missingConfigs.length) {
    const errorMessage = `Missing required configuration variables: ${missingConfigs.join(', ')}`;
    logger.error(errorMessage);

    if (!fs.existsSync('.env')) {
      logger.error(
        `The .env file is missing. Please copy .env.example to .env and fill in your configuration.`
      );
    }

    throw new Error(errorMessage);
  }
}

export async function runBookSearch(): Promise<void> {
  try {
    logger.info('Manual sync initiated');

    validateConfiguration();

    if (!syncService) {
      syncService = createSyncService();
    }

    await syncService.findBooksInHardcover();
    logger.info('Manual sync completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error during manual sync', { error: errorMessage });

    if (errorMessage.includes('404')) {
      logger.error(`
===========================================
API ENDPOINT NOT FOUND (404 ERROR)
===========================================
The server returned a 404 error, which means the API endpoint was not found.
This could be due to:

1. Incorrect Audiobookshelf URL in your .env file
   - Current URL: ${config.audiobookshelf.url}
   - Make sure to include http:// or https:// and the correct port

2. Audiobookshelf server version mismatch
   - Different versions may use different API endpoints
   - The application will try alternative endpoints automatically

3. Audiobookshelf server is not running or unreachable
   - Check if your server is running
   - Check network connectivity

For more details, see the full error logs in the 'logs' directory.
===========================================
      `);
    }
  }
}

function scheduleSearch(): void {
  try {
    validateConfiguration();

    logger.info(`Scheduling automatic sync with cron pattern: ${config.syncInterval}`);

    cron.schedule(config.syncInterval, async () => {
      logger.info('Scheduled sync job starting');
      try {
        if (!syncService) {
          syncService = createSyncService();
        }

        await syncService.findBooksInHardcover();
        logger.info('Scheduled sync job completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during scheduled sync job', {
          error: errorMessage,
        });
      }
    });

    logger.info('Automatic sync scheduled successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to schedule automatic sync', { error: errorMessage });
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      logger.info('AudioHardShell is starting up');

      try {
        validateConfiguration();
      } catch {
        process.exit(1);
      }

      try {
        syncService = createSyncService();

        scheduleSearch();

        logger.info('Running initial sync on startup');
        await runBookSearch();

        logger.info('AudioHardShell is running. Press Ctrl+C to exit');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during startup', { error: errorMessage });
        process.exit(1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error starting AudioHardShell', { error: errorMessage });
      process.exit(1);
    }
  })();
}
