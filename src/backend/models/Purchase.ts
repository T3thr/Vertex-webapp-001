// src/models/Purchase.ts
// โมเดลการซื้อ (Purchase Model) - จัดการข้อมูลการซื้อสินค้าหรือบริการภายในแพลตฟอร์ม
// ออกแบบให้รองรับการซื้อด้วยเหรียญ (Coins) หรือเงินจริง, เชื่อมโยงกับผู้ใช้, สินค้า, และการชำระเงิน

import mongoose, { Schema, model, models, Types, Document } from "mongoose";
import UserModel from "./User"; // Import User model for updates

// อินเทอร์เฟซสำหรับรายการสินค้าที่ซื้อ (Purchased Item)
export interface IPurchasedItem {
  itemId: Types.ObjectId; // ID ของสินค้าที่ซื้อ (เช่น Episode, CoinPackage, SubscriptionTier)
  itemType: "novel_episode" | "novel_bundle" | "coin_package" | "subscription_tier" | "donation_item" | "writer_support_package" | "other"; // ประเภทของสินค้า
  itemName: string; // ชื่อสินค้า (denormalized for display)
  description?: string; // คำอธิบายสั้นๆ ของสินค้า (denormalized)
  quantity: number; // จำนวนที่ซื้อ
  pricePerUnit: number; // ราคาต่อหน่วย (ในหน่วย currency ที่ระบุ)
  currency: "COIN" | "THB" | "USD"; // สกุลเงินที่ใช้สำหรับราคานี้
  // totalPriceForItem: number; // ราคารวมสำหรับรายการสินค้านี้ (quantity * pricePerUnit)
  metadata?: Record<string, any>; // ข้อมูลเพิ่มเติมเกี่ยวกับสินค้านี้ (เช่น episodeId, novelId, coins_added)
}

// อินเทอร์เฟซหลักสำหรับเอกสารการซื้อ (Purchase Document)
export interface IPurchase extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // ผู้ใช้ที่ทำการซื้อ (อ้างอิง User model หรือ SocialMediaUser model)
  items: Types.DocumentArray<IPurchasedItem>; // รายการสินค้าที่ซื้อ
  
  totalAmount: number; // ยอดรวมทั้งหมดของการซื้อ (ในหน่วย purchaseCurrency)
  purchaseCurrency: "COIN" | "THB" | "USD"; // สกุลเงินที่ใช้สำหรับการซื้อนี้
  
  paymentId?: Types.ObjectId; // ID ของการชำระเงิน (อ้างอิง Payment model, ถ้าเป็นการซื้อด้วยเงินจริง)
  // ถ้าซื้อด้วย COIN, paymentId อาจจะไม่จำเป็น หรือชี้ไปที่ internal transaction log
  
  status: "pending" | "processing" | "completed" | "failed" | "refunded" | "partially_refunded"; // สถานะการซื้อ
  purchaseMethod?: "in_platform_coin" | "credit_card" | "promptpay" | "paypal" | "apple_pay" | "google_pay"; // วิธีการซื้อ
  
  // รายละเอียดเพิ่มเติม
  transactionDetails?: { // ข้อมูลที่ไม่ sensitive จาก payment gateway หรือ internal system
    providerTransactionId?: string; // ID จาก payment gateway
    coinTransactionId?: string; // ID จากระบบเหรียญภายใน
    message?: string; // ข้อความจากระบบ (เช่น "Payment successful")
  };
  promoCodeUsed?: string; // รหัสโปรโมชันที่ใช้ (ถ้ามี)
  discountAmount?: number; // จำนวนเงินที่ลดราคา (ถ้ามี)
  
  // ที่อยู่สำหรับออกใบเสร็จ (ถ้าจำเป็น และเป็นการซื้อด้วยเงินจริง)
  // billingAddress?: IBillingAddress; // ควรมี schema แยกถ้าซับซ้อน
  
  // Soft delete (อาจไม่จำเป็นสำหรับ Purchase, ขึ้นกับนโยบายการเก็บข้อมูล)
  // isCancelled?: boolean;
  // cancelledAt?: Date;
  // cancellationReason?: string;

  // Timestamps
  purchasedAt?: Date; // วันที่ทำการซื้อ (เมื่อ status เป็น completed)
  createdAt: Date; // วันที่สร้างรายการซื้อ (อาจเป็น pending ก่อน)
  updatedAt: Date; // วันที่อัปเดตล่าสุด
}

// Schema ย่อยสำหรับ IPurchasedItem
const PurchasedItemSchema = new Schema<IPurchasedItem>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true, index: true }, // refPath ควรใช้ถ้า itemType มีหลาย model
    itemType: {
      type: String,
      enum: ["novel_episode", "novel_bundle", "coin_package", "subscription_tier", "donation_item", "writer_support_package", "other"],
      required: true,
    },
    itemName: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    pricePerUnit: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["COIN", "THB", "USD"], required: true },
    metadata: Schema.Types.Mixed,
  },
  { _id: false }
);

// Schema หลักสำหรับ Purchase
const PurchaseSchema = new Schema<IPurchase>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath เพื่อรองรับ SocialMediaUser
      required: true,
      index: true,
    },
    items: [PurchasedItemSchema],
    totalAmount: {
      type: Number,
      required: [true, "กรุณาระบุยอดรวมทั้งหมด (Total amount is required)"],
      min: 0,
    },
    purchaseCurrency: {
      type: String,
      enum: ["COIN", "THB", "USD"],
      required: [true, "กรุณาระบุสกุลเงินที่ใช้ซื้อ (Purchase currency is required)"],
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded", "partially_refunded"],
      default: "pending",
      required: true,
      index: true,
    },
    purchaseMethod: { 
      type: String, 
      enum: ["in_platform_coin", "credit_card", "promptpay", "paypal", "apple_pay", "google_pay"],
      index: true 
    },
    transactionDetails: {
      providerTransactionId: { type: String, trim: true, index: true },
      coinTransactionId: { type: String, trim: true, index: true },
      message: { type: String, trim: true },
    },
    promoCodeUsed: { type: String, trim: true, index: true },
    discountAmount: { type: Number, min: 0 },
    purchasedAt: { type: Date, index: true }, // ตั้งค่าเมื่อ status เป็น 'completed'
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
PurchaseSchema.index({ user: 1, status: 1, purchasedAt: -1 }); // การซื้อล่าสุดของผู้ใช้ตามสถานะ
PurchaseSchema.index({ user: 1, "items.itemType": 1, "items.itemId": 1 }); // ค้นหาว่าผู้ใช้เคยซื้อ item นี้หรือไม่
PurchaseSchema.index({ status: 1, purchaseCurrency: 1, createdAt: -1 }); // การซื้อที่รอดำเนินการ หรือล้มเหลว
PurchaseSchema.index({ paymentId: 1 }, { unique: true, sparse: true }); // ถ้า paymentId มี, ควรจะ unique

// ----- Middleware -----
PurchaseSchema.pre<IPurchase>("save", async function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.purchasedAt) {
    this.purchasedAt = new Date();
  }

  // เมื่อการซื้อสำเร็จ (status: "completed") ควรมีการอัปเดต User's wallet, inventory, statistics
  // ตรวจสอบว่า status ถูกเปลี่ยนเป็น "completed" และเป็นการเปลี่ยนแปลงจริง (ไม่ใช่แค่ save document เดิม)
  const isCompletingPurchase = this.isModified("status") && this.status === "completed";
  const wasPreviouslyCompleted = this.get("status", null, { getters: false }) === "completed";

  if (isCompletingPurchase && !wasPreviouslyCompleted) {
    const User = UserModel(); // Get the User model instance
    try {
      const userToUpdate = await User.findById(this.user);
      if (userToUpdate) {
        let updateOps: any = { $inc: {} };

        if (this.purchaseCurrency === "COIN") {
          // หากซื้อด้วย COIN, จำนวน COIN ที่ใช้จะถูกหักจาก wallet
          // การตรวจสอบว่ามีเหรียญพอหรือไม่ ควรทำก่อนขั้นตอนนี้ (เช่น ตอนสร้าง Purchase หรือตอนเปลี่ยน status เป็น processing)
          if (userToUpdate.wallet.coins < this.totalAmount) {
            // This should ideally be caught before reaching here.
            // Mark purchase as failed or handle insufficient funds.
            this.status = "failed";
            this.transactionDetails = { ...(this.transactionDetails || {}), message: "Insufficient coins." };
            console.error(`Purchase ${this._id} failed: Insufficient coins for user ${this.user}.`);
            return next(new Error("Insufficient coins.")); // Stop save if coins are not enough
          }
          updateOps.$inc["wallet.coins"] = -this.totalAmount;
          updateOps.$inc["activityTracking.totalCoinsSpent"] = (updateOps.$inc["activityTracking.totalCoinsSpent"] || 0) + this.totalAmount;
        } else {
          updateOps.$inc["activityTracking.totalRealMoneySpent"] = (updateOps.$inc["activityTracking.totalRealMoneySpent"] || 0) + this.totalAmount;
          // อาจมีการคำนวณสกุลเงินถ้า totalRealMoneySpent เก็บเป็นสกุลเงินหลักเดียว
        }
        
        // เพิ่ม items ที่ซื้อเข้า inventory ของผู้ใช้ หรือให้สิทธิ์การเข้าถึง content
        for (const item of this.items) {
          if (item.itemType === "coin_package" && item.metadata?.coins_added) {
            updateOps.$inc["wallet.coins"] = (updateOps.$inc["wallet.coins"] || 0) + (item.metadata.coins_added * item.quantity);
          } else if (item.itemType === "novel_episode" && item.metadata?.episodeId) {
            if (!updateOps.$addToSet) updateOps.$addToSet = {};
            updateOps.$addToSet["unlockedContent.episodes"] = item.metadata.episodeId;
          } else if (item.itemType === "novel_bundle" && item.metadata?.novelId) {
            if (!updateOps.$addToSet) updateOps.$addToSet = {};
            updateOps.$addToSet["unlockedContent.novels"] = item.metadata.novelId;
            // Potentially unlock all episodes of this novel bundle - requires more logic
          }
          // ... handle other item types like writer_support_package, subscription_tier
        }
        updateOps.lastUpdatedAt = new Date();

        if (Object.keys(updateOps.$inc).length === 0) delete updateOps.$inc;
        
        await User.findByIdAndUpdate(this.user, updateOps);
      }
    } catch (error) {
      console.error(`Error updating user stats/inventory after purchase ${this._id}:`, error);
      // อาจต้องมีระบบ retry หรือแจ้งเตือน admin ถ้าการอัปเดต user data ล้มเหลวหลังการซื้อสำเร็จ
      // Consider not failing the purchase save, but logging for manual intervention.
    }
  }
  next();
});

// ----- Model Export -----
const PurchaseModel = () => models.Purchase as mongoose.Model<IPurchase> || model<IPurchase>("Purchase", PurchaseSchema);

export default PurchaseModel;

