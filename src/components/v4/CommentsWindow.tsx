import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { copy, languageLocales, type V4Language } from '../../locales/v4';
import MacBrowserWindow from './MacBrowserWindow';

type Location = { city: string | null; region: string | null; country: string | null };
type Vote = -1 | 0 | 1;
type Comment = { id: number; name: string | null; body: string; createdAt: string; location: Location; device: string; score: number; viewerVote: Vote };

type CommentsWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const maxNameLength = 40;
const maxCommentLength = 500;
const rankComments = (first: Comment, second: Comment) => second.score - first.score
	|| Date.parse(second.createdAt) - Date.parse(first.createdAt)
	|| second.id - first.id;

const formatLocation = (location: Location, regionNames: Intl.DisplayNames | null, fallback: string) => {
	let country = location.country;
	if (country) country = regionNames?.of(country) ?? country;
	return [location.city, location.region, country].filter(Boolean).join(', ') || fallback;
};

export default function CommentsWindow({ language, onClose }: CommentsWindowProps) {
	const text = copy[language].comments;
	const [comments, setComments] = useState<Comment[]>([]);
	const [name, setName] = useState('');
	const [body, setBody] = useState('');
	const [website, setWebsite] = useState('');
	const [loading, setLoading] = useState(true);
	const [posting, setPosting] = useState(false);
	const [votingCommentId, setVotingCommentId] = useState<number | null>(null);
	const [hasError, setHasError] = useState(false);
	const formatter = useMemo(() => new Intl.DateTimeFormat(languageLocales[language], { dateStyle: 'medium', timeStyle: 'short' }), [language]);
	const regionNames = useMemo(() => {
		try {
			return new Intl.DisplayNames([languageLocales[language]], { type: 'region' });
		} catch {
			return null;
		}
	}, [language]);

	useEffect(() => {
		const controller = new AbortController();
		const loadComments = async () => {
			try {
				const response = await fetch('/api/v4-comments', { signal: controller.signal });
				if (!response.ok) throw new Error('COMMENTS_UNAVAILABLE');
				const result = await response.json() as { comments: Comment[] };
				setComments(result.comments);
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
		if (!commentBody || posting) return;
		setPosting(true);
		setHasError(false);
		try {
			const response = await fetch('/api/v4-comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), body: commentBody, website }),
			});
			const result = await response.json() as { comment?: Comment; error?: string };
			if (!response.ok || !result.comment) throw new Error(result.error ?? 'SAVE_FAILED');
			const comment = result.comment;
			setComments((current) => [comment, ...current].sort(rankComments));
			setName('');
			setBody('');
		} catch {
			setHasError(true);
		} finally {
			setPosting(false);
		}
	};

	const voteOnComment = async (comment: Comment, vote: Exclude<Vote, 0>) => {
		if (votingCommentId !== null || comment.viewerVote === vote) return;
		setVotingCommentId(comment.id);
		setHasError(false);
		try {
			const response = await fetch('/api/v4-comments', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ commentId: comment.id, vote }),
			});
			const result = await response.json() as { commentId?: number; score?: number; viewerVote?: Vote; error?: string };
			if (!response.ok || result.commentId !== comment.id || typeof result.score !== 'number' || (result.viewerVote !== 1 && result.viewerVote !== -1)) {
				throw new Error(result.error ?? 'VOTE_FAILED');
			}
			const { score, viewerVote } = result;
			setComments((current) => current.map((item) => item.id === comment.id ? {
				...item,
				score,
				viewerVote,
			} : item).sort(rankComments));
		} catch {
			setHasError(true);
		} finally {
			setVotingCommentId(null);
		}
	};

	return (
		<MacBrowserWindow language={language} onClose={onClose} address="patrickdeniso.com/guestbook.html" title={text.title}>
			<div className="comments-shell">
				<div className="comments-page">
					<header className="comments-heading">
						<h2 id="comments-window-title">{text.title}</h2>
						<p>{text.intro}</p>
					</header>

					<hr />
					<form className="comments-form" onSubmit={submit}>
						<label><span>{text.name}</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={maxNameLength} placeholder={text.namePlaceholder} autoComplete="name" disabled={posting} /></label>
						<label><span>{text.message}</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={maxCommentLength} rows={5} placeholder={text.placeholder} disabled={posting} /></label>
						<label className="comments-honeypot" aria-hidden="true">Website<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
						<div className="comments-form__footer">
							<button type="submit" disabled={!body.trim() || posting}>{posting ? text.posting : text.submit}</button>
						</div>
						{hasError && <p className="comments-error" role="alert">{text.error}</p>}
					</form>

					<hr />
					<div className="comments-feed" aria-live="polite" aria-busy={loading}>
						{loading ? <p className="comments-state">{text.loading}</p> : comments.length === 0 ? <p className="comments-state">{text.empty}</p> : comments.map((comment) => (
							<article className="comments-card" key={comment.id}>
								<header><strong>{comment.name || text.anonymous}</strong><time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time></header>
								<p>{comment.body}</p>
								<footer className="comments-card__footer">
									<span>{formatLocation(comment.location, regionNames, text.unknownLocation)} · {comment.device}</span>
									<div className="comments-votes">
										<button type="button" aria-pressed={comment.viewerVote === 1} disabled={votingCommentId === comment.id} onClick={() => void voteOnComment(comment, 1)}>{text.upvote}</button>
										<button type="button" aria-pressed={comment.viewerVote === -1} disabled={votingCommentId === comment.id} onClick={() => void voteOnComment(comment, -1)}>{text.downvote}</button>
										<output aria-live="polite">{text.score}: {comment.score}</output>
									</div>
								</footer>
							</article>
						))}
					</div>
				</div>
			</div>
		</MacBrowserWindow>
	);
}
