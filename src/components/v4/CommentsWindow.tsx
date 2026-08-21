import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { copy, languageLocales, type V4Language } from '../../locales/v4';
import MacBrowserWindow from './MacBrowserWindow';

type Location = { city: string | null; region: string | null; country: string | null };
type Comment = { id: number; name: string | null; body: string; createdAt: string; location: Location; device: string };

type CommentsWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const maxNameLength = 40;
const maxCommentLength = 500;

const formatLocation = (location: Location, regionNames: Intl.DisplayNames | null, fallback: string) => {
	let country = location.country;
	if (country) country = regionNames?.of(country) ?? country;
	return [location.city, location.region, country].filter(Boolean).join(', ') || fallback;
};

type ErrorKind = 'generic' | 'rate-limit' | null;

export default function CommentsWindow({ language, onClose }: CommentsWindowProps) {
	const text = copy[language].comments;
	const [comments, setComments] = useState<Comment[]>([]);
	const [name, setName] = useState('');
	const [body, setBody] = useState('');
	const [website, setWebsite] = useState('');
	const [loading, setLoading] = useState(true);
	const [posting, setPosting] = useState(false);
	const [error, setError] = useState<ErrorKind>(null);
	const formatter = useMemo(() => new Intl.DateTimeFormat(languageLocales[language], { dateStyle: 'medium', timeStyle: 'short' }), [language]);
	const regionNames = useMemo(() => {
		try {
			return new Intl.DisplayNames([languageLocales[language]], { type: 'region' });
		} catch {
			return null;
		}
	}, [language]);
	const errorMessage = error === 'rate-limit' ? text.rateLimit : error ? text.error : '';

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
				setError('generic');
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
		setError(null);
		try {
			const response = await fetch('/api/v4-comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), body: commentBody, website }),
			});
			const result = await response.json() as { comment?: Comment; error?: string };
			if (!response.ok || !result.comment) throw new Error(result.error ?? 'SAVE_FAILED');
			const comment = result.comment;
			setComments((current) => [comment, ...current]);
			setName('');
			setBody('');
		} catch (reason) {
			setError(reason instanceof Error && reason.message === 'RATE_LIMIT' ? 'rate-limit' : 'generic');
		} finally {
			setPosting(false);
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
						{errorMessage && <p className="comments-error" role="alert">{errorMessage}</p>}
					</form>

					<hr />
					<div className="comments-feed" aria-live="polite" aria-busy={loading}>
						{loading ? <p className="comments-state">{text.loading}</p> : comments.length === 0 ? <p className="comments-state">{text.empty}</p> : comments.map((comment) => (
							<article className="comments-card" key={comment.id}>
								<header><strong>{comment.name || text.anonymous}</strong><time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time></header>
								<p>{comment.body}</p>
								<footer>{formatLocation(comment.location, regionNames, text.unknownLocation)} · {comment.device}</footer>
							</article>
						))}
					</div>
				</div>
			</div>
		</MacBrowserWindow>
	);
}
