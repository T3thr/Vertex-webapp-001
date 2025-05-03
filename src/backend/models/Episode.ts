import { Schema, model, models, Types } from "mongoose";

export interface IEpisode {
  title: string;
  content: string;
  scenes: Types.ObjectId[];
  media: Types.ObjectId[];
  isLocked: boolean;
  price?: number;
  novel: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EpisodeSchema = new Schema<IEpisode>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    scenes: [{
      type: Schema.Types.ObjectId,
      ref: "Scene",
      default: [],
    }],
    media: [{
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: [],
    }],
    isLocked: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: function () {
        return this.isLocked;
      },
      min: 0,
    },
    novel: {
      type: Schema.Types.ObjectId,
      ref: "Novel",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

EpisodeSchema.index({ novel: 1, title: 1 });

export default () => models.Episode || model<IEpisode>("Episode", EpisodeSchema);