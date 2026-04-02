CREATE TABLE IF NOT EXISTS research_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  moderator_name VARCHAR(255) NOT NULL,
  participant_name VARCHAR(255) NOT NULL,
  status VARCHAR(64) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  legacy_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO research_sessions (id, title, moderator_name, participant_name, status, scheduled_at, legacy_notes)
VALUES
  (
    1,
    'Global Pricing Perception Interview',
    'Ana Ribeiro',
    'Jordan Lee',
    'IN_PROGRESS',
    '2026-04-01 14:00:00',
    'Legacy session record loaded from MySQL. This simulates synchronous access and a heavier monolithic controller flow.'
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  moderator_name = VALUES(moderator_name),
  participant_name = VALUES(participant_name),
  status = VALUES(status),
  scheduled_at = VALUES(scheduled_at),
  legacy_notes = VALUES(legacy_notes);
