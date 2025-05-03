import { validateHardcoverConnection } from './hardcoverConnection';
import logger from '../logger';
import { User_Book_Reads } from '../../generated/graphql';
import { HardcoverClient } from '../../types';

interface UpdateProgressInput {
  id: number;
  editionId: number;
  progressSeconds: number;
  startedAt?: string;
  finishedAt?: string;
}

export async function updateAudiobookProgress(
  client: HardcoverClient,
  input: UpdateProgressInput
): Promise<boolean> {
  try {
    logger.info(
      `Updating audiobook progress for edition ID: ${input.editionId}, progress: ${input.progressSeconds} seconds`
    );

    const mutation = `
      mutation UpdateUserBookReadMutation($id: Int!, $object: DatesReadInput!) {
        updateResult: update_user_book_read(id: $id, object: $object) {
          error
          userBookRead: user_book_read {
            id
            userBookId: user_book_id
            startedAt: started_at
            finishedAt: finished_at
            editionId: edition_id
            progress
            progressPages: progress_pages
            progressSeconds: progress_seconds
            __typename
          }
          __typename
        }
      }
    `;

    const variables = {
      id: input.id,
      object: {
        started_at: input.startedAt || new Date().toISOString().split('T')[0],
        finished_at: input.finishedAt || null,
        edition_id: input.editionId,
        progress_pages: 0,
        progress_seconds: input.progressSeconds,
      },
    };

    const result = await client.executeQuery<{
      updateResult: {
        error: string | null;
        userBookRead: {
          id: number;
          progressSeconds: number;
        } | null;
      };
    }>(mutation, variables);

    if (result.updateResult.error) {
      logger.error(`Error updating audiobook progress: ${result.updateResult.error}`);
      return false;
    }

    if (!result.updateResult.userBookRead) {
      logger.warn(`Updated audiobook progress but received no book data in response`);
      return true;
    }

    logger.info(
      `Successfully updated audiobook progress: ID ${result.updateResult.userBookRead.id}, ` +
        `Progress: ${result.updateResult.userBookRead.progressSeconds} seconds`
    );
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to update audiobook progress: ${errorMessage}`, {
      editionId: input.editionId,
      progressSeconds: input.progressSeconds,
    });
    return false;
  }
}

export async function findUserBookReadId(
  client: HardcoverClient,
  editionId: number,
  userId?: string
): Promise<number | null> {
  try {
    logger.info(`Finding user_book_read ID for edition ID: ${editionId}`);

    const userIdToUse = userId || client.getUserId();
    if (!userIdToUse) {
      logger.error('No user ID available to find user_book_read ID');
      return null;
    }

    const query = `
      query FindUserBookRead($editionId: Int!, $userId: Int!) {
        user_book_reads(
          where: {
            edition_id: {_eq: $editionId},
            user_book: {user_id: {_eq: $userId}}
          }
        ) {
          id
          started_at
          finished_at
          progress_seconds
        }
      }
    `;

    const variables = {
      editionId,
      userId: parseInt(userIdToUse, 10),
    };

    const result = await client.executeQuery<{
      user_book_reads: Array<User_Book_Reads>;
    }>(query, variables);

    if (!result.user_book_reads?.length) {
      logger.warn(`No user_book_read found for edition ID: ${editionId}`);
      return null;
    }

    const userBookReadId = result.user_book_reads[0].id;
    logger.info(`Found user_book_read ID: ${userBookReadId} for edition ID: ${editionId}`);
    return userBookReadId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to find user_book_read ID: ${errorMessage}`, {
      editionId,
    });
    return null;
  }
}

export async function updateAudiobookProgressByEditionId(
  client: HardcoverClient,
  editionId: number,
  progressSeconds: number,
  userId?: string
): Promise<boolean> {
  try {
    let userIdToUse = userId || client.getUserId();

    if (!userIdToUse) {
      logger.debug('No user ID available, will verify Hardcover connection');
      const isValid = await validateHardcoverConnection(client);
      if (!isValid) {
        logger.error('Failed to validate Hardcover connection and get user ID');
        return false;
      }

      userIdToUse = client.getUserId();
      if (!userIdToUse) {
        logger.error('Still no user ID available after connection validation');
        return false;
      }

      logger.debug(`Using validated user ID: ${userIdToUse} for progress update`);
    } else {
      logger.debug(`Using provided user ID: ${userIdToUse} for progress update`);
    }

    const userBookReadId = await findUserBookReadId(client, editionId, userIdToUse);

    if (!userBookReadId) {
      logger.error(`Cannot update progress without user_book_read ID for edition: ${editionId}`);
      return false;
    }

    return await updateAudiobookProgress(client, {
      id: userBookReadId,
      editionId,
      progressSeconds,
      startedAt: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to update audiobook progress by edition ID: ${errorMessage}`, {
      editionId,
      progressSeconds,
    });
    return false;
  }
}
