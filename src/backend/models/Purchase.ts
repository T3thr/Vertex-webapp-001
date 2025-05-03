import { Schema, model, models, Types } from "mongoose";

export interface IPurchase {
  buyer: Types.ObjectId;
  episode?: Types.ObjectId;
  assetListing?: Types.ObjectId;
  paymentStatus: "Pending" | "Completed" | "Failed";
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    episode: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      default: null,
    },
    assetListing: {
      type: Schema.Types.ObjectId,
      ref: "AssetListing",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PurchaseSchema.index({ buyer: 1, episode: 1, assetListing: 1 });

export default () => models.Purchase || model<IPurchase>("Purchase", PurchaseSchema);