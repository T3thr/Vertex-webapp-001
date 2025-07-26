import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/backend/lib/mongodb";
import UserModel from "@/backend/models/User";
import UserGamificationModel from "@/backend/models/UserGamification";
import mongoose from "mongoose";

// ==================================================================================================
// SECTION: July 2025 Login Bonus API
// ==================================================================================================

/**
 * GET - Check if user is eligible for July 2025 bonus
 * Returns eligibility status and claim status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    await dbConnect();

    // ดึงข้อมูลผู้ใช้
    const user = await UserModel.findById(session.user.id)
      .select('createdAt')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // ตรวจสอบว่าสร้างบัญชีในเดือน July 2025 หรือไม่
    const accountCreatedAt = new Date(user.createdAt);
    const julyStart = new Date('2025-07-01T00:00:00.000Z');
    const julyEnd = new Date('2025-07-31T23:59:59.999Z');
    
    const isEligible = accountCreatedAt >= julyStart && accountCreatedAt <= julyEnd;

    if (!isEligible) {
      return NextResponse.json({
        eligible: false,
        message: 'บัญชีของคุณไม่ได้สร้างในเดือน July 2025'
      });
    }

    // ตรวจสอบสถานะการรับโบนัส
    const userGamification = await UserGamificationModel.findOne({ userId: session.user.id })
      .select('wallet.julyBonusClaimed')
      .lean();

    const alreadyClaimed = userGamification?.wallet?.julyBonusClaimed || false;

    return NextResponse.json({
      eligible: true,
      alreadyClaimed,
      bonusAmount: 30,
      message: alreadyClaimed 
        ? 'คุณได้รับโบนัส July 2025 แล้ว' 
        : 'คุณสามารถรับโบนัส 30 เหรียญได้!'
    });

  } catch (error) {
    console.error('❌ [API GET July Bonus] Error checking bonus eligibility:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' },
      { status: 500 }
    );
  }
}

/**
 * POST - Claim July 2025 bonus coins
 * Awards 30 coins to eligible users who haven't claimed yet
 */
export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    await dbConnect();
    session.startTransaction();

    // ดึงข้อมูลผู้ใช้
    const user = await UserModel.findById(authSession.user.id)
      .select('createdAt')
      .session(session)
      .lean();

    if (!user) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    // ตรวจสอบสิทธิ์ (สร้างบัญชีในเดือน July 2025)
    const accountCreatedAt = new Date(user.createdAt);
    const julyStart = new Date('2025-07-01T00:00:00.000Z');
    const julyEnd = new Date('2025-07-31T23:59:59.999Z');
    
    const isEligible = accountCreatedAt >= julyStart && accountCreatedAt <= julyEnd;

    if (!isEligible) {
      await session.abortTransaction();
      return NextResponse.json({
        error: 'คุณไม่มีสิทธิ์รับโบนัสนี้',
        message: 'เฉพาะผู้ใช้ที่สร้างบัญชีในเดือน July 2025 เท่านั้น'
      }, { status: 403 });
    }

    // ตรวจสอบว่าได้รับโบนัสแล้วหรือไม่
    const userGamification = await UserGamificationModel.findOne({ userId: authSession.user.id })
      .session(session);

    if (!userGamification) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'ไม่พบข้อมูล Gamification ของผู้ใช้' }, { status: 404 });
    }

    if (userGamification.wallet.julyBonusClaimed) {
      await session.abortTransaction();
      return NextResponse.json({
        error: 'คุณได้รับโบนัสนี้แล้ว',
        message: 'ไม่สามารถรับโบนัส July 2025 ซ้ำได้'
      }, { status: 409 });
    }

    // อัปเดตเหรียญและสถานะการรับโบนัส
    const bonusAmount = 30;
    const updatedGamification = await UserGamificationModel.findOneAndUpdate(
      { userId: authSession.user.id },
      {
        $inc: { 'wallet.coinBalance': bonusAmount },
        $set: { 
          'wallet.julyBonusClaimed': true,
          'wallet.lastCoinTransactionAt': new Date()
        }
      },
      { 
        new: true, 
        session,
        runValidators: true 
      }
    );

    if (!updatedGamification) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'ไม่สามารถอัปเดตข้อมูลได้' }, { status: 500 });
    }

    await session.commitTransaction();

    console.log(`✅ [July Bonus] User ${authSession.user.id} claimed ${bonusAmount} coins. New balance: ${updatedGamification.wallet.coinBalance}`);

    return NextResponse.json({
      success: true,
      message: `รับโบนัส ${bonusAmount} เหรียญสำเร็จ!`,
      bonusAmount,
      newCoinBalance: updatedGamification.wallet.coinBalance,
      claimedAt: new Date().toISOString()
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ [API POST July Bonus] Error claiming bonus:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการรับโบนัส' },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
