CREATE TABLE IF NOT EXISTS insights (
  id BIGSERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  author VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO insights (session_id, author, message)
VALUES
  (1, 'AI Observer', 'Participant shows early hesitation when price anchoring is introduced.'),
  (1, 'Moderator Copilot', 'Recommend probing on perceived value before discussing discount expectations.');
