import { Schema, model, models, Types } from "mongoose";

export interface IScene {
  background: string;
  characters: {
    name: string;
    sprite: string;
    position: string;
  }[];
  dialogue: {
    speaker: string;
    text: string;
  }[];
  music: string;
  choices: {
    text: string;
    nextScene: Types.ObjectId | null;
  }[];
  transitions: {
    type: string;
    duration: number;
  }[];
  metadata: {
    [key: string]: any;
  };
  episode: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SceneSchema = new Schema<IScene>(
  {
    background: {
      type: String,
      required: true,
      trim: true,
    },
    characters: [{
      name: { type: String, required: true, trim: true },
      sprite: { type: String, required: true, trim: true },
      position: { type: String, trim: true },
    }],
    dialogue: [{
      speaker: { type: String, required: true, trim: true },
      text: { type: String, required: true, trim: true },
    }],
    music: {
      type: String,
      trim: true,
    },
    choices: [{
      text: { type: String, required: true, trim: true },
      nextScene: { type: Schema.Types.ObjectId, ref: "Scene", default: null },
    }],
    transitions: [{
      type: { type: String, required: true, trim: true },
      duration: { type: Number, required: true, min: 0 },
    }],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SceneSchema.index({ episode: 1 });

export default () => models.Scene || model<IScene>("Scene", SceneSchema);