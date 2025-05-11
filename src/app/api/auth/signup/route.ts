// src/app/api/auth/signup/route.ts
// API สำหรับการสมัครสมาชิกผู้ใช้ใหม่ด้วย Credentials-based authentication
// จัดการการสร้างผู้ใช้ใน User collection พร้อมส่งอีเมลยืนยัน
// API นี้จะทำการ verify reCAPTCHA token อีกครั้งกับ Google
// อัปเดต: เพิ่ม console logสำหรับ debug และปรับปรุงการ parse JSON

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel from "@/backend/models/SocialMediaUser"; // สมมติว่ามี model นี้
import { sendVerificationEmail, generateVerificationToken } from "@/backend/services/sendemail";
import { validateEmail, validatePassword, validateUsername } from "@/backend/utils/validation";
import { NextApiRequest } from "next"; // สำหรับการดึง IP ถ้าต้องการ


interface SignUpRequestBody {
  email: string;
  username: string;
  password: string;
  recaptchaToken: string;
}

interface RecaptchaResponseFromGoogle {
  success: boolean;
  challenge_ts?: string; // Timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
  hostname?: string;     // The hostname of the site where the reCAPTCHA was solved
  "error-codes"?: string[]; // Optional
}

// ฟังก์ชัน helper สำหรับดึง IP (ถ้าต้องการและตั้งค่า trustProxy ถูกต้อง)
function getClientIp(req: Request): string | undefined {
    // สำหรับ Edge Functions (request.ip)
    if ('ip' in req && typeof req.ip === 'string') {
        return req.ip;
    }
    // สำหรับ Node.js runtime (req.headers)
    const xForwardedFor = req.headers.get('x-forwarded-for');
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // fallback หรือถ้าไม่สามารถหาได้ (อาจต้องดูโครงสร้างของ request object ที่ Next.js ส่งมา)
    return undefined;
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
        password: body.password ? '[มีรหัสผ่าน]' : '[ไม่มีรหัสผ่าน]',
        recaptchaToken: body.recaptchaToken ? `${body.recaptchaToken.substring(0, 15)}...` : 'ไม่มี token'
      });
    } catch (jsonError: any) {
      console.error("❌ [Signup API] JSON parse error:", jsonError.message);
      return NextResponse.json(
        { error: `รูปแบบ JSON ไม่ถูกต้อง: ${jsonError.message}`, success: false },
        { status: 400 }
      );
    }

    const { email, username, password, recaptchaToken } = body;

    // 1. ตรวจสอบฟิลด์ที่จำเป็น
    if (!email || !username || !password || !recaptchaToken) {
      const missingFields = [];
      if (!email) missingFields.push("อีเมล");
      if (!username) missingFields.push("ชื่อผู้ใช้");
      if (!password) missingFields.push("รหัสผ่าน");
      if (!recaptchaToken) missingFields.push("reCAPTCHA token");
      console.error(`❌ [Signup API] ข้อมูลไม่ครบถ้วน: ${missingFields.join(", ")}`);
      return NextResponse.json(
        { error: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(", ")}`, success: false },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบความถูกต้องของข้อมูล
    if (!validateEmail(email)) {
      console.error(`❌ [Signup API] รูปแบบอีเมลไม่ถูกต้อง: ${email}`);
      return NextResponse.json({ error: "รูปแบบอีเมลไม่ถูกต้อง", success: false }, { status: 400 });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      console.error(`❌ [Signup API] ชื่อผู้ใช้ไม่ถูกต้อง: ${username}, เหตุผล: ${usernameValidation.message}`);
      return NextResponse.json(
        { error: usernameValidation.message || "ชื่อผู้ใช้ไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.error(`❌ [Signup API] รหัสผ่านไม่ถูกต้อง: ${passwordValidation.message}`);
      return NextResponse.json(
        { error: passwordValidation.message || "รหัสผ่านไม่ถูกต้อง", success: false },
        { status: 400 }
      );
    }

    // 3. ตรวจสอบ reCAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    console.log(`ℹ️ [Signup API] RECAPTCHA_SECRET_KEY: ${secretKey ? 'มี' : 'ไม่มี'}`);
    if (!secretKey) {
      console.error("❌ [Signup API] RECAPTCHA_SECRET_KEY ไม่ได้ตั้งค่า");
      return NextResponse.json(
        { error: "การตั้งค่า reCAPTCHA ของเซิร์ฟเวอร์ไม่ถูกต้อง (SK)", success: false },
        { status: 500 }
      );
    }

    const clientIp = getClientIp(request);
    const params = new URLSearchParams({
        secret: secretKey,
        response: recaptchaToken,
    });
    if (clientIp) {
        params.append('remoteip', clientIp);
        console.log(`ℹ️ [Signup API] Client IP สำหรับ reCAPTCHA: ${clientIp}`);
    } else {
        console.warn(`⚠️ [Signup API] ไม่สามารถระบุ Client IP สำหรับ reCAPTCHA`);
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
    console.log("🔄 [Signup API] ส่งคำขอตรวจสอบ reCAPTCHA ไปยัง Google...");

    const googleResponse = await fetch(verificationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });
    const googleRecaptchaData: RecaptchaResponseFromGoogle = await googleResponse.json(); // ควรมีการจัดการ error จาก .json() ด้วย

    if (!googleRecaptchaData.success) {
      console.warn(`❌ [Signup API] การยืนยัน reCAPTCHA ล้มเหลว:`, {
        success: googleRecaptchaData.success,
        errorCodes: googleRecaptchaData["error-codes"]?.join(", ") || "ไม่ระบุ",
        hostname: googleRecaptchaData.hostname, // อาจไม่มีถ้า success เป็น false
      });
      let userFriendlyError = "การยืนยัน reCAPTCHA ล้มเหลว กรุณาลองใหม่";
      if (googleRecaptchaData["error-codes"]?.includes("timeout-or-duplicate")) {
        userFriendlyError = "การยืนยัน reCAPTCHA หมดเวลาหรือซ้ำซ้อน กรุณาลองใหม่";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-input-response")) {
        userFriendlyError = "โทเค็น reCAPTCHA ไม่ถูกต้อง";
      } else if (googleRecaptchaData["error-codes"]?.includes("bad-request")) {
        userFriendlyError = "คำขอ reCAPTCHA ไม่ถูกต้อง หรือการตั้งค่าเซิร์ฟเวอร์มีปัญหา";
      } else if (googleRecaptchaData["error-codes"]?.includes("invalid-site-secret")) {
        // นี่เป็น server-side error ไม่ควรแสดงให้ user โดยตรง แต่ควร log ไว้
        console.error("❌ [Signup API] RECAPTCHA Secret Key ไม่ถูกต้อง!");
        userFriendlyError = "เกิดข้อผิดพลาดในการตั้งค่า reCAPTCHA (เซิร์ฟเวอร์)";
      }
      return NextResponse.json(
        { success: false, error: userFriendlyError, "error-codes": googleRecaptchaData["error-codes"] || [] },
        { status: 400 } // Bad Request เนื่องจาก reCAPTCHA ไม่ผ่าน
      );
    }
    console.log(`✅ [Signup API] reCAPTCHA ผ่านการยืนยัน, Hostname: ${googleRecaptchaData.hostname}, Timestamp: ${googleRecaptchaData.challenge_ts}`);

    // 4. ตรวจสอบผู้ใช้ซ้ำ
    const lowerCaseEmail = email.toLowerCase();
    const User = UserModel(); // หาก UserModel เป็น factory function
    const SocialMediaUser = SocialMediaUserModel(); // หาก SocialMediaUserModel เป็น factory function

    console.log(`🔍 [Signup API] ตรวจสอบผู้ใช้ซ้ำ: email=${lowerCaseEmail}, username=${username}`);
    const existingUserInUsers = await User.findOne({
      $or: [{ email: lowerCaseEmail }, { username: username }], // ควรใช้ username ที่รับมาโดยตรง ไม่ใช่ lowerCase
    }).lean();

    const existingUserInSocialMediaUsers = await SocialMediaUser.findOne({
      $or: [{ email: lowerCaseEmail }, { username: username }],
    }).lean();

    if (existingUserInUsers || existingUserInSocialMediaUsers) {
      let conflictField = "ข้อมูล";
      const isEmailConflict = (existingUserInUsers?.email === lowerCaseEmail) || (existingUserInSocialMediaUsers?.email === lowerCaseEmail);
      const isUsernameConflict = (existingUserInUsers?.username === username) || (existingUserInSocialMediaUsers?.username === username);

      if (isEmailConflict) {
        conflictField = "อีเมล";
      } else if (isUsernameConflict) {
        conflictField = "ชื่อผู้ใช้";
      }
      console.error(`❌ [Signup API] ${conflictField} ถูกใช้งานแล้ว: ${conflictField === "อีเมล" ? lowerCaseEmail : username}`);
      return NextResponse.json(
        { error: `${conflictField}นี้ถูกใช้งานแล้ว`, success: false },
        { status: 409 } // Conflict
      );
    }

    // 5. สร้าง token สำหรับยืนยันอีเมล
    console.log("🔄 [Signup API] สร้าง token สำหรับยืนยันอีเมล...");
    const { token: verificationToken, hashedToken: hashedVerificationToken, expiry: verificationTokenExpiry } = generateVerificationToken();

    // 6. สร้างผู้ใช้ใหม่
    console.log("🔄 [Signup API] สร้างผู้ใช้ใหม่ใน User collection...");
    const newUser = new User({
      email: lowerCaseEmail,
      username, // ใช้ username ที่รับมา
      password, // password ควรจะถูก hash ก่อนบันทึกใน model (e.g., pre-save hook)
      role: "Reader",
      isEmailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
      isActive: true, // ผู้ใช้ active แต่ยังไม่ verify email
      isBanned: false,
      profile: {
        displayName: username,
        // avatarUrl: '', // default or empty
        // bio: '',
      },
      trackingStats: { /* ...ข้อมูล default ... */ },
      socialStats: { /* ...ข้อมูล default ... */ },
      preferences: { /* ...ข้อมูล default ... */ },
      wallet: { /* ...ข้อมูล default ... */ },
      gamification: { /* ...ข้อมูล default ... */ },
      // ... other fields from your schema with defaults ...
      joinedAt: new Date(),
    });

    await newUser.save();
    console.log(`✅ [Signup API] สร้างผู้ใช้ใหม่ (ยังไม่ยืนยันอีเมล): ${username} (${lowerCaseEmail})`);

    // 7. ส่งอีเมลยืนยัน
    try {
      await sendVerificationEmail(lowerCaseEmail, verificationToken);
      console.log(`✅ [Signup API] ส่งอีเมลยืนยันไปยัง ${lowerCaseEmail} สำเร็จ`);
    } catch (emailError: unknown) {
      console.error("❌ [Signup API] ไม่สามารถส่งอีเมลยืนยันได้:", emailError);
      // ผู้ใช้ถูกสร้างแล้ว แต่ส่งอีเมลไม่สำเร็จ
      // ควรแจ้งให้ผู้ใช้ทราบ และอาจมีระบบให้ขอ re-send email ภายหลัง
      return NextResponse.json(
        {
          success: true, // การสมัครสมาชิก (สร้าง user) สำเร็จ
          message: "สมัครสมาชิกสำเร็จ แต่มีปัญหาในการส่งอีเมลยืนยัน กรุณาลองขอส่งอีเมลยืนยันใหม่อีกครั้งในภายหลัง หรือติดต่อผู้ดูแล",
          // userId: newUser._id // อาจส่ง userId กลับไปถ้าต้องการ
        },
        { status: 201 } // Created, but with a notice
      );
    }

    return NextResponse.json(
      { success: true, message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" },
      { status: 201 } // Created
    );

  } catch (error: unknown) {
    console.error("❌ [Signup API] เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    let errorMessage = "เกิดข้อผิดพลาดในการสมัครสมาชิก";
    let status = 500; // Internal Server Error by default

    if (error instanceof Error) {
      // @ts-ignore
      if (error.code === 11000) { // MongoDB duplicate key error
        // @ts-ignore
        const field = Object.keys(error.keyValue)[0];
        // @ts-ignore
        const value = error.keyValue[field];
        errorMessage = `${field === "email" ? "อีเมล" : (field === "username" ? "ชื่อผู้ใช้" : field)} '${value}' นี้ถูกใช้งานแล้ว`;
        status = 409; // Conflict
      } else if (error.name === "ValidationError") { // Mongoose validation error
        // @ts-ignore
        const errors = Object.values(error.errors).map((e: any) => e.message);
        errorMessage = `ข้อมูลไม่ถูกต้อง: ${errors.join(", ")}`;
        status = 400; // Bad Request
      } else {
        errorMessage = error.message;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // ตรวจสอบ SyntaxError จาก JSON parsing อีกครั้ง (แม้ว่าควรจะถูกจับได้ก่อนหน้านี้)
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
        errorMessage = "ข้อมูลที่ส่งมาไม่ถูกต้อง (รูปแบบ JSON ไม่ถูกต้อง)";
        status = 400;
    }


    return NextResponse.json(
      { error: errorMessage, success: false },
      { status }
    );
  }
}