CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article TEXT NOT NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS comments_article_status ON comments(article,status,created_at);

CREATE TABLE IF NOT EXISTS comment_votes (
  comment_id INTEGER NOT NULL,
  visitor TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK(vote IN (-1,1)),
  PRIMARY KEY(comment_id,visitor)
);
CREATE TABLE IF NOT EXISTS comment_limits (
  key TEXT PRIMARY KEY,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL
);
