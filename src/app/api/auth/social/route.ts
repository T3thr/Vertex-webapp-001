// src/app/api/auth/social/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import SocialMediaUserModel, { ISocialMediaUser } from "@/backend/models/SocialMediaUser";

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { provider, providerId, email, name, username, picture } = await request.json();

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!provider || !providerId || (!email && !username)) {
      console.error(`❌ ข้อมูลไม่ครบถ้วน: provider=${provider}, providerId=${providerId}, email=${email}, username=${username}`);
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน (ต้องการ provider, providerId, และอย่างน้อย email หรือ username)" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้ใน SocialMediaUser collection
    const user = await SocialMediaUserModel().findOne({
      $or: [
        { provider, providerAccountId: providerId },
        ...(email && email.trim() ? [{ email: email.toLowerCase() }] : []),
        { username: username?.toLowerCase() },
      ],
    }) as ISocialMediaUser;

    if (user) {
      // อัปเดตข้อมูลผู้ใช้ที่มีอยู่
      let profileUpdated = false;

      if (name && !user.profile.displayName) {
        user.profile.displayName = name;
        profileUpdated = true;
      }
      if (picture && !user.profile.avatar) {
        user.profile.avatar = picture;
        profileUpdated = true;
      }
      if (email && email.trim() && !user.email) {
        user.email = email.toLowerCase();
        profileUpdated = true;
      }
      if (!user.stats) {
        user.stats = { followers: 0, following: 0, novels: 0, purchases: 0 };
        profileUpdated = true;
      }
      if (!user.preferences) {
        user.preferences = {
          language: "th",
          theme: "system",
          notifications: { email: true, push: true },
        };
        profileUpdated = true;
      }
      if (!user.wallet) {
        user.wallet = { balance: 0, currency: "THB" };
        profileUpdated = true;
      }
      if (user.isActive === undefined || user.isActive === null) {
        user.isActive = true;
        profileUpdated = true;
      }
      if (!user.profile.bio) {
        user.profile.bio = "";
        profileUpdated = true;
      }
      if (!user.profile.coverImage) {
        user.profile.coverImage = "";
        profileUpdated = true;
      }
      user.lastLogin = new Date();
      profileUpdated = true;

      if (profileUpdated) {
        console.log(`⏳ อัปเดตผู้ใช้ ${user.email || user.username} ด้วยข้อมูล:`, {
          email: user.email,
          profile: user.profile,
          stats: user.stats,
          preferences: user.preferences,
          wallet: user.wallet,
          isActive: user.isActive,
          bannedUntil: user.bannedUntil,
        });
        await user.save();
      }

      console.log(`✅ ผู้ใช้ ${user.email || user.username} เข้าสู่ระบบด้วย ${provider} (บัญชีเดิม)`);

      return NextResponse.json(
        {
          user: {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            role: user.role,
            profile: user.profile,
            stats: user.stats,
            preferences: user.preferences,
            wallet: user.wallet,
            isActive: user.isActive,
            isEmailVerified: user.email ? true : false, // Assume verified if email exists
            bannedUntil: user.bannedUntil,
          },
        },
        { status: 200 }
      );
    }

    // สร้างผู้ใช้ใหม่ใน SocialMediaUser collection
    console.log(`⏳ ไม่พบผู้ใช้ ${email || username}, กำลังสร้างบัญชีใหม่จาก ${provider}...`);

    // สร้าง username ที่ไม่ซ้ำกัน
    const baseUsername =
      username ||
      (email && email.trim() ? email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") : undefined) ||
      name?.replace(/\s+/g, "_").toLowerCase() ||
      `user_${Math.random().toString(36).substring(2, 8)}`;

    let newUsername = baseUsername.toLowerCase();
    let counter = 1;

    while (
      (await UserModel().findOne({ username: newUsername })) ||
      (await SocialMediaUserModel().findOne({ username: newUsername }))
    ) {
      newUsername = `${baseUsername}${counter}`;
      counter++;
    }

    // สร้างผู้ใช้ใหม่ด้วยข้อมูลทั้งหมดตาม schema
    const newUserData = {
      provider,
      providerAccountId: providerId,
      email: email && email.trim() ? email.toLowerCase() : undefined,
      username: newUsername,
      role: "Reader",
      profile: {
        displayName: name || newUsername,
        avatar: picture || "",
        bio: "",
        coverImage: "",
      },
      stats: {
        followers: 0,
        following: 0,
        novels: 0,
        purchases: 0,
      },
      preferences: {
        language: "th",
        theme: "system",
        notifications: {
          email: true,
          push: true,
        },
      },
      wallet: {
        balance: 0,
        currency: "THB",
      },
      isActive: true,
      bannedUntil: null,
      lastLogin: new Date(),
    };

    const newUser = new (SocialMediaUserModel())(newUserData);

    // แสดงข้อมูลก่อนบันทึก
    console.log(`⏳ ข้อมูลผู้ใช้ใหม่ก่อนบันทึก:`, newUserData);

    // บันทึกผู้ใช้
    await newUser.save();

    // ดึงผู้ใช้ที่บันทึกแล้วเพื่อตรวจสอบ
    const savedUser = await SocialMediaUserModel().findById(newUser._id);
    if (!savedUser) {
      // If the user wasn't saved successfully, handle the error
      console.error(`❌ ไม่พบผู้ใช้ที่บันทึก: ${newUser._id}`);
      return NextResponse.json(
        { error: "ไม่สามารถสร้างผู้ใช้ใหม่ได้" },
        { status: 500 }
      );
    }

    console.log(`✅ สร้างผู้ใช้ใหม่ ${savedUser.email || savedUser.username} จาก ${provider} สำเร็จ`, savedUser.toObject());

    return NextResponse.json(
      {
        user: {
          id: savedUser._id.toString(),
          email: savedUser.email,
          username: savedUser.username,
          role: savedUser.role,
          profile: savedUser.profile,
          stats: savedUser.stats,
          preferences: savedUser.preferences,
          wallet: savedUser.wallet,
          isActive: savedUser.isActive,
          isEmailVerified: savedUser.email ? true : false,
          bannedUntil: savedUser.bannedUntil,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(`❌ ข้อผิดพลาดใน /api/auth/social (${error.message}):`, error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((el: any) => el.message);
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = `${field === "email" ? "อีเมล" : "ชื่อผู้ใช้"} นี้ถูกใช้งานแล้ว`;
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดบางอย่างบนเซิร์ฟเวอร์ขณะประมวลผล Social Login" },
      { status: 500 }
    );
  }
}