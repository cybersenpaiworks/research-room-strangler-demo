import { env } from '../config/env';

type LegacySyncResponse = {
  sessionId: number;
  status: string;
  legacy_notes: string;
  snapshot_updated_at: string | null;
};

export const syncLegacySnapshot = async (sessionId: number, summary: string): Promise<LegacySyncResponse> => {
  const response = await fetch(`${env.legacySyncUrl.replace(/\/$/, '')}/session/${sessionId}/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ summary }),
  });

  if (!response.ok) {
    throw new Error(`Legacy snapshot sync failed with status ${response.status}`);
  }

  return (await response.json()) as LegacySyncResponse;
};
