// src/app/api/auth/signin/oauth/route.ts
// API สำหรับการจัดการการเข้าสู่ระบบ/ลงทะเบียนผ่าน OAuth providers (Google, Twitter, etc.)
// อัปเดตล่าสุด: ปรับปรุงให้เรียบง่ายขึ้นโดยอาศัย Mongoose Schema Defaults และ pre-save hook
// จาก User Model เพื่อสร้าง/อัปเดตผู้ใช้ใหม่ที่สอดคล้องกับโครงสร้างข้อมูลล่าสุด

import { NextResponse } from "next/server";
import dbConnect from "@/backend/lib/mongodb";
import UserModel, { IUser, IAccount } from "@/backend/models/User"; // << ลดการ import ที่ไม่จำเป็น
import { Types, Document } from "mongoose";

interface OAuthSignInRequestBody {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  usernameSuggestion?: string | null;
  picture?: string | null;
  "error-codes"?: string[];
}

type PlainUserObjectData = Omit<
  IUser,
  keyof Document | // Omit Mongoose Document specific keys if IUser itself doesn't directly extend it for this purpose
  '_id' | // We'll handle _id separately as string
  'matchPassword' | // Exclude methods
  'generateEmailVerificationToken' |
  'generatePasswordResetToken'
>;

type OAuthSignInResponseUser = PlainUserObjectData & {
  _id: string;
  accounts: IAccount[]; // IAccount จาก toObject() จะเป็น plain object
};

async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let currentUsername = baseUsername.toLowerCase().replace(/[^a-z0-9_.]/g, "").substring(0, 40);
  if (currentUsername.length < 3) {
    currentUsername = `${currentUsername}${Math.random().toString(36).substring(2, 5)}`;
  }
  currentUsername = currentUsername.substring(0, 50);

  let counter = 0;
  let uniqueUsername = currentUsername;

  // The eslint-disable directive for no-constant-condition was removed as per the warning.
  // If 'no-constant-condition' is an active error rule in your project for 'while(true)',
  // and you intend for this loop to be infinite until broken, you might need to re-evaluate
  // your ESLint setup or the loop's condition if the warning was misleading.
  // For now, assuming removal is correct based on "no problems were reported".
  while (true) {
    const existingUser = await UserModel.findOne({ username: uniqueUsername }).lean();
    if (!existingUser) {
      break;
    }
    counter++;
    const baseForNew = currentUsername.substring(0, 50 - (String(counter).length + 1));
    uniqueUsername = `${baseForNew}_${counter}`;
    if (uniqueUsername.length > 50) {
        uniqueUsername = `user_${Date.now().toString().slice(-7)}_${counter}`;
    }
  }
  return uniqueUsername;
}

export async function POST(request: Request): Promise<NextResponse> {
  let wasNewlyCreated = false;
  await dbConnect();
  console.log("🔵 [API:OAuthSignIn] เชื่อมต่อ MongoDB สำเร็จ");

  try {
    const body = (await request.json()) as OAuthSignInRequestBody;
    const { provider, providerAccountId, email, name, usernameSuggestion, picture } = body;

    console.log(`ℹ️ [API:OAuthSignIn] ได้รับ request จาก provider: ${provider}, providerAccountId: ${providerAccountId}, email: ${email}`);

    if (!provider || !providerAccountId) {
      console.error("❌ [API:OAuthSignIn] ข้อมูลไม่ครบถ้วน: provider หรือ providerAccountId ไม่มีค่า");
      return NextResponse.json(
        { error: "ข้อมูล Provider หรือ Provider Account ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    if (!email && !usernameSuggestion && !name && provider !== "twitter") {
        console.error("❌ [API:OAuthSignIn] ข้อมูลไม่เพียงพอ (ต้องการ email หรือ name/usernameSuggestion)");
        return NextResponse.json(
          { error: "ข้อมูลจาก Provider ไม่เพียงพอ (ต้องการ email หรือ name)" },
          { status: 400 }
        );
    }

    // แก้ไข Type ของ userDocument: เนื่องจาก IUser extends Document, เราสามารถใช้ IUser | null ได้เลย
    let userDocument: IUser | null = await UserModel.findOne({
      "accounts.provider": provider,
      "accounts.providerAccountId": providerAccountId,
    });

    if (userDocument) {
      console.log(`✅ [API:OAuthSignIn] พบผู้ใช้เดิมด้วย ${provider} ID: ${providerAccountId} (Username: ${userDocument.username})`);

      if (!userDocument.isActive) {
        console.warn(`⚠️ [API:OAuthSignIn] บัญชี (เดิม) ไม่ใช้งาน: ${userDocument.username}`);
        return NextResponse.json({ error: "บัญชีนี้ถูกปิดใช้งาน" }, { status: 403 });
      }
      if (userDocument.isBanned) {
        const banMessage = userDocument.bannedUntil ? `บัญชีถูกระงับถึง ${new Date(userDocument.bannedUntil).toLocaleString("th-TH")}` : "บัญชีถูกระงับถาวร";
        console.warn(`⚠️ [API:OAuthSignIn] บัญชี (เดิม) ถูกแบน: ${userDocument.username}`);
        return NextResponse.json({ error: banMessage, banReason: userDocument.banReason }, { status: 403 });
      }

      let updated = false;
      if (email && userDocument.email !== email.toLowerCase()) {
        if (!userDocument.email || !userDocument.isEmailVerified) {
          const existingEmailUser = await UserModel.findOne({ email: email.toLowerCase(), _id: { $ne: userDocument._id } });
          if (!existingEmailUser) {
            userDocument.email = email.toLowerCase();
            userDocument.isEmailVerified = true;
            userDocument.emailVerifiedAt = new Date();
            updated = true;
            console.log(`🔄 [API:OAuthSignIn] อัปเดตอีเมลสำหรับผู้ใช้ ${userDocument.username} เป็น ${email}`);
          } else {
            console.warn(`⚠️ [API:OAuthSignIn] อีเมล ${email} จาก ${provider} ถูกใช้แล้วโดยบัญชีอื่น ไม่สามารถอัปเดตได้`);
          }
        }
      } else if (email && !userDocument.email) {
         const existingEmailUser = await UserModel.findOne({ email: email.toLowerCase(), _id: { $ne: userDocument._id } });
        if (!existingEmailUser) {
          userDocument.email = email.toLowerCase();
          userDocument.isEmailVerified = true;
          userDocument.emailVerifiedAt = new Date();
          updated = true;
          console.log(`➕ [API:OAuthSignIn] เพิ่มอีเมล ${email} ให้กับผู้ใช้ ${userDocument.username}`);
        } else {
            console.warn(`⚠️ [API:OAuthSignIn] อีเมล ${email} จาก ${provider} ถูกใช้แล้วโดยบัญชีอื่น ไม่สามารถเพิ่มได้`);
        }
      }

      if (userDocument.profile) {
          if (name && !userDocument.profile.displayName) {
            userDocument.profile.displayName = name;
            updated = true;
          }
          if (picture && !userDocument.profile.avatarUrl) {
            userDocument.profile.avatarUrl = picture;
            updated = true;
          }
      } else {
          // Mongoose subdocuments (like profile) are automatically initialized
          // if their schema has defaults or they are assigned an object.
          // If profile can be undefined in IUser and the schema doesn't auto-create it,
          // this direct assignment is correct.
          userDocument.profile = {
              displayName: name || undefined,
              avatarUrl: picture || undefined,
              gender: "prefer_not_to_say", // Default
          };
          updated = true;
      }

      userDocument.lastLoginAt = new Date();
      await userDocument.save();
      console.log(`🔄 [API:OAuthSignIn] อัปเดต lastLoginAt ${updated ? 'และข้อมูลอื่นๆ ' : ''}สำหรับผู้ใช้ ${userDocument.username}`);

    } else {
      if (email) {
        const existingUserWithEmail = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUserWithEmail) {
          userDocument = existingUserWithEmail; // existingUserWithEmail is IUser | null
          console.log(`🔗 [API:OAuthSignIn] พบผู้ใช้ด้วยอีเมล ${email} (Username: ${userDocument.username}), กำลังเชื่อมบัญชี ${provider}`);

          if (!userDocument.isActive) return NextResponse.json({ error: "บัญชีที่เชื่อมโยงด้วยอีเมลนี้ถูกปิดใช้งาน" }, { status: 403 });
          if (userDocument.isBanned) return NextResponse.json({ error: "บัญชีที่เชื่อมโยงด้วยอีเมลนี้ถูกระงับ" }, { status: 403 });

          const accountExists = userDocument.accounts.some(
            acc => acc.provider === provider && acc.providerAccountId === providerAccountId
          );

          if (!accountExists) {
            const newAccountObject: IAccount = {
              provider,
              providerAccountId,
              type: "oauth",
            } as IAccount; // Mongoose subdocument array handles this correctly
            userDocument.accounts.push(newAccountObject);

            if (!userDocument.isEmailVerified) {
                userDocument.isEmailVerified = true;
                userDocument.emailVerifiedAt = new Date();
            }
            if (userDocument.profile) {
                if (name && !userDocument.profile.displayName) userDocument.profile.displayName = name;
                if (picture && !userDocument.profile.avatarUrl) userDocument.profile.avatarUrl = picture;
            } else {
                userDocument.profile = { displayName: name || undefined, avatarUrl: picture || undefined, gender: "prefer_not_to_say" };
            }

            userDocument.lastLoginAt = new Date();
            await userDocument.save();
            console.log(`✅ [API:OAuthSignIn] เชื่อมบัญชี ${provider} กับผู้ใช้ ${userDocument.username} สำเร็จ`);
          } else {
            console.log(`ℹ️ [API:OAuthSignIn] บัญชี ${provider} นี้ถูกเชื่อมกับผู้ใช้ ${userDocument.username} อยู่แล้ว`);
            userDocument.lastLoginAt = new Date(); // อัปเดต lastLoginAt แม้ว่าบัญชีจะเชื่อมอยู่แล้ว
            await userDocument.save();
          }
        }
      }

      if (!userDocument) {
        wasNewlyCreated = true;
        console.log(
          `✨ [API:OAuthSignIn] ไม่พบผู้ใช้, กำลังสร้างบัญชีใหม่จาก ${provider} ด้วย email: ${email}, name: ${name}`
        );

        const newUsernameBase =
          usernameSuggestion ||
          (email ? email.split("@")[0] : "") ||
          name?.replace(/\s+/g, "") ||
          `user${Date.now().toString().slice(-6)}`;
        const finalUsername = await generateUniqueUsername(newUsernameBase);

        // สร้างผู้ใช้ใหม่โดยใช้ข้อมูลที่จำเป็นเท่านั้น
        // Schema defaults และ pre-save hook ใน User.ts จะจัดการส่วนที่เหลือทั้งหมด
        // รวมถึงการสร้าง sub-documents, ตั้งค่า default, และดึงข้อมูล Level 1
        const newUserInput = {
          username: finalUsername,
          email: email ? email.toLowerCase() : undefined,
          isEmailVerified: !!email,
          emailVerifiedAt: email ? new Date() : undefined,
          accounts: [{ provider, providerAccountId, type: "oauth" } as IAccount],
          profile: {
            displayName: name || finalUsername,
            avatarUrl: picture || undefined,
          },
          lastLoginAt: new Date(),
          // Mongoose จะใช้ค่า default จาก UserSchema สำหรับ field ที่เหลือทั้งหมด
        };

        if (newUserInput.email) {
          const existingEmailUser = await UserModel.findOne({
            email: newUserInput.email,
          });
          if (existingEmailUser) {
            console.error(`❌ [API:OAuthSignIn] ขณะสร้างผู้ใช้ใหม่ อีเมล ${newUserInput.email} ถูกใช้งานแล้ว (race condition)`);
            return NextResponse.json({ error: `อีเมล ${newUserInput.email} นี้ถูกใช้งานแล้วโดยบัญชีอื่น.` }, { status: 409 });
          }
        }

        // UserModel constructor expects a type compatible with IUser's schema definition.
        // The 'as IUser' cast might be needed if newUserInput isn't perfectly matching or if strict type checking is very high.
        // However, Mongoose is generally flexible.
        userDocument = new UserModel(newUserInput);
        await userDocument.save();
        console.log(`✅ [API:OAuthSignIn] สร้างผู้ใช้ใหม่ ${userDocument.username} จาก ${provider} สำเร็จ`);
      }
    }

    if (!userDocument) {
        console.error("❌ [API:OAuthSignIn] เกิดข้อผิดพลาดร้ายแรง: ไม่สามารถหาหรือสร้าง User document ได้");
        return NextResponse.json({ error: "ไม่สามารถประมวลผลการเข้าสู่ระบบ OAuth ได้" }, { status: 500 });
    }

    // userDocument is of type IUser (which extends Mongoose.Document)
    const plainUserObject = userDocument.toObject<IUser>(); // Convert Mongoose document to plain object

    // Destructure to remove Mongoose-specific or method fields for the response
    const {
        _id: objectId, // Mongoose _id is Types.ObjectId
        accounts: originalAccounts, // This will be an array of plain objects after toObject()
        // Exclude methods defined in IUser that are not part of PlainUserObjectData
        matchPassword, // Example method from IUser that should be excluded
        generateEmailVerificationToken, // Example method
        generatePasswordResetToken, // Example method
        // Exclude fields from mongoose.Document that are not in PlainUserObjectData
        // (Many are handled by Omit<IUser, keyof Document ...> in PlainUserObjectData type)
        __v, // Example version key
        $isNew, // Example Mongoose internal
        // ... any other Mongoose document specific fields or methods not wanted in response
        ...restOfUserObject
    } = plainUserObject;


    const userResponse: OAuthSignInResponseUser = {
      ...(restOfUserObject as PlainUserObjectData), // Cast the rest to ensure it matches
      _id: objectId.toString(), // Convert ObjectId to string for JSON response
      // Ensure accounts are plain objects if they weren't fully converted by toObject() for subdocuments
      accounts: originalAccounts.map(acc => {
          // If IAccount subdocuments have their own toObject, it would have been called.
          // This is a safeguard or explicit conversion if needed.
          const plainAcc = { ...acc };
          // If IAccount has methods or Mongoose specifics, omit them here too.
          // For this example, assume IAccount from toObject() is already plain enough.
          return plainAcc as unknown as IAccount; // Cast to IAccount (plain object version)
      }),
    };

     // ลบ password field เผื่อกรณีที่อาจจะมี (ซึ่งไม่ควรมีใน OAuth user)
    if ('password' in (userResponse as any)) {
        delete (userResponse as any).password;
    }


    console.log(`✅ [API:OAuthSignIn] ส่งข้อมูลผู้ใช้ ${userResponse.username} กลับ (ID: ${userResponse._id})`);
    return NextResponse.json({ user: userResponse }, { status: wasNewlyCreated ? 201 : 200 });

  } catch (error: any) {
    console.error("❌ [API:OAuthSignIn] ข้อผิดพลาด:", error.message, error.stack);
    if (error.code === 11000) { // MongoDB duplicate key error
        const field = Object.keys(error.keyValue)[0];
        const message = `${field === 'email' ? 'อีเมล' : (field === 'username' ? 'ชื่อผู้ใช้' : `ฟิลด์ '${field}'`)} นี้ถูกใช้งานแล้ว`;
        return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการประมวลผล Social Sign-In", details: error.message },
      { status: 500 }
    );
  }
}