// src/backend/services/PurchaseService.ts
// Service สำหรับจัดการลอจิกการซื้อตอนนิยาย

import mongoose, { Types } from 'mongoose';
import EpisodeModel, { IEpisode, EpisodeAccessType } from '../models/Episode';
import NovelModel, { INovel } from '../models/Novel';
import PurchaseModel, { IPurchase, PurchaseItemType, PurchaseStatus } from '../models/Purchase';
import UserModel, { IUser } from '../models/User';
import UserLibraryItemModel, { LibraryItemStatus, LibraryItemType } from '../models/UserLibraryItem';
import EpisodeAccessService from './EpisodeAccessService';
import UserGamificationModel, { IUserGamificationDoc } from '../models/UserGamification';

/**
 * ข้อมูลการซื้อตอนนิยาย
 */
export interface EpisodePurchaseData {
    userId: string;
    episodeId: string;
    novelId?: string;
}

/**
 * ผลลัพธ์การซื้อตอนนิยาย
 */
export interface PurchaseResult {
    success: boolean;
    message?: string;
    purchase?: {
        id: string;
        purchaseReadableId: string;
        amount: number;
        newBalance: number;
    };
    error?: {
        code: string;
        details?: any;
    };
}

/**
 * Service สำหรับจัดการลอจิกการซื้อตอนนิยาย
 */
export class PurchaseService {
    /**
     * ซื้อตอนนิยายด้วยเหรียญ
     * @param purchaseData ข้อมูลการซื้อ
     * @returns ผลลัพธ์การซื้อ
     */
    public static async purchaseEpisode(purchaseData: EpisodePurchaseData): Promise<PurchaseResult> {
        // 1. เริ่ม Transaction เพื่อให้แน่ใจว่าทุกอย่างทำงานสำเร็จทั้งหมดหรือไม่ก็ไม่ทำเลย
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            // 2. ตรวจสอบความถูกต้องของข้อมูล
            if (!mongoose.Types.ObjectId.isValid(purchaseData.userId) ||
                !mongoose.Types.ObjectId.isValid(purchaseData.episodeId)) {
                throw new Error('รหัสผู้ใช้หรือรหัสตอนไม่ถูกต้อง');
            }

            // 3. ตรวจสอบว่าผู้ใช้มีตัวตนอยู่จริง
            const user = await UserModel.findById(purchaseData.userId).session(dbSession);
            if (!user) {
                throw new Error('ไม่พบข้อมูลผู้ใช้');
            }

            // 4. ตรวจสอบว่าตอนมีอยู่จริง
            const episode = await EpisodeModel.findById(purchaseData.episodeId).session(dbSession);
            if (!episode) {
                throw new Error('ไม่พบตอนนิยาย');
            }

            // 5. ดึงข้อมูลนิยายจาก episodeId
            const novelId = purchaseData.novelId || episode.novelId.toString();
            const novel = await NovelModel.findById(novelId).session(dbSession);
            if (!novel) {
                throw new Error('ไม่พบนิยาย');
            }

            // 6. ตรวจสอบว่าตอนที่พบเป็นของนิยายเรื่องนี้จริง
            if (episode.novelId.toString() !== novel._id.toString()) {
                throw new Error('ตอนนี้ไม่ใช่ของนิยายนี้');
            }

            // 7. ตรวจสอบว่าตอนเป็นแบบฟรีหรือไม่ (ไม่ควรซื้อตอนฟรี)
            if (episode.accessType === EpisodeAccessType.FREE) {
                throw new Error('ตอนนี้ฟรี ไม่จำเป็นต้องซื้อ');
            }

            // 8. ตรวจสอบว่าผู้ใช้เคยซื้อตอนนี้ไปแล้วหรือยัง
            const alreadyPurchased = await EpisodeAccessService.hasUserPurchasedEpisode(
                purchaseData.userId,
                purchaseData.episodeId
            );

            if (alreadyPurchased) {
                throw new Error('คุณได้ซื้อตอนนี้ไปแล้ว');
            }

            // 9. คำนวณราคาที่ต้องจ่ายจริง
            const effectivePrice = await episode.getEffectivePrice();
            const originalPrice = await episode.getOriginalPrice();

            // 10. ตรวจสอบว่าผู้ใช้มีเหรียญเพียงพอหรือไม่
            // ดึงข้อมูล wallet จาก UserGamification
            const userGamification = await UserGamificationModel.findOne({ userId: user._id }).session(dbSession);

            if (!userGamification) {
                throw new Error('ไม่พบข้อมูลกระเป๋าเงินของผู้ใช้');
            }

            const userCoinBalance = userGamification.wallet.coinBalance;

            if (userCoinBalance < effectivePrice) {
                throw new Error(`Coins ไม่เพียงพอ คุณมี ${userCoinBalance} Coins แต่ต้องใช้ ${effectivePrice} Coins`);
            }

            // 11. สร้างรายการสั่งซื้อ (Purchase Record)
            const purchase = new PurchaseModel({
                purchaseReadableId: `PUR-EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: user._id,
                items: [{
                    itemId: episode._id,
                    itemType: PurchaseItemType.NOVEL_EPISODE,
                    title: episode.title,
                    description: `ตอนที่ ${episode.episodeOrder}: ${episode.title} (${novel.title})`,
                    quantity: 1,
                    unitPrice: effectivePrice,
                    currency: 'COIN',
                    discountAmount: originalPrice > effectivePrice ? originalPrice - effectivePrice : 0,
                    subtotal: effectivePrice,
                    sellerId: novel.author
                }],
                totalAmount: effectivePrice,
                totalDiscountAmount: originalPrice > effectivePrice ? originalPrice - effectivePrice : 0,
                finalAmount: effectivePrice,
                finalCurrency: 'COIN',
                status: PurchaseStatus.COMPLETED,
                metadata: {
                    novelId: novel._id.toString(),
                    novelTitle: novel.title,
                    episodeTitle: episode.title,
                    episodeOrder: episode.episodeOrder,
                    accessType: episode.accessType
                }
            });

            await purchase.save({ session: dbSession });

            // 12. หักเหรียญจากกระเป๋าผู้ใช้
            userGamification.wallet.coinBalance -= effectivePrice;
            userGamification.wallet.lastCoinTransactionAt = new Date();
            await userGamification.save({ session: dbSession });

            // 13. อัปเดตสถิติของตอน
            episode.stats.purchasesCount += 1;
            await episode.save({ session: dbSession });

            // 14. อัปเดตสถิติของนิยาย
            novel.stats.totalRevenueCoins = (novel.stats.totalRevenueCoins || 0) + effectivePrice;
            novel.stats.purchasesCount = (novel.stats.purchasesCount || 0) + 1;
            await novel.save({ session: dbSession });

            // 15. เพิ่มตอนที่ซื้อเข้าคลังของผู้ใช้
            await this.addEpisodeToUserLibrary(
                user._id.toString(),
                novel._id.toString(),
                episode._id.toString(),
                dbSession
            );

            // 16. Commit Transaction เมื่อทุกอย่างสำเร็จ
            await dbSession.commitTransaction();

            // 17. ส่งผลลัพธ์การซื้อสำเร็จกลับไป
            return {
                success: true,
                message: 'ซื้อตอนสำเร็จ',
                purchase: {
                    id: purchase._id.toString(),
                    purchaseReadableId: purchase.purchaseReadableId,
                    amount: effectivePrice,
                    newBalance: userGamification.wallet.coinBalance
                }
            };

        } catch (error: any) {
            // หากเกิดข้อผิดพลาด ให้ยกเลิก Transaction ทั้งหมด
            await dbSession.abortTransaction();

            return {
                success: false,
                message: error.message || 'เกิดข้อผิดพลาดในการซื้อตอน',
                error: {
                    code: 'PURCHASE_FAILED',
                    details: error
                }
            };
        } finally {
            // สิ้นสุด Session ไม่ว่าจะสำเร็จหรือล้มเหลว
            await dbSession.endSession();
        }
    }

    /**
     * เพิ่มตอนที่ซื้อเข้าคลังของผู้ใช้
     * @param userId ID ของผู้ใช้
     * @param novelId ID ของนิยาย
     * @param episodeId ID ของตอน
     * @param session MongoDB Session (optional)
     */
    private static async addEpisodeToUserLibrary(
        userId: string,
        novelId: string,
        episodeId: string,
        session?: mongoose.ClientSession
    ): Promise<void> {
        try {
            // ค้นหารายการในคลังที่มีอยู่แล้ว
            let libraryItem = await UserLibraryItemModel.findOne({
                userId,
                novelId,
                itemType: LibraryItemType.NOVEL
            }).session(session || null);

            if (libraryItem) {
                // ถ้ามีรายการอยู่แล้ว ให้เพิ่ม episodeId เข้าไปในรายการที่ซื้อ
                if (!libraryItem.purchasedEpisodeIds) {
                    libraryItem.purchasedEpisodeIds = [];
                }

                // ตรวจสอบว่ามี episodeId อยู่แล้วหรือไม่
                const episodeIdObj = new Types.ObjectId(episodeId);
                const hasEpisode = libraryItem.purchasedEpisodeIds.some(id =>
                    id.toString() === episodeIdObj.toString()
                );

                if (!hasEpisode) {
                    (libraryItem.purchasedEpisodeIds as Types.ObjectId[]).push(episodeIdObj);
                }

                // เพิ่มสถานะ OWNED ถ้ายังไม่มี
                if (!libraryItem.statuses.includes(LibraryItemStatus.OWNED)) {
                    libraryItem.statuses.push(LibraryItemStatus.OWNED);
                }

                await libraryItem.save({ session: session || undefined });
            } else {
                // ถ้ายังไม่มีรายการ ให้สร้างใหม่
                libraryItem = new UserLibraryItemModel({
                    userId,
                    novelId,
                    itemType: LibraryItemType.NOVEL,
                    statuses: [LibraryItemStatus.OWNED, LibraryItemStatus.READING],
                    purchasedEpisodeIds: [episodeId],
                    addedAt: new Date(),
                    firstAcquiredAt: new Date(),
                    readingProgress: {}
                });

                await libraryItem.save({ session: session || undefined });
            }
        } catch (error) {
            console.error('Error in addEpisodeToUserLibrary:', error);
            throw error;
        }
    }

    /**
     * ตรวจสอบว่าผู้ใช้มีเหรียญเพียงพอสำหรับซื้อตอนหรือไม่
     * @param userId ID ของผู้ใช้
     * @param episodeId ID ของตอน
     * @returns ผลการตรวจสอบ
     */
    public static async checkUserCanPurchase(userId: string, episodeId: string): Promise<{
        canPurchase: boolean;
        reason?: string;
        currentBalance?: number;
        requiredAmount?: number;
    }> {
        try {
            // ตรวจสอบว่าผู้ใช้มีตัวตนอยู่จริง
            const userGamification = await UserGamificationModel.findOne({ userId });
            if (!userGamification) {
                return { canPurchase: false, reason: 'ไม่พบข้อมูลกระเป๋าเงินของผู้ใช้' };
            }

            // ตรวจสอบว่าตอนมีอยู่จริง
            const episode = await EpisodeModel.findById(episodeId);
            if (!episode) {
                return { canPurchase: false, reason: 'ไม่พบตอนนิยาย' };
            }

            // ตรวจสอบว่าตอนเป็นแบบฟรีหรือไม่
            if (episode.accessType === EpisodeAccessType.FREE) {
                return { canPurchase: false, reason: 'ตอนนี้ฟรี ไม่จำเป็นต้องซื้อ' };
            }

            // ตรวจสอบว่าผู้ใช้เคยซื้อตอนนี้ไปแล้วหรือยัง
            const alreadyPurchased = await EpisodeAccessService.hasUserPurchasedEpisode(userId, episodeId);
            if (alreadyPurchased) {
                return { canPurchase: false, reason: 'คุณได้ซื้อตอนนี้ไปแล้ว' };
            }

            // คำนวณราคาที่ต้องจ่ายจริง
            const effectivePrice = await episode.getEffectivePrice();
            const userCoinBalance = userGamification.wallet.coinBalance;

            // ตรวจสอบว่าผู้ใช้มีเหรียญเพียงพอหรือไม่
            if (userCoinBalance < effectivePrice) {
                return {
                    canPurchase: false,
                    reason: `Coins ไม่เพียงพอ คุณมี ${userCoinBalance} Coins แต่ต้องใช้ ${effectivePrice} Coins`,
                    currentBalance: userCoinBalance,
                    requiredAmount: effectivePrice
                };
            }

            return {
                canPurchase: true,
                currentBalance: userCoinBalance,
                requiredAmount: effectivePrice
            };
        } catch (error) {
            console.error('Error in checkUserCanPurchase:', error);
            return { canPurchase: false, reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
        }
    }
}

export default PurchaseService;

