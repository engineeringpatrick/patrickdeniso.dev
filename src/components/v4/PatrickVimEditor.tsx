import { useEffect, useMemo, useState } from 'react';
import { copy } from '../../locales/v4';
import VimEditor from './VimEditor';
import useV4Language from './useV4Language';
import { V4_CONSOLE_CLOSE_EVENT } from './v4Events';
import { hasVimBuffer } from './vimSession';
import './UniverseExperience.css';

const sleep = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export default function PatrickVimEditor() {
	const language = useV4Language();
	const sessionKey = `patrick:${language}`;
	const text = copy[language];
	const initialBuffer = useMemo(() => {
		const { lines, interests, interestLabel } = text.intro;
		return `${lines.join('\n  ')}\n  ${interestLabel}: ${interests.at(-1) ?? ''}\n};`;
	}, [text]);
	const [animationBuffer, setAnimationBuffer] = useState<string | undefined>('');

	useEffect(() => {
		let cancelled = false;
		const { lines, interests, interestLabel } = text.intro;
		if (hasVimBuffer(sessionKey) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setAnimationBuffer(undefined);
			return;
		}

		const type = async (value: string, output: string) => {
			let next = output;
			for (const character of value) {
				if (cancelled) return next;
				next += character;
				setAnimationBuffer(next);
				await sleep(25);
			}
			return next;
		};
		const animate = async () => {
			setAnimationBuffer('');
			await sleep(350);
			if (cancelled) return;

			let output = '';
			for (const line of lines) {
				output = await type(line, output);
				if (cancelled) return;
				output += '\n  ';
				setAnimationBuffer(output);
				await sleep(220);
			}

			output = await type(`${interestLabel}: `, output);
			for (const [index, interest] of interests.entries()) {
				output = await type(interest, output);
				if (cancelled) return;
				await sleep(360);
				if (index === interests.length - 1) break;
				for (let count = 0; count < interest.length; count += 1) {
					if (cancelled) return;
					output = output.slice(0, -1);
					setAnimationBuffer(output);
					await sleep(10);
				}
			}

			await sleep(350);
			if (!cancelled) setAnimationBuffer(undefined);
		};
		void animate();
		return () => { cancelled = true; };
	}, [sessionKey, text]);

	return (
		<VimEditor
			sessionKey={sessionKey}
			filename="patrick.ts"
			initialBuffer={initialBuffer}
			bufferOverride={animationBuffer}
			editableLabel={text.intro.editableLabel}
			normalLabel={text.work.normal}
			insertLabel={text.work.insert}
			onQuit={() => window.dispatchEvent(new Event(V4_CONSOLE_CLOSE_EVENT))}
			autoFocus={false}
			className="vim-terminal--intro"
		/>
	);
}
