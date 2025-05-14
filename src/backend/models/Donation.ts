// src/models/Donation.ts
// โมเดลการบริจาค/สนับสนุน (Donation Model) - จัดการข้อมูลการบริจาคหรือให้การสนับสนุนแก่นักเขียนหรือแพลตฟอร์ม
// ออกแบบให้เชื่อมโยงกับผู้ให้, ผู้รับ, จำนวนเงิน/เหรียญ, และข้อความสนับสนุน

import mongoose, { Schema, model, models, Types, Document } from "mongoose";

// ประเภทของผู้รับการสนับสนุน
export type DonationRecipientType = "writer" | "platform";

// อินเทอร์เฟซหลักสำหรับเอกสารการบริจาค (Donation Document)
export interface IDonation extends Document {
  _id: Types.ObjectId;
  donor: Types.ObjectId; // ผู้ใช้ที่ทำการบริจาค (อ้างอิง User model หรือ SocialMediaUser model)
  
  recipientType: DonationRecipientType; // ประเภทของผู้รับ (นักเขียน หรือ แพลตฟอร์ม)
  recipientUser?: Types.ObjectId; // ID ของนักเขียนผู้รับ (ถ้า recipientType = "writer", อ้างอิง User model)
  recipientNovel?: Types.ObjectId; // (Optional) ID ของนิยายที่ผู้บริจาคต้องการสนับสนุนโดยเฉพาะ (อ้างอิง Novel model)
  
  amount: number; // จำนวนที่บริจาค
  currency: "COIN" | "THB" | "USD"; // สกุลเงินที่ใช้บริจาค
  
  message?: string; // ข้อความจากผู้บริจาคถึงผู้รับ (อาจแสดงสาธารณะหรือส่วนตัว)
  isAnonymous: boolean; // ผู้บริจาคต้องการปกปิดชื่อหรือไม่
  
  // สถานะการบริจาค (เชื่อมโยงกับ Payment ถ้าเป็นการบริจาคด้วยเงินจริง)
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  paymentId?: Types.ObjectId; // ID ของการชำระเงิน (อ้างอิง Payment model, ถ้าบริจาคด้วยเงินจริง)
  purchaseId?: Types.ObjectId; // (Optional) ID ของการซื้อ (ถ้าการบริจาคผ่านระบบ Purchase, เช่น ซื้อ "แพ็กเกจสนับสนุนนักเขียน")
  
  // รายละเอียดเพิ่มเติม
  // transactionDetails?: { // ข้อมูลจาก payment gateway หรือ internal coin system
  //   providerTransactionId?: string;
  //   coinTransactionId?: string;
  // };

  // Timestamps
  donatedAt?: Date; // วันที่การบริจาคสำเร็จ (status = "completed")
  createdAt: Date;
  updatedAt: Date;
}

// Schema หลักสำหรับ Donation
const DonationSchema = new Schema<IDonation>(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["writer", "platform"],
      required: [true, "กรุณาระบุประเภทผู้รับการสนับสนุน (Recipient type is required)"],
      index: true,
    },
    recipientUser: { // สำหรับ recipientType: "writer"
      type: Schema.Types.ObjectId,
      ref: "User", // หรือ refPath
      index: true,
      // required: function(this: IDonation) { return this.recipientType === "writer"; } // ทำให้ required ถ้าเป็น writer
    },
    recipientNovel: { // Optional, ถ้าต้องการระบุว่าสนับสนุนนิยายเรื่องไหน
      type: Schema.Types.ObjectId,
      ref: "Novel",
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "กรุณาระบุจำนวนเงินที่บริจาค (Donation amount is required)"],
      min: [1, "จำนวนเงินบริจาคต้องมีค่าอย่างน้อย 1 (หรือตามที่กำหนด)"], // ปรับ min ตามสกุลเงิน
    },
    currency: {
      type: String,
      enum: ["COIN", "THB", "USD"],
      required: [true, "กรุณาระบุสกุลเงินที่ใช้บริจาค (Currency is required)"],
    },
    message: { type: String, trim: true, maxlength: [1000, "ข้อความสนับสนุนต้องไม่เกิน 1000 ตัวอักษร"] },
    isAnonymous: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      default: "pending",
      required: true,
      index: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase", index: true },
    donatedAt: { type: Date, index: true },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ----- Indexes -----
DonationSchema.index({ donor: 1, status: 1, createdAt: -1 }); // การบริจาคล่าสุดของผู้ให้ตามสถานะ
DonationSchema.index({ recipientType: 1, recipientUser: 1, status: 1, donatedAt: -1 }); // การบริจาคที่นักเขียนได้รับ
DonationSchema.index({ recipientNovel: 1, status: 1, donatedAt: -1 }); // การบริจาคที่นิยายเรื่องหนึ่งได้รับ
DonationSchema.index({ status: 1, currency: 1, createdAt: -1 });

// ----- Validation -----
DonationSchema.pre("validate", function (next) {
  if (this.recipientType === "writer" && !this.recipientUser) {
    next(new Error("กรุณาระบุผู้รับการสนับสนุน (recipientUser) เมื่อประเภทผู้รับเป็น 'writer'"));
  } else if (this.recipientType === "platform" && this.recipientUser) {
    // Optional: clear recipientUser if type is platform, or disallow
    this.recipientUser = undefined;
    next();
  } else {
    next();
  }
});

// ----- Middleware -----
DonationSchema.pre("save", async function (next) {
  if (this.isModified("status") && this.status === "completed" && !this.donatedAt) {
    this.donatedAt = new Date();
  }

  // เมื่อการบริจาคสำเร็จ (status: "completed")
  if (this.isModified("status") && this.status === "completed") {
    const User = models.User || model("User"); // หรือ SocialMediaUser
    try {
      // อัปเดตสถิติผู้ให้ (donor)
      const donorUpdate: any = {};
      if (this.currency === "COIN") {
        // Logic การหักเหรียญควรเกิดก่อน หรือใน Purchase/Payment model
        // donorUpdate["$inc"] = { "activityTracking.totalCoinsDonated": this.amount };
      } else {
        // donorUpdate["$inc"] = { "activityTracking.totalRealMoneyDonated": this.amount };
      }
      // await User.findByIdAndUpdate(this.donor, donorUpdate);

      // อัปเดตสถิติผู้รับ (recipientUser, ถ้าเป็น writer)
      if (this.recipientType === "writer" && this.recipientUser) {
        const recipientUpdate: any = {};
        if (this.currency === "COIN") {
          recipientUpdate["$inc"] = { "writerStats.totalCoinsReceived": this.amount, "writerStats.totalDonationsReceived": 1 };
        } else {
          recipientUpdate["$inc"] = { "writerStats.totalRealMoneyReceived": this.amount, "writerStats.totalDonationsReceived": 1 };
        }
        await User.findByIdAndUpdate(this.recipientUser, recipientUpdate);
        
        // อาจมีการสร้าง Notification ให้ผู้รับ
      }
      
      // อัปเดตสถิติของนิยาย (recipientNovel, ถ้ามี)
      if (this.recipientNovel) {
        const Novel = models.Novel || model("Novel");
        const novelUpdate: any = { $inc: { "statistics.totalDonationsReceived": 1 } };
        if (this.currency === "COIN") {
            novelUpdate.$inc["statistics.totalCoinsFromDonations"] = this.amount;
        } else {
            novelUpdate.$inc["statistics.totalRealMoneyFromDonations"] = this.amount;
        }
        await Novel.findByIdAndUpdate(this.recipientNovel, novelUpdate);
      }

    } catch (error) {
      console.error(`Error updating stats after donation ${this._id} completed:`, error);
      // อาจต้องมีระบบ retry หรือแจ้งเตือน admin
    }
  }
  next();
});

// ----- Model Export -----
const DonationModel = () => models.Donation as mongoose.Model<IDonation> || model<IDonation>("Donation", DonationSchema);

export default DonationModel;

