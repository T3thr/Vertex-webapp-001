import { Schema, model, models, Types } from "mongoose";

export interface IMediaAsset {
  url: string;
  publicId: string;
  type: "Image" | "Video" | "Audio";
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: any;
  };
  owner: Types.ObjectId;
  usedIn: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Image", "Video", "Audio"],
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    usedIn: [{
      type: Schema.Types.ObjectId,
      ref: "Episode",
      default: [],
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

MediaAssetSchema.index({ publicId: 1, owner: 1 });

export default () => models.MediaAsset || model<IMediaAsset>("MediaAsset", MediaAssetSchema);