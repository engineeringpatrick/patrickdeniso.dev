import { Maximize2, Minus, X } from 'lucide-react';
import { useState } from 'react';

export type WindowMode = 'normal' | 'minimized' | 'maximized';

type MacWindowControlsProps = {
	mode: WindowMode;
	labels: {
		group: string;
		close: string;
		minimize: string;
		maximize: string;
	};
	onClose: () => void;
	onMinimize: () => void;
	onMaximize: () => void;
};

export function useWindowMode() {
	const [mode, setMode] = useState<WindowMode>('normal');

	return {
		mode,
		isMinimized: mode === 'minimized',
		windowClass: mode === 'normal' ? '' : ` is-${mode}`,
		toggleMinimized: () => setMode((current) => current === 'minimized' ? 'normal' : 'minimized'),
		toggleMaximized: () => setMode((current) => current === 'maximized' ? 'normal' : 'maximized'),
	};
}

export default function MacWindowControls({
	mode,
	labels,
	onClose,
	onMinimize,
	onMaximize,
}: MacWindowControlsProps) {
	return (
		<div className="v4-window__traffic" aria-label={labels.group}>
			<button className="v4-window__traffic-button v4-window__traffic-button--close" type="button" aria-label={labels.close} onClick={onClose}>
				<X size={8} strokeWidth={3.5} />
			</button>
			<button className="v4-window__traffic-button v4-window__traffic-button--minimize" type="button" aria-label={labels.minimize} aria-pressed={mode === 'minimized'} onClick={onMinimize}>
				<Minus size={8} strokeWidth={3.5} />
			</button>
			<button className="v4-window__traffic-button v4-window__traffic-button--maximize" type="button" aria-label={labels.maximize} aria-pressed={mode === 'maximized'} onClick={onMaximize}>
				<Maximize2 size={7} strokeWidth={3.5} />
			</button>
		</div>
	);
}
