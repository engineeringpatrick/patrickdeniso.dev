import { useEffect, useMemo, useState, type ComponentProps, type CSSProperties } from 'react';
import { v4CommentPolicy } from '../../data/v4CommentPolicy';
import { copy, languageLocales, type V4Language } from '../../locales/v4';
import MacBrowserWindow from './MacBrowserWindow';
import { v4Path } from './v4Routes';

type Location = { city: string | null; region: string | null; country: string | null };
type Vote = -1 | 0 | 1;
type Comment = {
	id: number;
	name: string | null;
	body: string;
	createdAt: string;
	location: Location;
	device: string;
	score: number;
	viewerVote: Vote;
	voteAvailableAt: string | null;
};
type PostingLimit = { remaining: number; resetAt: string | null };

type CommentsWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const rankComments = (first: Comment, second: Comment) => second.score - first.score
	|| Date.parse(second.createdAt) - Date.parse(first.createdAt)
	|| second.id - first.id;
const secondsUntil = (date: string | null, now: number) => date ? Math.max(0, Math.ceil((Date.parse(date) - now) / 1000)) : 0;

const formatLocation = (location: Location, regionNames: Intl.DisplayNames | null, fallback: string) => {
	let country = location.country;
	if (country) country = regionNames?.of(country) ?? country;
	return [location.city, location.region, country].filter(Boolean).join(', ') || fallback;
};

export default function CommentsWindow({ language, onClose }: CommentsWindowProps) {
	const text = copy[language].comments;
	const [comments, setComments] = useState<Comment[]>([]);
	const [postingLimit, setPostingLimit] = useState<PostingLimit>({ remaining: v4CommentPolicy.commentsPerWindow, resetAt: null });
	const [name, setName] = useState('');
	const [body, setBody] = useState('');
	const [website, setWebsite] = useState('');
	const [loading, setLoading] = useState(true);
	const [posting, setPosting] = useState(false);
	const [votingCommentId, setVotingCommentId] = useState<number | null>(null);
	const [hasError, setHasError] = useState(false);
	const [now, setNow] = useState(Date.now());
	const formatter = useMemo(() => new Intl.DateTimeFormat(languageLocales[language], { dateStyle: 'medium', timeStyle: 'short' }), [language]);
	const regionNames = useMemo(() => {
		try {
			return new Intl.DisplayNames([languageLocales[language]], { type: 'region' });
		} catch {
			return null;
		}
	}, [language]);
	const postCooldown = secondsUntil(postingLimit.resetAt, now);
	const hasActiveCooldown = postCooldown > 0 || comments.some((comment) => secondsUntil(comment.voteAvailableAt, now) > 0);

	useEffect(() => {
		if (!hasActiveCooldown) return;
		const interval = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(interval);
	}, [hasActiveCooldown]);

	useEffect(() => {
		const controller = new AbortController();
		const loadComments = async () => {
			try {
				const response = await fetch('/api/v4-comments', { signal: controller.signal });
				if (!response.ok) throw new Error('COMMENTS_UNAVAILABLE');
				const result = await response.json() as { comments: Comment[]; posting: PostingLimit };
				setNow(Date.now());
				setComments(result.comments);
				setPostingLimit(result.posting);
			} catch (reason: unknown) {
				if (reason instanceof DOMException && reason.name === 'AbortError') return;
				setHasError(true);
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};
		void loadComments();
		return () => controller.abort();
	}, []);

	const submit: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
		event.preventDefault();
		const commentBody = body.trim();
		if (!commentBody || posting || secondsUntil(postingLimit.resetAt, Date.now()) > 0) return;
		setPosting(true);
		setHasError(false);
		try {
			const response = await fetch('/api/v4-comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), body: commentBody, website }),
			});
			const result = await response.json() as { comment?: Comment; posting?: PostingLimit; error?: string };
			setNow(Date.now());
			if (result.posting) setPostingLimit(result.posting);
			if (response.status === 429) return;
			if (!response.ok || !result.comment) throw new Error(result.error ?? 'SAVE_FAILED');
			setComments((current) => [result.comment!, ...current].sort(rankComments));
			setName('');
			setBody('');
		} catch {
			setHasError(true);
		} finally {
			setPosting(false);
		}
	};

	const voteOnComment = async (comment: Comment, vote: Exclude<Vote, 0>) => {
		if (votingCommentId !== null || comment.viewerVote === vote || secondsUntil(comment.voteAvailableAt, Date.now()) > 0) return;
		setVotingCommentId(comment.id);
		setHasError(false);
		try {
			const response = await fetch('/api/v4-comments', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ commentId: comment.id, vote }),
			});
			const result = await response.json() as { commentId?: number; score?: number; viewerVote?: Vote; voteAvailableAt?: string; error?: string };
			setNow(Date.now());
			if (response.status === 429 && result.commentId === comment.id && result.voteAvailableAt) {
				setComments((current) => current.map((item) => item.id === comment.id ? { ...item, voteAvailableAt: result.voteAvailableAt! } : item));
				return;
			}
			if (!response.ok || result.commentId !== comment.id || typeof result.score !== 'number' || !result.voteAvailableAt || (result.viewerVote !== 1 && result.viewerVote !== -1)) {
				throw new Error(result.error ?? 'VOTE_FAILED');
			}
			const { score, viewerVote, voteAvailableAt } = result;
			setComments((current) => current.map((item) => item.id === comment.id ? {
				...item,
				score,
				viewerVote,
				voteAvailableAt,
			} : item).sort(rankComments));
		} catch {
			setHasError(true);
		} finally {
			setVotingCommentId(null);
		}
	};

	return (
		<MacBrowserWindow language={language} onClose={onClose} address={`patrickdeniso.com${v4Path(language, 'comments')}`} title={text.title}>
			<div className="comments-shell">
				<div className="comments-page">
					<header className="comments-heading">
						<h2 id="comments-window-title">{text.title}</h2>
						<p>{text.intro}</p>
					</header>

					<hr />
					<form className="comments-form" onSubmit={submit}>
						<label><span>{text.name}</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={v4CommentPolicy.maxNameLength} placeholder={text.namePlaceholder} autoComplete="name" disabled={posting} /></label>
						<label><span>{text.message}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={v4CommentPolicy.maxCommentLength} rows={5} placeholder={text.placeholder} disabled={posting} /></label>
						<label className="comments-honeypot" aria-hidden="true">Website<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
						<div className="comments-form__footer">
							<button type="submit" disabled={!body.trim() || posting || postCooldown > 0}>{posting ? text.posting : text.submit}</button>
						</div>
						{postCooldown > 0 && <p className="comments-cooldown" role="status">{text.rateLimited} <output>{postCooldown}</output> {text.seconds}.</p>}
						{hasError && <p className="comments-error" role="alert">{text.error}</p>}
					</form>

					<hr />
					<div className="comments-feed" aria-live="polite" aria-busy={loading}>
						{loading ? <p className="comments-state">{text.loading}</p> : comments.length === 0 ? <p className="comments-state">{text.empty}</p> : comments.map((comment) => {
							const voteCooldown = secondsUntil(comment.voteAvailableAt, now);
							const voteStyle = voteCooldown > 0 ? { '--comments-vote-cooldown': `${v4CommentPolicy.voteCooldownSeconds}s` } as CSSProperties : undefined;
							return (
								<article className="comments-card" key={comment.id}>
									<header><strong>{comment.name || text.anonymous}</strong><time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time></header>
									<p>{comment.body}</p>
									<footer className="comments-card__footer">
										<span>{formatLocation(comment.location, regionNames, text.unknownLocation)} · {comment.device}</span>
										<div className={`comments-votes${voteCooldown > 0 ? ' is-cooling-down' : ''}`} style={voteStyle} title={voteCooldown > 0 ? `${text.voteCooldown} ${voteCooldown} ${text.seconds}` : undefined}>
											<button type="button" aria-pressed={comment.viewerVote === 1} disabled={votingCommentId === comment.id || voteCooldown > 0} onClick={() => void voteOnComment(comment, 1)}>{text.upvote}</button>
											<button type="button" aria-pressed={comment.viewerVote === -1} disabled={votingCommentId === comment.id || voteCooldown > 0} onClick={() => void voteOnComment(comment, -1)}>{text.downvote}</button>
											<output aria-live="polite">{text.score}: {comment.score}</output>
										</div>
									</footer>
								</article>
							);
						})}
					</div>
				</div>
			</div>
		</MacBrowserWindow>
	);
}
