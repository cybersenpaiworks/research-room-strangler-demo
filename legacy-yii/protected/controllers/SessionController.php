<?php
declare(strict_types=1);

final class SessionController extends CController
{
    public function actionView(int $id): void
    {
        $startedAt = microtime(true);

        usleep($this->simulatedDelayMs() * 1000);

        $statement = $this->db()->prepare(
            'SELECT id, title, moderator_name, participant_name, status, scheduled_at, legacy_notes, updated_at FROM research_sessions WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $id]);

        $session = $statement->fetch();

        if ($session === false) {
            $this->json(404, [
                'error' => 'Session not found',
                'sessionId' => $id,
                'elapsedMs' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
            return;
        }

        $snapshotUpdatedAt = isset($session['updated_at']) ? date(DATE_ATOM, strtotime((string) $session['updated_at'])) : null;
        unset($session['updated_at']);

        $this->json(200, [
            'source' => 'legacy-yii',
            'controller' => 'SessionController',
            'synchronous' => true,
            'elapsedMs' => (int) round((microtime(true) - $startedAt) * 1000),
            'snapshot_updated_at' => $snapshotUpdatedAt,
            'data' => $session,
        ]);
    }

    public function actionSyncSnapshot(int $id): void
    {
        $input = $this->jsonInput();
        $summary = trim((string) ($input['summary'] ?? ''));

        if ($summary === '') {
            $this->json(400, [
                'error' => 'summary is required',
            ]);
            return;
        }

        $statement = $this->db()->prepare(
            'UPDATE research_sessions
                SET legacy_notes = :summary,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = :id'
        );
        $statement->execute([
            'id' => $id,
            'summary' => $summary,
        ]);

        if ($statement->rowCount() === 0) {
            $this->json(404, [
                'error' => 'Session not found',
                'sessionId' => $id,
            ]);
            return;
        }

        $snapshotStatement = $this->db()->prepare(
            'SELECT id, status, legacy_notes, updated_at FROM research_sessions WHERE id = :id LIMIT 1'
        );
        $snapshotStatement->execute(['id' => $id]);
        $snapshot = $snapshotStatement->fetch();

        $this->json(200, [
            'sessionId' => $id,
            'status' => $snapshot['status'] ?? 'IN_PROGRESS',
            'legacy_notes' => $snapshot['legacy_notes'] ?? $summary,
            'snapshot_updated_at' => isset($snapshot['updated_at']) ? date(DATE_ATOM, strtotime((string) $snapshot['updated_at'])) : null,
        ]);
    }
}
