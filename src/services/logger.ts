import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config/config';

const { format, transports } = winston;

if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || 'debug';

const logger = winston.createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'audiohardshell' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...rest }) => {
          return `${timestamp} ${level}: ${message} ${
            Object.keys(rest).length > 1 ? JSON.stringify(rest) : ''
          }`;
        })
      ),
    }),
    new transports.File({
      filename: path.join(config.logDir, 'error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(config.logDir, 'combined.log'),
    }),
  ],
});

export default logger;
