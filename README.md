# AudioHardShelf

A TypeScript application that automatically syncs your audiobook listening progress from Audiobookshelf to Hardcover.app.

## Features

- Syncs currently listening audiobooks from Audiobookshelf to Hardcover.app
- Matches books between platforms using ISBN, ASIN, or title search
- Updates progress percentages and timestamps
- Automatically marks books as "Finished" when they reach a configurable completion threshold
- Runs on a configurable schedule (default: every hour)

## Prerequisites

- Node.js (LTS) - not needed if using Docker/Podman
- A self-hosted Audiobookshelf server with API access
- A Hardcover.app account with API access

## Installation

### Standard Installation

1. Clone this repository to your VPS or local machine:
   ```bash
   git clone <repository-url> audiohardshelf
   cd audiohardshelf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file by copying the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your own credentials:
   ```
   # Audiobookshelf configuration
   ABS_URL=http://your-audiobookshelf-server:port
   ABS_API_KEY=your_audiobookshelf_api_key
   ABS_USER_ID=your_audiobookshelf_user_id

   # Hardcover.app configuration
   # The URL is hardcoded in the config since Hardcover.app is not self-hosted
   HARDCOVER_API_KEY=your_hardcover_api_key
   # Note: You can include "Bearer " prefix in your API key or leave it out - the app will handle either format

   # Sync configuration
   # Option 1: Cron pattern - syncs at specific clock times
   SYNC_INTERVAL="0 */1 * * *"  # Every hour, at minute 0
   # Option 2: Minutes interval - syncs every X minutes from service startup
   # SYNC_INTERVAL="60"  # Every 60 minutes after startup
   ```

5. Build the application:
   ```bash
   npm run build
   ```

### Docker/Podman Installation

1. Clone this repository:
   ```bash
   git clone <repository-url> audiohardshelf
   cd audiohardshelf
   ```

2. Create a `.env` file by copying the example:
   ```bash
   cp .env.example .env
   ```
   
3. Edit the `.env` file with your own credentials:
   ```
   # Audiobookshelf configuration
   ABS_URL=http://your-audiobookshelf-server:port
   ABS_API_KEY=your_audiobookshelf_api_key
   ABS_USER_ID=your_audiobookshelf_user_id

   # Hardcover.app configuration
   HARDCOVER_API_KEY=your_hardcover_api_key
   
   # Sync configuration
   SYNC_INTERVAL="0 */1 * * *"  # Every hour by default
   ```

4. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Usage

### One-time Sync

To run a one-time sync:

```bash
npm run sync
```

### Running as a Service

To start the application which will run on schedule:

```bash
npm start
```

### Running on Your VPS

For persistent running on a VPS, you can use a process manager like PM2:

1. Install PM2 (if not already installed):
   ```bash
   npm install -g pm2
   ```

2. Start your application with PM2:
   ```bash
   pm2 start dist/index.js --name audiohardshelf
   ```

3. Make it restart automatically on server reboot:
   ```bash
   pm2 startup
   pm2 save
   ```

#### Alternatively, use systemd

You can also use the provided systemd service file:

1. Edit the `audiohardshelf.service` file with your specific user and paths
2. Copy the service file to the systemd directory:
   ```bash
   sudo cp audiohardshelf.service /etc/systemd/system/
   ```
3. Enable and start the service:
   ```bash
   sudo systemctl enable audiohardshelf
   sudo systemctl start audiohardshelf
   ```
4. Check the status:
   ```bash
   sudo systemctl status audiohardshelf
   ```

### Running with Docker Compose

```bash
# Start the application with Docker Compose
docker-compose up -d
```

### Running with Podman

Podman is compatible with Docker commands and Docker Compose:

```bash
# Start the application with podman-compose
podman-compose up -d
```

## Configuration

You can adjust the following settings in your `.env` file:

- `SYNC_INTERVAL`: Two formats supported:
  - Cron pattern (e.g. `0 */1 * * *`): Runs at specific clock times (default: every hour on the hour)
  - Number of minutes (e.g. `60`): Runs every X minutes from when the service starts
- `ABS_URL`: Your Audiobookshelf server URL
- `ABS_API_KEY`: Your Audiobookshelf API key (found in Settings > Users > [Your User] > API Token)
- `ABS_USER_ID`: Your Audiobookshelf user ID (found in the URL when viewing your profile)
- `HARDCOVER_API_KEY`: Your Hardcover API key (found in your account settings)
- `FINISHED_THRESHOLD`: The percentage (0.0-1.0) of listening progress at which a book should be automatically marked as "Finished" in Hardcover (default: 0.985 or 98.5%)

## Logs

Logs are stored in the `logs` directory:
- `combined.log`: Contains all logs
- `error.log`: Contains only error logs

When running with Docker, the logs directory is mounted as a volume to persist logs outside the container.

## How It Works

1. The application connects to your Audiobookshelf server and retrieves:
   - Books currently in progress
   - Their listening progress details (duration, percentage, etc.)

2. For each book, it attempts to find a match in your Hardcover.app library using:
   - ISBN (highest priority, if available)
   - ASIN (if available)
   - Exact title match (as fallback)

3. When a match is found, it synchronizes your current listening position with Hardcover.app

4. The synchronization runs automatically according to your configured schedule (default: hourly)
   - You can also trigger a manual sync using `npm run sync`

5. Detailed logs are kept in the `logs` directory

## Development

This project is written in TypeScript. To contribute to the development:

1. Make your changes in the `src` directory
2. Build the project:
   ```bash
   npm run build
   ```
3. Test your changes:
   ```bash
   npm run sync
   ```

## Troubleshooting

If books aren't syncing correctly:

1. Check the logs in the `logs` directory
2. Verify your API credentials are correct
3. Ensure your Audiobookshelf books have proper metadata (ISBN, ASIN, or accurate title/author)
4. Make sure the books exist in your Hardcover.app library
