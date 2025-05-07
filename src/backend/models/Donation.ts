// src/backend/models/Donation.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for Donation document
// Represents a financial contribution from a donor to a recipient (e.g., writer, platform).
export interface IDonation extends Document {
  donor?: Types.ObjectId; // ผู้บริจาค (อ้างอิง User model, optional if anonymous or system donation)
  recipient: Types.ObjectId; // ผู้รับบริจาค (นักเขียน, หรือ system/platform, อ้างอิง User model or a dedicated PlatformAccount model)
  // Donation Target (optional, if donation is for a specific content)
  novel?: Types.ObjectId; // นิยายที่เกี่ยวข้องกับการบริจาค (อ้างอิง Novel model)
  episode?: Types.ObjectId; // ตอนที่เกี่ยวข้องกับการบริจาค (อ้างอิง Episode model)
  character?: Types.ObjectId; // ตัวละครที่เกี่ยวข้องกับการบริจาค (อ้างอิง Character model)
  // Donation Amount and Currency
  amount: number; // จำนวนเงินที่บริจาค (ยอดสุทธิที่ผู้รับจะพิจารณาหลังหักค่าธรรมเนียมแล้ว)
  currency: string; // สกุลเงิน (เช่น "THB", "USD", "CREDITS")
  grossAmount?: number; // จำนวนเงินรวมที่ผู้บริจาคจ่าย (ก่อนหักค่าธรรมเนียมใดๆ)
  // Payment Information
  paymentId: Types.ObjectId; // ID การชำระเงินที่เกี่ยวข้อง (อ้างอิง Payment model, for tracking the actual transaction)
  // Donor Information and Preferences
  donorDisplayName?: string; // ชื่อที่ผู้บริจาคต้องการให้แสดง (ถ้าไม่ anonymous)
  isAnonymous: boolean; // บริจาคแบบไม่ระบุตัวตนหรือไม่
  message?: string; // ข้อความจากผู้บริจาคถึงผู้รับ
  // Status and Visibility
  status: "pending_payment" | "processing" | "completed" | "failed" | "refunded"; // สถานะการบริจาค
  isVisibleOnPublicFeed: boolean; // แสดงการบริจาคนี้ในฟีดสาธารณะหรือไม่ (ถ้าผู้บริจาคอนุญาตและไม่ anonymous)
  // Revenue Split (if applicable, though often simpler for donations)
  platformFeeDeducted?: number; // ค่าธรรมเนียมแพลตฟอร์มที่หักจากยอดบริจาค
  netAmountToRecipient?: number; // จำนวนเงินสุทธิที่ผู้รับได้รับ (amount - platformFeeDeducted)
  // Timestamps
  completedAt?: Date; // วันที่การบริจาคสำเร็จ
  // Metadata
  donationCampaign?: Types.ObjectId; // อ้างอิง DonationCampaign model (ถ้าการบริจาคเป็นส่วนหนึ่งของแคมเปญ)
  donationTier?: Types.ObjectId; // อ้างอิง DonationTier model (ถ้าเป็นการบริจาคตามระดับขั้น)
  customMetadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    donor: { type: Schema.Types.ObjectId, ref: "User", index: true }, // Can be null for truly anonymous system donations
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, // Assuming recipient is always a User (writer)
    novel: { type: Schema.Types.ObjectId, ref: "Novel", index: true },
    episode: { type: Schema.Types.ObjectId, ref: "Episode", index: true },
    character: { type: Schema.Types.ObjectId, ref: "Character", index: true },
    amount: { type: Number, required: [true, "กรุณาระบุจำนวนเงินที่บริจาค"], min: [1, "จำนวนเงินบริจาคต้องมากกว่า 0"] },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "THB" },
    grossAmount: { type: Number, min: 0 }, // Should be >= amount
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
    donorDisplayName: { type: String, trim: true, maxlength: 100 },
    isAnonymous: { type: Boolean, default: false },
    message: { type: String, trim: true, maxlength: [1000, "ข้อความบริจาคต้องไม่เกิน 1000 ตัวอักษร"] },
    status: {
      type: String,
      enum: ["pending_payment", "processing", "completed", "failed", "refunded"],
      default: "pending_payment",
      required: true,
      index: true,
    },
    isVisibleOnPublicFeed: { type: Boolean, default: true },
    platformFeeDeducted: { type: Number, default: 0, min: 0 },
    netAmountToRecipient: { type: Number, min: 0 }, // Calculated: amount - platformFeeDeducted
    completedAt: { type: Date },
    donationCampaign: { type: Schema.Types.ObjectId, ref: "DonationCampaign", index: true }, // Assume DonationCampaign model
    donationTier: { type: Schema.Types.ObjectId, ref: "DonationTier", index: true },       // Assume DonationTier model
    customMetadata: Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
DonationSchema.index({ donor: 1, status: 1, createdAt: -1 });
DonationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
DonationSchema.index({ novel: 1, status: 1, isVisibleOnPublicFeed: 1, createdAt: -1 });
DonationSchema.index({ status: 1, createdAt: -1 });
DonationSchema.index({ donationCampaign: 1, status: 1 });

// ----- Middleware -----
DonationSchema.pre("save", function (next) {
  // Ensure donorDisplayName is not set if anonymous
  if (this.isAnonymous) {
    this.donorDisplayName = undefined;
    this.isVisibleOnPublicFeed = false; // Anonymous donations usually not public by default
  }

  // Calculate netAmountToRecipient if not explicitly set
  if (this.isModified("amount") || this.isModified("platformFeeDeducted") || this.isNew) {
    if (typeof this.netAmountToRecipient !== "number") { // Check if it needs calculation
        this.netAmountToRecipient = this.amount - (this.platformFeeDeducted || 0);
    }
    if (typeof this.grossAmount !== "number") { // Estimate gross if not provided
        this.grossAmount = this.amount; // Simplistic, actual gross would come from Payment
    }
  }

  // Update completedAt timestamp if status changes to completed
  if (this.isModified("status") && this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Post-save middleware for denormalization (e.g., updating user/novel donation stats)
// This should be handled carefully, potentially in a service layer or via event-driven architecture.
DonationSchema.post("save", async function(doc: IDonation) {
  if (doc.isModified("status") && doc.status === "completed") {
    console.log(`Donation ${doc._id} completed. Triggering post-completion actions.`);
    const User = models.User || model("User");
    const Novel = models.Novel || model("Novel");

    // Update recipient's total donations received (using netAmountToRecipient)
    if (doc.recipient && doc.netAmountToRecipient && doc.netAmountToRecipient > 0) {
      try {
        await User.findByIdAndUpdate(doc.recipient, { $inc: { "statistics.totalDonationsReceived": doc.netAmountToRecipient, "statistics.donationCount": 1 } });
      } catch (error) {
        console.error(`Error updating recipient ${doc.recipient} donation stats:`, error);
      }
    }

    // Update donor's total donations made (using grossAmount or amount)
    if (doc.donor && doc.amount > 0) {
      try {
        await User.findByIdAndUpdate(doc.donor, { $inc: { "statistics.totalDonationsMade": doc.grossAmount || doc.amount } });
      } catch (error) {
        console.error(`Error updating donor ${doc.donor} donation stats:`, error);
      }
    }

    // Update novel's total donations (if applicable)
    if (doc.novel && doc.amount > 0) {
      try {
        await Novel.findByIdAndUpdate(doc.novel, { $inc: { "statistics.totalDonationAmount": doc.amount, "statistics.donationCount": 1 } });
      } catch (error) {
        console.error(`Error updating novel ${doc.novel} donation stats:`, error);
      }
    }
    // Similar updates for Episode, Character if needed
  }
});

// ----- Model Export -----
const DonationModel = () =>
  models.Donation as mongoose.Model<IDonation> || model<IDonation>("Donation", DonationSchema);

export default DonationModel;

