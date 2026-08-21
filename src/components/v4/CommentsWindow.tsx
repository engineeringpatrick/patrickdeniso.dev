import { LoaderCircle, MapPin, MessageCircle, MonitorSmartphone, Send } from 'lucide-react';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { copy, type V4Language } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';
import V4LanguageSelect from './V4LanguageSelect';

type Location = { city: string | null; region: string | null; country: string | null };
type Comment = { id: number; body: string; createdAt: string; location: Location; device: string };
type Viewer = { location: Location; device: string };

type CommentsWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const languageTags: Record<V4Language, string> = { en: 'en-US', it: 'it-IT', fr: 'fr-FR', zh: 'zh-CN' };
const maxCommentLength = 500;

const formatLocation = (location: Location, language: V4Language, fallback: string) => {
	let country = location.country;
	if (country) {
		try {
			country = new Intl.DisplayNames([languageTags[language]], { type: 'region' }).of(country) ?? country;
		} catch {
			// Keep Cloudflare's country code when Intl.DisplayNames is unavailable.
		}
	}
	return [location.city, location.region, country].filter(Boolean).join(', ') || fallback;
};

export default function CommentsWindow({ language, onClose }: CommentsWindowProps) {
	const text = copy[language].comments;
	const site = copy[language].site;
	const windowState = useWindowMode();
	const [comments, setComments] = useState<Comment[]>([]);
	const [viewer, setViewer] = useState<Viewer | null>(null);
	const [body, setBody] = useState('');
	const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
	const [website, setWebsite] = useState('');
	const [loading, setLoading] = useState(true);
	const [posting, setPosting] = useState(false);
	const [error, setError] = useState('');
	const formatter = useMemo(() => new Intl.DateTimeFormat(languageTags[language], { dateStyle: 'medium', timeStyle: 'short' }), [language]);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError('');
		fetch('/api/v4-comments', { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error('COMMENTS_UNAVAILABLE');
				return response.json() as Promise<{ comments: Comment[]; viewer: Viewer }>;
			})
			.then((result) => {
				setComments(result.comments);
				setViewer(result.viewer);
			})
			.catch((reason: unknown) => {
				if (reason instanceof DOMException && reason.name === 'AbortError') return;
				setError(text.error);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [text.error]);

	const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
		event.preventDefault();
		const commentBody = body.trim();
		if (!commentBody || !acceptedPrivacy || posting) return;
		setPosting(true);
		setError('');
		try {
			const response = await fetch('/api/v4-comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body: commentBody, acceptedPrivacy, website }),
			});
			const result = await response.json() as { comment?: Comment; error?: string };
			if (!response.ok || !result.comment) throw new Error(result.error ?? 'SAVE_FAILED');
			setComments((current) => [result.comment as Comment, ...current]);
			setBody('');
		} catch (reason) {
			setError(reason instanceof Error && reason.message === 'RATE_LIMIT' ? text.rateLimit : text.error);
		} finally {
			setPosting(false);
		}
	};

	return (
		<section className={`v4-window v4-window--comments${windowState.windowClass}`} role="dialog" aria-modal="true" aria-labelledby="comments-window-title" tabIndex={-1} autoFocus>
			<header className="v4-window__toolbar">
				<MacWindowControls
					mode={windowState.mode}
					labels={{ group: site.windowControls, close: site.close, minimize: site.minimize, maximize: site.maximize }}
					onClose={onClose}
					onMinimize={windowState.toggleMinimized}
					onMaximize={windowState.toggleMaximized}
				/>
				<p>{text.appName}</p>
				<V4LanguageSelect language={language} />
			</header>

			{!windowState.isMinimized && <div className="comments-shell">
				<header className="comments-heading">
					<div className="comments-heading__icon" aria-hidden="true"><MessageCircle size={22} /></div>
					<div><h2 id="comments-window-title">{text.title}</h2><p>{text.intro}</p></div>
				</header>

				<form className="comments-form" onSubmit={submit}>
					<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={maxCommentLength} rows={4} placeholder={text.placeholder} aria-label={text.placeholder} disabled={!viewer || posting} />
					<label className="comments-honeypot" aria-hidden="true">Website<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
					{viewer && <div className="comments-context">
						<span><MapPin size={13} aria-hidden="true" />{text.postingFrom} {formatLocation(viewer.location, language, text.unknownLocation)}</span>
						<span><MonitorSmartphone size={13} aria-hidden="true" />{viewer.device}</span>
					</div>}
					<label className="comments-consent"><input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} disabled={!viewer || posting} /><span><strong>{text.acceptPrivacy}.</strong> {text.privacy}</span></label>
					<footer className="comments-form__footer">
						<span>{maxCommentLength - body.length} {text.charactersLeft}</span>
						<button type="submit" disabled={!viewer || !body.trim() || !acceptedPrivacy || posting}>{posting ? <LoaderCircle className="is-spinning" size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}{posting ? text.posting : text.submit}</button>
					</footer>
					{error && <p className="comments-error" role="alert">{error}</p>}
				</form>

				<div className="comments-feed" aria-live="polite" aria-busy={loading}>
					{loading ? <p className="comments-state"><LoaderCircle className="is-spinning" size={16} aria-hidden="true" />{text.loading}</p> : comments.length === 0 ? <p className="comments-state">{text.empty}</p> : comments.map((comment) => (
						<article className="comments-card" key={comment.id}>
							<header><strong>{text.anonymous}</strong><time dateTime={comment.createdAt}>{formatter.format(new Date(comment.createdAt))}</time></header>
							<p>{comment.body}</p>
							<footer><span><MapPin size={11} aria-hidden="true" />{formatLocation(comment.location, language, text.unknownLocation)}</span><span><MonitorSmartphone size={11} aria-hidden="true" />{comment.device}</span></footer>
						</article>
					))}
				</div>
			</div>}
		</section>
	);
}
