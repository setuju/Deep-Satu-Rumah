import winston from 'winston';

const sanitizeFormat = winston.format((info) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(sanitized)) {
      if (['password', 'token', 'authorization', 'jwt', 'secret'].includes(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitize(sanitized[key]);
      }
    }
    return sanitized;
  };
  return sanitize(info);
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    sanitizeFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'deepterm-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    })
  ]
});

export default logger;
