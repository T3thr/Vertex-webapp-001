// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// อัปเดตล่าสุด: ปรับปรุงให้เรียบง่ายขึ้นโดยอาศัย Mongoose Schema Defaults และ pre-save hook
// จาก User Model เพื่อสร้างผู้ใช้ใหม่ที่สอดคล้องกับโครงสร้างข้อมูลล่าสุด

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IAccount } from "@/backend/models/User"; // << ลดการ import ที่ไม่จำเป็น
import { sendVerificationEmail } from "@/backend/services/sendemail";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/backend/utils/validation";
import { Types } from "mongoose";

interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string;
}

interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log("🔵 [Signup API] ได้รับคำขอสมัครสมาชิก...");
  try {
    await dbConnect();
    console.log("✅ [Signup API] เชื่อมต่อ MongoDB สำเร็จ");

    let body: SignUpRequestBody;
    try {
      body = await request.json();
      console.log(`ℹ️ [Signup API] Body ที่ได้รับ:`, {
        email: body.email,
        username: body.username,
        password: body.password ? "[มีรหัสผ่าน]" : "[ไม่มีรหัสผ่าน]",
        recaptchaToken: body.recaptchaToken
          ? `${body.recaptchaToken.substring(0, 15)}...`
          : "[ไม่มี token]",
      });
    } catch (jsonError: any) {
      console.error("❌ [Signup API] JSON parse error:", jsonError.message);
      return NextResponse.json(
        { error: `รูปแบบ JSON ไม่ถูกต้อง: ${jsonError.message}`, success: false },
        { status: 400 }
      );
    }

    const { email, username, password, recaptchaToken } = body;

    // --- Input Validation ---
    if (!email || !username || !password || !recaptchaToken) {
      const missingFields = [];
      if (!email) missingFields.push("อีเมล");
      if (!username) missingFields.push("ชื่อผู้ใช้");
      if (!password) missingFields.push("รหัสผ่าน");
      if (!recaptchaToken) missingFields.push("reCAPTCHA token");
      console.error(
        `❌ [Signup API] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`
      );
      return NextResponse.json(
        {
          error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}`,
          success: false,
        },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      console.error(`❌ [Signup API] รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json(
        { error: "รูปแบบอีเมลไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(
        `❌ [Signup API] ชื่อผู้ใช้ไม่ถูกต้อง: ${username}, เหตุผล: ${usernameValidation.message}`
      );
      return NextResponse.json(
        {
          error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้องตามนโยบาย",
          success: false,
        },
        { status: 400 }
      );
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(
        `❌ [Signup API] รหัสผ่านไม่ถูกต้อง: ${passwordValidation.message}`
      );
      return NextResponse.json(
        {
          error:
            passwordValidation.message ||
            "รหัสผ่านไม่ตรงตามนโยบายความปลอดภัย",
          success: false,
        },
        { status: 400 }
      );
    }

    // --- reCAPTCHA Verification ---
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่า");
      return NextResponse.json(
        {
          error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK missing)",
          success: false,
        },
        { status: 500 }
      );
    }
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
    console.log("🔄 [Signup API] ส่งคำขอตรวจสอบ reCAPTCHA ไปยัง Google...");
    const googleResponse = await fetch(verificationUrl, { method: "POST" });
    const googleRecaptchaData: RecaptchaResponseFromGoogle =
      await googleResponse.json();
    console.log(
      `ℹ️ [Signup API] การตอบกลับจาก Google reCAPTCHA:`,
      googleRecaptchaData
    );

    if (!googleRecaptchaData.success) {
      console.warn(
        `❌ [Signup API] การยืนยัน reCAPTCHA ล้มเหลว:`,
        googleRecaptchaData["error-codes"]
      );
      return NextResponse.json(
        {
          success: false,
          error: "การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่อีกครั้ง",
          "error-codes": googleRecaptchaData["error-codes"] || [],
        },
        { status: 400 }
      );
    }
    console.log(`✅ [Signup API] reCAPTCHA ผ่านการยืนยัน`);

    // --- User Exists Check ---
    const lowerCaseEmail = email.toLowerCase();
    console.log(
      `🔍 [Signup API] ตรวจสอบผู้ใช้ซ้ำ: email=${lowerCaseEmail}, username=${username}`
    );
    const existingUser = await UserModel.findOne({
      $or: [{ email: lowerCaseEmail }, { username: username }],
    }).lean();

    if (existingUser) {
      let conflictField = "ข้อมูล";
      if (existingUser.email === lowerCaseEmail) conflictField = "อีเมล";
      else if (existingUser.username === username)
        conflictField = "ชื่อผู้ใช้";
      console.error(
        `❌ [Signup API] ${conflictField} '${
          conflictField === "อีเมล" ? lowerCaseEmail : username
        }' ถูกใช้งานแล้ว`
      );
      return NextResponse.json(
        { error: `${conflictField} นี้ถูกใช้งานแล้ว`, success: false },
        { status: 409 }
      );
    }

    console.log("🔄 [Signup API] สร้าง instance ผู้ใช้ใหม่...");

    // สร้างผู้ใช้ใหม่โดยใช้ข้อมูลที่จำเป็นเท่านั้น
    // Schema defaults และ pre-save hook ใน User.ts จะจัดการส่วนที่เหลือทั้งหมด
    // รวมถึงการสร้าง sub-documents, ตั้งค่า default, hash รหัสผ่าน, และดึงข้อมูล Level 1
    const newUser = new UserModel({
      username: username,
      email: lowerCaseEmail,
      password: password, // pre-save hook จะ hash รหัสผ่านนี้
      accounts: [
        {
          provider: "credentials",
          // providerAccountId จะถูกตั้งเป็น _id ของ user หลัง save สำเร็จ
          providerAccountId: new Types.ObjectId().toString(), // ค่าชั่วคราว
          type: "credentials",
        } as IAccount,
      ],
      profile: {
        displayName: username, // ตั้งค่าเริ่มต้นให้ displayName เป็น username
      },
      // ไม่จำเป็นต้องกำหนด roles, trackingStats, socialStats, preferences, wallet, gamification, etc.
      // Mongoose จะใช้ค่า default จาก UserSchema โดยอัตโนมัติ
    });

    const verificationTokenPlain = newUser.generateEmailVerificationToken();

    await newUser.save();
    console.log(
      `✅ [Signup API] สร้างผู้ใช้ใหม่สำเร็จ (ID: ${newUser._id}), username: ${newUser.username}, email: ${newUser.email}`
    );

    // อัปเดต providerAccountId ของ credentials account ด้วย ID ผู้ใช้จริง
    const credAccount = newUser.accounts.find(
      (acc) => acc.provider === "credentials"
    );
    if (credAccount) {
      credAccount.providerAccountId = newUser._id.toString();
      // ไม่ต้อง .save() อีกรอบทันทีถ้าไม่จำเป็น แต่การทำแบบนี้ก็ชัดเจนดี
      // อาจจะรวมไว้ใน transaction หรือทำพร้อมกันในการอัปเดตอื่น
      await UserModel.updateOne(
        { _id: newUser._id, "accounts._id": credAccount._id },
        { $set: { "accounts.$.providerAccountId": newUser._id.toString() } }
      );
      console.log(
        `ℹ️ [Signup API] อัปเดต providerAccountId สำหรับ credentials account ของ ${newUser.username}`
      );
    }

    try {
      await sendVerificationEmail(
        newUser.email as string,
        verificationTokenPlain
      );
      console.log(
        `✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${newUser.email} สำเร็จ`
      );
    } catch (emailError: any) {
      console.error(
        "❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:",
        emailError.message
      );
      // แม้ว่าอีเมลจะล้มเหลว แต่ผู้ใช้ได้ถูกสร้างขึ้นแล้ว ควรแจ้งให้ผู้ใช้ทราบ
      return NextResponse.json(
        {
          success: true,
          message:
            "สมัครสมาชิกสำเร็จ แต่การส่งอีเมลยืนยันมีปัญหา กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
          userId: newUser._id.toString(),
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี",
        userId: newUser._id.toString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:",
      error.message || error,
      error.stack
    );
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500;

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      errorMessage = `${
        field === "email"
          ? "อีเมล"
          : field === "username"
          ? "ชื่อผู้ใช้"
          : `ข้อมูล '${field}'`
      } นี้ถูกใช้งานแล้ว`;
      status = 409;
    } else if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e: any) => e.message);
      errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
      status = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage, success: false }, { status });
  }
}