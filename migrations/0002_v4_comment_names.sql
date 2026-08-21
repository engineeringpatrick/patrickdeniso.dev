ALTER TABLE v4_comments
	ADD COLUMN name TEXT CHECK (name IS NULL OR length(name) BETWEEN 1 AND 40);
