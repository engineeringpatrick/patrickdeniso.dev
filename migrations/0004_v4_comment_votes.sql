CREATE TABLE IF NOT EXISTS v4_comment_votes (
	comment_id INTEGER NOT NULL REFERENCES v4_comments(id) ON DELETE CASCADE,
	voter_hash TEXT NOT NULL CHECK (length(voter_hash) = 64),
	vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
	updated_at INTEGER NOT NULL,
	PRIMARY KEY (comment_id, voter_hash)
) WITHOUT ROWID;
