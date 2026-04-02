import crypto from 'crypto';

export type GenerateVideoTokenInput = {
  sessionId: number;
  role: string;
  userId: string;
  secret: string;
  ttlSeconds?: number;
  issuedAt?: Date;
};

export type VideoTokenResponse = {
  provider: string;
  roomName: string;
  role: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  token: string;
};

export const generateVideoToken = ({
  sessionId,
  role,
  userId,
  secret,
  ttlSeconds = 60 * 60,
  issuedAt = new Date(),
}: GenerateVideoTokenInput): VideoTokenResponse => {
  const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000);

  const payload = {
    provider: 'mock-video-cloud',
    roomName: `session-${sessionId}`,
    role,
    userId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('base64url');

  const token = Buffer.from(
    JSON.stringify({
      ...payload,
      sig: signature,
    }),
  ).toString('base64url');

  return {
    ...payload,
    token,
  };
};
