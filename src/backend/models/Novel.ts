import { Schema, model, models, Types } from "mongoose";

export interface INovel {
  _id: any;
  title: string;
  description: string;
  coverImage: string;
  tags: string[];
  status: "Draft" | "Published" | "Archived";
  config: {
    theme?: string;
    engineLogic?: string;
    [key: string]: any;
  };
  episodes: Types.ObjectId[];
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NovelSchema = new Schema<INovel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    coverImage: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    episodes: [{
      type: Schema.Types.ObjectId,
      ref: "Episode",
      default: [],
    }],
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

NovelSchema.index({ title: 1, author: 1 });

export default () => models.Novel || model<INovel>("Novel", NovelSchema);