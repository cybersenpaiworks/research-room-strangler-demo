import type { InsightRecord } from './postgres';

type SessionSnapshotPayload = {
  source: string;
  controller: string;
  synchronous: boolean;
  elapsedMs: number;
  snapshot_updated_at: string | null;
  data: {
    id: number;
    title: string;
    moderator_name: string;
    participant_name: string;
    status: string;
    scheduled_at: string;
    legacy_notes: string;
  };
};

const sessionMetadata = {
  id: 1,
  title: 'Global Pricing Perception Interview',
  moderator_name: 'Ana Ribeiro',
  participant_name: 'Jordan Lee',
  status: 'IN_PROGRESS',
  scheduled_at: '2026-04-01 14:00:00',
};

export const buildModernSessionSnapshot = (
  sessionId: number,
  latestDemoEvent: InsightRecord | null,
  elapsedMs: number,
): SessionSnapshotPayload => ({
  source: 'modern-node',
  controller: 'SessionReadModelController',
  synchronous: false,
  elapsedMs,
  snapshot_updated_at: latestDemoEvent?.createdAt ?? null,
  data: {
    id: sessionId,
    title: sessionMetadata.title,
    moderator_name: sessionMetadata.moderator_name,
    participant_name: sessionMetadata.participant_name,
    status: latestDemoEvent ? 'LIVE_STREAMING' : sessionMetadata.status,
    scheduled_at: sessionMetadata.scheduled_at,
    legacy_notes: latestDemoEvent?.message ?? 'No modern event has been promoted to the canonical route yet.',
  },
});
