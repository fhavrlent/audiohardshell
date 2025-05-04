#!/usr/bin/env node

import { runBookSearch } from './index';
import logger from './services/logger';

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case 'sync':
      logger.info('Manual sync requested from CLI');
      await runBookSearch();
      break;

    case 'help':
    default:
      // eslint-disable-next-line no-console
      console.log(`
AudioHardShelf CLI

Available commands:
  sync                      - Synchronize Audiobookshelf listening progress with Hardcover
  help                      - Display this help message

      `);
      break;
  }
}

main().catch(err => {
  logger.error('CLI error', {
    error: err instanceof Error ? err.message : 'Unknown error',
  });
  process.exit(1);
});
