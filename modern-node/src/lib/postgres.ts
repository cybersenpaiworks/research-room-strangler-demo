import { Pool } from 'pg';

import { env } from '../config/env';

export type InsightRecord = {
  id: number;
  sessionId: number;
  author: string;
  message: string;
  createdAt: string;
};

export const DEMO_EVENT_AUTHOR = 'Interview Simulator';

export const pool = new Pool({
  connectionString: env.postgresUrl,
});

const mapInsight = (row: {
  id: string | number;
  session_id: string | number;
  author: string;
  message: string;
  created_at: Date | string;
}): InsightRecord => ({
  id: Number(row.id),
  sessionId: Number(row.session_id),
  author: row.author,
  message: row.message,
  createdAt: new Date(row.created_at).toISOString(),
});

export const listInsights = async (sessionId: number): Promise<InsightRecord[]> => {
  const result = await pool.query(
    `SELECT id, session_id, author, message, created_at
       FROM insights
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [sessionId],
  );

  return result.rows.map((row) => mapInsight(row));
};

export const insertInsight = async (
  sessionId: number,
  author: string,
  message: string,
): Promise<InsightRecord> => {
  const result = await pool.query(
    `INSERT INTO insights (session_id, author, message)
     VALUES ($1, $2, $3)
     RETURNING id, session_id, author, message, created_at`,
    [sessionId, author, message],
  );

  return mapInsight(result.rows[0]);
};

export const listDemoEvents = async (sessionId: number): Promise<InsightRecord[]> => {
  const result = await pool.query(
    `SELECT id, session_id, author, message, created_at
       FROM insights
      WHERE session_id = $1
        AND author = $2
      ORDER BY created_at DESC
      LIMIT 12`,
    [sessionId, DEMO_EVENT_AUTHOR],
  );

  return result.rows.map((row) => mapInsight(row));
};

export const getLatestDemoEvent = async (sessionId: number): Promise<InsightRecord | null> => {
  const result = await pool.query(
    `SELECT id, session_id, author, message, created_at
       FROM insights
      WHERE session_id = $1
        AND author = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [sessionId, DEMO_EVENT_AUTHOR],
  );

  return result.rows[0] ? mapInsight(result.rows[0]) : null;
};

export const countDemoEvents = async (sessionId: number): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) AS total
       FROM insights
      WHERE session_id = $1
        AND author = $2`,
    [sessionId, DEMO_EVENT_AUTHOR],
  );

  return Number(result.rows[0]?.total ?? 0);
};

export const insertDemoEvent = async (sessionId: number, message: string): Promise<InsightRecord> => (
  insertInsight(sessionId, DEMO_EVENT_AUTHOR, message)
);
