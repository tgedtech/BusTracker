// server/logger.js

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  // Set the minimum level to 'debug' so all messages (debug, info, error) are logged.
  level: 'debug',
  format: format.combine(
    // Add a timestamp to each log entry.
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Format the log output as: "YYYY-MM-DD HH:mm:ss [LEVEL]: message"
    format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    // Log all messages to the console.
    new transports.Console(),
    // Additionally, log all messages to a file named "combined.log".
    new transports.File({ filename: 'combined.log' }),
    // Log only errors (level 'error' and above) to a file named "error.log".
    new transports.File({ filename: 'error.log', level: 'error' })
  ]
});

module.exports = logger;