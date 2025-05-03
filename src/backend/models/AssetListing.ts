import { Schema, model, models, Types } from "mongoose";

export interface IAssetListing {
  media: Types.ObjectId;
  price: number;
  seller: Types.ObjectId;
  licensingInfo: string;
  tags: string[];
  purchases: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AssetListingSchema = new Schema<IAssetListing>(
  {
    media: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    licensingInfo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    purchases: [{
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      default: [],
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AssetListingSchema.index({ media: 1, seller: 1 });

export default () => models.AssetListing || model<IAssetListing>("AssetListing", AssetListingSchema);