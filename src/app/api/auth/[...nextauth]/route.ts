import NextAuth from "next-auth";
import { authOptions } from "./options";

/**
 * ไฟล์นี้เป็นจุดเริ่มต้นของ Next-Auth Route Handler
 * รับผิดชอบในการจัดการการร้องขอ authentication จาก client
 * 
 * GET: สำหรับตรวจสอบสถานะการเข้าสู่ระบบและการดึงข้อมูล session
 * POST: สำหรับเข้าสู่ระบบและสร้าง session
 */

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };