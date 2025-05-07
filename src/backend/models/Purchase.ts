// src/backend/models/Purchase.ts

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// Interface for individual items within a purchase order
export interface IPurchaseItem extends Document {
  itemId: Types.ObjectId; // ID ของสินค้า (Novel, Episode, OfficialMedia, SubscriptionPlan)
  itemType: "novel" | "episode" | "official_media" | "subscription_plan" | "donation_tier" | "virtual_currency_pack"; // ประเภทสินค้า
  novel?: Types.ObjectId; // อ้างอิง Novel (ถ้า itemType is novel or episode)
  episode?: Types.ObjectId; // อ้างอิง Episode (ถ้า itemType is episode)
  officialMedia?: Types.ObjectId; // อ้างอิง OfficialMedia (ถ้า itemType is official_media)
  subscriptionPlan?: Types.ObjectId; // อ้างอิง SubscriptionPlan (ถ้า itemType is subscription_plan)
  donationTier?: Types.ObjectId; // อ้างอิง DonationTier (ถ้า itemType is donation_tier)
  virtualCurrencyPack?: Types.ObjectId; // อ้างอิง VirtualCurrencyPack (ถ้า itemType is virtual_currency_pack)
  itemName: string; // ชื่อสินค้า (denormalized for display)
  itemDescription?: string; // คำอธิบายสั้นๆ ของสินค้า (denormalized)
  quantity: number; // จำนวน
  unitPrice: number; // ราคาต่อหน่วย (ก่อนส่วนลด)
  discountAmountPerUnit: number; // ส่วนลดต่อหน่วย
  finalPricePerUnit: number; // ราคาต่อหน่วยหลังส่วนลด (unitPrice - discountAmountPerUnit)
  totalPrice: number; // ราคารวมสำหรับรายการนี้ (finalPricePerUnit * quantity)
  currency: string; // สกุลเงิน (เช่น "THB", "USD", "CREDITS")
  // Specific attributes based on itemType
  accessDurationDays?: number; // ระยะเวลาการเข้าถึง (วัน, สำหรับ episode, novel, subscription)
  isLifetimeAccess: boolean; // เป็นการเข้าถึงตลอดชีพหรือไม่
  grantedEntitlements?: string[]; // สิทธิ์ที่ได้รับ (เช่น "read_premium_episode_X", "download_asset_Y")
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติมเฉพาะรายการ
}

// Interface for Purchase document (represents an order)
export interface IPurchase extends Document {
  orderId: string; // รหัสคำสั่งซื้อ (unique, อาจสร้างโดยระบบหรือ payment gateway)
  user: Types.ObjectId; // ผู้ซื้อ (อ้างอิง User model)
  items: IPurchaseItem[]; // รายการสินค้าในคำสั่งซื้อ
  // Order Totals
  subtotalAmount: number; // ราคารวมก่อนภาษีและค่าธรรมเนียม
  discountTotal: number; // ส่วนลดรวมทั้งคำสั่งซื้อ
  taxAmount: number; // ภาษี (ถ้ามี)
  feeAmount: number; // ค่าธรรมเนียม (เช่น ค่าธรรมเนียมแพลตฟอร์ม, ค่าธรรมเนียมการชำระเงิน)
  totalAmountPayable: number; // จำนวนเงินที่ต้องชำระทั้งหมด
  currency: string; // สกุลเงินหลักของคำสั่งซื้อ (เช่น "THB", "USD")
  // Payment Details (อาจอ้างอิง Payment model ถ้าซับซ้อน)
  paymentId?: Types.ObjectId; // อ้างอิง Payment model
  paymentStatus: "pending" | "processing" | "succeeded" | "failed" | "canceled" | "refunded" | "partially_refunded"; // สถานะการชำระเงิน
  paymentMethod?: string; // วิธีการชำระเงิน (เช่น "credit_card", "promptpay", "paypal", "platform_credits")
  paymentGatewayTransactionId?: string; // ID ธุรกรรมจาก Payment Gateway
  // Order Status
  orderStatus: "pending_payment" | "processing" | "completed" | "failed" | "canceled" | "refund_processing" | "refunded"; // สถานะคำสั่งซื้อ
  // Recipient (if gifted)
  giftRecipient?: Types.ObjectId; // ผู้รับของขวัญ (อ้างอิง User model)
  giftMessage?: string; // ข้อความของขวัญ
  // Billing and Shipping (if applicable, e.g., for physical goods or detailed invoices)
  // billingAddress?: IAddress; // (Assume IAddress interface exists)
  // Timestamps
  completedAt?: Date; // วันที่ทำรายการสำเร็จ
  failedAt?: Date; // วันที่ทำรายการล้มเหลว
  refundedAt?: Date; // วันที่คืนเงิน
  // Revenue Split (calculated after payment success)
  platformRevenue?: number; // ส่วนแบ่งรายได้ของแพลตฟอร์ม
  authorRevenue?: Array<{ // ส่วนแบ่งรายได้ของผู้เขียน (กรณีมีหลาย item จากหลาย author ใน order เดียว)
    author: Types.ObjectId;
    amount: number;
    itemId: Types.ObjectId; // Item ที่เกี่ยวข้อง
  }>;
  // Other metadata
  ipAddress?: string; // IP address ของผู้ซื้อ (hashed/encrypted, select: false)
  userAgent?: string; // User agent (select: false)
  customMetadata?: Record<string, any>; // ข้อมูลเพิ่มเติม
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true, index: true }, // No ref here, itemType defines it
    itemType: {
      type: String,
      enum: ["novel", "episode", "official_media", "subscription_plan", "donation_tier", "virtual_currency_pack"],
      required: true,
    },
    novel: { type: Schema.Types.ObjectId, ref: "Novel" },
    episode: { type: Schema.Types.ObjectId, ref: "Episode" },
    officialMedia: { type: Schema.Types.ObjectId, ref: "OfficialMedia" },
    subscriptionPlan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan" }, // Assume SubscriptionPlan model
    donationTier: { type: Schema.Types.ObjectId, ref: "DonationTier" }, // Assume DonationTier model
    virtualCurrencyPack: { type: Schema.Types.ObjectId, ref: "VirtualCurrencyPack" }, // Assume VirtualCurrencyPack model
    itemName: { type: String, required: true, trim: true },
    itemDescription: { type: String, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountAmountPerUnit: { type: Number, default: 0, min: 0 },
    finalPricePerUnit: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "THB" },
    accessDurationDays: { type: Number, min: 0 },
    isLifetimeAccess: { type: Boolean, default: false },
    grantedEntitlements: [String],
    metadata: Schema.Types.Mixed,
  },
  { _id: false } // Subdocuments don't need their own _id unless necessary
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [PurchaseItemSchema],
    subtotalAmount: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    feeAmount: { type: Number, default: 0, min: 0 },
    totalAmountPayable: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "THB" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" }, // Ref to a separate Payment model
    paymentStatus: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "canceled", "refunded", "partially_refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: String,
    paymentGatewayTransactionId: { type: String, index: true },
    orderStatus: {
      type: String,
      enum: ["pending_payment", "processing", "completed", "failed", "canceled", "refund_processing", "refunded"],
      default: "pending_payment",
      index: true,
    },
    giftRecipient: { type: Schema.Types.ObjectId, ref: "User" },
    giftMessage: { type: String, trim: true, maxlength: 1000 },
    completedAt: Date,
    failedAt: Date,
    refundedAt: Date,
    platformRevenue: { type: Number, min: 0 },
    authorRevenue: [
      {
        _id: false,
        author: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true, min: 0 },
        itemId: { type: Schema.Types.ObjectId, required: true },
      },
    ],
    ipAddress: { type: String, select: false },
    userAgent: { type: String, select: false },
    customMetadata: Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
PurchaseSchema.index({ user: 1, orderStatus: 1, createdAt: -1 });
PurchaseSchema.index({ paymentStatus: 1, createdAt: -1 });
PurchaseSchema.index({ "items.itemId": 1, "items.itemType": 1 }); // To find purchases containing specific items
PurchaseSchema.index({ giftRecipient: 1, orderStatus: 1 });
PurchaseSchema.index({ createdAt: 1 }); // For general time-based queries

// ----- Middleware -----
PurchaseSchema.pre("save", function (next) {
  // Calculate finalPricePerUnit and totalPrice for each item if not already set
  this.items.forEach(item => {
    if (item.isModified("unitPrice") || item.isModified("discountAmountPerUnit") || item.isModified("quantity")) {
      item.finalPricePerUnit = item.unitPrice - item.discountAmountPerUnit;
      item.totalPrice = item.finalPricePerUnit * item.quantity;
    }
  });

  // Calculate order totals if not already set or items changed
  if (this.isModified("items") || this.isNew) {
    this.subtotalAmount = this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    this.discountTotal = this.items.reduce((sum, item) => sum + item.discountAmountPerUnit * item.quantity, 0);
    // Assuming tax and fee are calculated elsewhere or set directly
    // For simplicity, totalAmountPayable might be subtotal - discount + tax + fee
    // This.totalAmountPayable = this.subtotalAmount - this.discountTotal + (this.taxAmount || 0) + (this.feeAmount || 0);
  }

  // Soft delete handling
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }

  // Update timestamps based on status
  if (this.isModified("orderStatus")) {
    const now = new Date();
    if (this.orderStatus === "completed" && !this.completedAt) this.completedAt = now;
    else if (this.orderStatus === "failed" && !this.failedAt) this.failedAt = now;
    else if (this.orderStatus === "refunded" && !this.refundedAt) this.refundedAt = now;
  }
  if (this.isModified("paymentStatus")) {
    const now = new Date();
    if (this.paymentStatus === "succeeded" && this.orderStatus !== "completed" && !this.completedAt) {
        // Potentially move orderStatus to completed here or in a post-hook / service layer
    }
  }

  next();
});

// Post-save middleware for denormalization (e.g., updating user stats, novel purchase counts)
// This should be handled carefully, potentially in a service layer or via event-driven architecture
// to avoid making the save operation too heavy or prone to failure.
PurchaseSchema.post("save", async function(doc: IPurchase) {
  if (doc.isModified("orderStatus") && doc.orderStatus === "completed") {
    // Example: Grant entitlements, update user purchase history, update novel sales stats, etc.
    // This is where you would iterate through doc.items and update relevant models.
    // For example, if an episode is purchased:
    // const Episode = model("Episode");
    // await Episode.findByIdAndUpdate(itemId, { $inc: { "statistics.salesCount": 1 } });
    // const User = model("User");
    // await User.findByIdAndUpdate(doc.user, { $addToSet: { purchasedEpisodes: itemId } });
    console.log(`Order ${doc.orderId} completed. Triggering post-completion actions.`);
  }
});

// ----- Model Export -----
// It's generally better to have a separate Payment model to handle payment-specific details and states.
// The Purchase/Order model then focuses on what was bought and its fulfillment status.
const PurchaseModel = () =>
  models.Purchase as mongoose.Model<IPurchase> || model<IPurchase>("Purchase", PurchaseSchema);

export default PurchaseModel;

