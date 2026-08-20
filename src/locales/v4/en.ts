import type { V4Locale } from './types';

const en = {
	copy: {
		site: { title: '🚀 Patrick\'s Universe', description: "Patrick Deniso's interactive universe.", sceneLabel: "Patrick Deniso's interactive universe", codeIntroduction: 'A code introduction', windowControls: 'Window controls', close: 'Close window', minimize: 'Minimize', maximize: 'Maximize', websiteLanguage: 'Website language', websiteVersion: 'Website version', modelCredit: '3D models:', contacts: 'Contacts', email: 'Email', instagram: 'Instagram', wechat: 'WeChat', wechatQrCode: 'WeChat QR code for Patrick Deniso' },
		planets: { work: 'Work experience', posts: 'Blog posts', photos: 'Photos' },
		intro: { lines: ['const Patrick = {', "name: 'Patrick Deniso',", "role: 'Software Engineer',", "workInterests: 'Distributed Systems',"], interestLabel: 'interests', interests: ["'Running'", "'Urbanism'", "'Language Learning'", "'History & Philosophy'", "'Anything cool :)'"] },
		work: { filename: 'work-experience.txt', promptPath: '~/work', editableLabel: 'Editable work experience file', normal: '-- NORMAL --', insert: '-- INSERT --' },
		photos: { appName: 'photos.app', eyebrow: 'Archive', title: 'Photos', close: 'Close gallery', works: 'files', previous: 'Previous work', next: 'Next work', back: 'Back', photographs: 'photographs', openPhotograph: 'Open photograph', photoAlt: 'Photograph', toolbar: 'Photos toolbar', viewOptions: 'View options', gridView: 'Icon view', listView: 'List view', searchCollections: 'Search collections', sidebar: 'Photos sidebar', library: 'Library', collectionsLabel: 'Collections', collection: 'Collection', collectionsCount: 'collections', of: 'of', metadata: 'Info', fileName: 'File name', dimensions: 'Dimensions', fileSize: 'File size', dateTaken: 'Date taken', location: 'Location', camera: 'Camera', notSet: 'Not set', collections: { california: 'California', 'china-1': 'China 1', 'china-2': 'China 2', datacurve: 'Datacurve', family: 'Family', japan: 'Japan', montreal: 'Montreal', notion: 'Notion', 'other-travels': 'Other travels' } },
		browser: { address: 'blog.patrickdeniso.com', iframeTitle: "Patrick Deniso's blog", historyControls: 'Browser history controls', back: 'Back', forward: 'Forward', openExternal: 'Open blog in a new tab', secureConnection: 'secure connection' },
	},
	workExperience: [
		{ company: 'Notion', dates: 'Jul 2026 – Present', description: 'Collections Infrastructure - making notion databases fast, reliable and scalable' },
		{ company: 'Datacurve', dates: 'Dec 2025 – May 2026', description: 'Built RL env data pipelines from scratch and delivered many $$$ worth of post training data to frontier labs' },
		{ company: 'Meta', dates: 'May 2025 – Aug 2025', description: 'Core Monetization - improve the experience for advertisers on Meta' },
		{ company: 'Wealthsimple', dates: 'Jan 2025 – Apr 2025', description: 'ML platform and training infrastructure' },
		{ company: 'Microsoft', dates: 'Sep 2024 – Dec 2024', description: 'Azure Service Health' },
		{ company: 'MongoDB', dates: 'Jun 2024 – Aug 2024', description: 'Cluster-to-cluster Replication' },
		{ company: 'Wealthsimple', dates: 'Jan 2024 – Apr 2024', description: 'API platform' },
		{ company: 'National Bank of Canada', dates: 'Sep 2023 – Dec 2023', description: 'Financial markets systems' },
		{ company: 'Intact Financial', dates: 'May 2023 – Aug 2023', description: 'Data Feeds' },
	],
} satisfies V4Locale;

export default en;
