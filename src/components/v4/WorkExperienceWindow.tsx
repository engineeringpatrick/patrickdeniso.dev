import { useMemo } from 'react';
import { copy, type V4Language, workExperience } from '../../locales/v4';
import VimWindow from './VimWindow';

type WorkExperienceWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const companyLogos: Record<string, string> = {
	'Notion Labs, Inc.': '/logos/v4/notion.png',
	Datacurve: '/logos/v4/datacurve.png',
	Meta: '/logos/v4/meta.png',
	Wealthsimple: '/logos/v4/wealthsimple.png',
	Microsoft: '/logos/v4/microsoft.png',
	MongoDB: '/logos/v4/mongodb.png',
	'National Bank of Canada': '/logos/v4/national-bank.png',
	'Intact Financial Corporation': '/logos/v4/intact.png',
};

export default function WorkExperienceWindow({ language, onClose }: WorkExperienceWindowProps) {
	const text = copy[language].work;
	const site = copy[language].site;
	const initialBuffer = useMemo(() => workExperience[language]
		.map((role) => `[![${role.company}](${companyLogos[role.company]})](${role.url}) [${role.company}](${role.url})  |  ${role.dates}\n${role.description}`)
		.join('\n\n'), [language]);
	return (
		<VimWindow
			titleId="work-window-title"
			sessionKey={`work:${language}`}
			language={language}
			filename={text.filename}
			promptPath={text.promptPath}
			initialBuffer={initialBuffer}
			editableLabel={text.editableLabel}
			normalLabel={text.normal}
			insertLabel={text.insert}
			windowLabels={{ group: site.windowControls, close: site.close, minimize: site.minimize, maximize: site.maximize }}
			onClose={onClose}
		/>
	);
}
