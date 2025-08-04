import type { IScene, ITimelineEvent } from '@/backend/models/Scene';

/**
 * Represents the client-side, serialized version of a Scene object.
 * Mongoose ObjectIds are converted to strings.
 * Certain fields might be optional if they are not always present.
 */
export type SerializedScene = Omit<
  IScene,
  '_id' | 'novelId' | 'episodeId' | 'characters' | 'textContents' | 'choiceIds' | 'audios' | 'defaultNextSceneId' | 'previousSceneId' | 'timelineEvents'
> & {
  _id: string;
  novelId: string;
  episodeId: string;
  characters: any[]; 
  textContents: any[];
  choices: any[];
  audios: any[];
  timelineEvents?: ITimelineEvent[]; // Made optional to match the schema
  defaultNextSceneId?: string;
  previousSceneId?: string;
};

/**
 * Represents the structure of an ending event, derived from timeline events.
 */
export type EndingInfo = {
  type: 'BAD' | 'NORMAL' | 'GOOD' | 'TRUE' | 'SECRET' | 'SPECIAL';
  title: string;
  description: string;
};
