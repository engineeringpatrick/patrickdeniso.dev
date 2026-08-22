export const v4CommentPolicy = {
	maxNameLength: 40,
	maxCommentLength: 500,
	maxRequestBytes: 4096,
	voteCooldownSeconds: 10,
	commentWindowSeconds: 60,
	commentsPerWindow: 3,
} as const;
