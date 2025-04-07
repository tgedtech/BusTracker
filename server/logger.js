// server/logger.js

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'debug', // Set the logging level to 'debug' for detailed logs
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new transports.Console()
    // Uncomment below to enable file logging:
    // new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

module.exports = logger;