import type { CorsOptions } from 'cors';

export const buildCorsOptions = (allowedOrigins: string[]): CorsOptions => {
  const allowAll = allowedOrigins.length === 0 || allowedOrigins.includes('*');

  return {
    origin(origin, callback) {
      if (!origin || allowAll || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  };
};
