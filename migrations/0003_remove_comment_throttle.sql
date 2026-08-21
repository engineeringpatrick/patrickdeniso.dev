DROP INDEX IF EXISTS v4_comments_visitor_rate_limit;

ALTER TABLE v4_comments
	DROP COLUMN visitor_hash;
