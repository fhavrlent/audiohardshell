import type { CodegenConfig } from '@graphql-codegen/cli';
import dotenv from 'dotenv';

dotenv.config();

const config: CodegenConfig = {
  overwrite: true,
  schema: [
    {
      'https://api.hardcover.app/v1/graphql': {
        headers: {
          Authorization: `Bearer ${process.env.HARDCOVER_API_KEY}`,
        },
      },
    },
  ],
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers', 'typescript-operations'],
    },
  },
};

export default config;
