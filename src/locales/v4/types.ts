export type V4Language = 'en' | 'it' | 'fr' | 'zh';
export type PlanetId = 'work' | 'posts' | 'photos';

export type WorkExperience = { company: string; dates: string; description: string };

export type V4Copy = {
	site: { title: string; description: string; sceneLabel: string; codeIntroduction: string; windowControls: string; close: string; minimize: string; maximize: string; websiteLanguage: string; websiteVersion: string; modelCredit: string; contacts: string; email: string; instagram: string; wechat: string; wechatQrCode: string };
	planets: Record<PlanetId, string>;
	intro: { lines: string[]; interests: string[]; interestLabel: string };
	work: { filename: string; promptPath: string; editableLabel: string; normal: string; insert: string };
	photos: { appName: string; eyebrow: string; title: string; close: string; works: string; previous: string; next: string; back: string; photographs: string; openPhotograph: string; photoAlt: string; toolbar: string; viewOptions: string; gridView: string; listView: string; searchCollections: string; sidebar: string; library: string; collectionsLabel: string; collection: string; collectionsCount: string; of: string; metadata: string; fileName: string; dimensions: string; fileSize: string; dateTaken: string; location: string; camera: string; notSet: string; collections: Record<string, string> };
	browser: { address: string; iframeTitle: string; historyControls: string; back: string; forward: string; openExternal: string; secureConnection: string };
};

export type V4Locale = { copy: V4Copy; workExperience: WorkExperience[] };
