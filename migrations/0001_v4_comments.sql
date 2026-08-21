CREATE TABLE IF NOT EXISTS v4_comments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
	created_at INTEGER NOT NULL,
	city TEXT,
	region TEXT,
	country TEXT,
	device TEXT NOT NULL,
	visitor_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS v4_comments_created_at
	ON v4_comments (created_at DESC);

CREATE INDEX IF NOT EXISTS v4_comments_visitor_rate_limit
	ON v4_comments (visitor_hash, created_at DESC);
