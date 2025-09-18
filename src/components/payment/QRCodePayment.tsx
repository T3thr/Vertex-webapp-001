'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

export interface QRCodePaymentProps {
  paymentId: string;
  qrData: string;
  amount: number;
  reference: string;
  expiresAt?: Date;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  autoCheckStatus?: boolean;
  checkInterval?: number; // ระยะเวลาในการเช็คสถานะ (มิลลิวินาที)
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'succeeded', // เปลี่ยนจาก 'completed' เป็น 'succeeded' เพื่อให้ตรงกับ backend
  SUCCEEDED = 'succeeded', // เพิ่มเพื่อให้ตรงกับ backend
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export default function QRCodePayment({
  paymentId,
  qrData,
  amount,
  reference,
  expiresAt,
  onSuccess,
  onError,
  onCancel,
  autoCheckStatus = true,
  checkInterval = 5000, // เช็คทุก 5 วินาที
}: QRCodePaymentProps) {
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // คำนวณเวลาที่เหลือสำหรับ QR Code
  useEffect(() => {
    if (expiresAt) {
      const calculateTimeLeft = () => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry.getTime() - now.getTime();
        return diff > 0 ? Math.floor(diff / 1000) : 0;
      };

      setTimeLeft(calculateTimeLeft());

      const timer = setInterval(() => {
        const remaining = calculateTimeLeft();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(timer);
          if (status === PaymentStatus.PENDING) {
            setStatus(PaymentStatus.CANCELLED);
            onError?.('QR Code หมดอายุแล้ว กรุณาสร้างรายการใหม่');
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [expiresAt, status, onError]);

  // เช็คสถานะการชำระเงินอัตโนมัติ
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkPaymentStatus = async () => {
      if (status !== PaymentStatus.PENDING || isChecking) return;

      try {
        setIsChecking(true);
        const response = await fetch(`/api/user/wallet/topup?paymentId=${paymentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'ไม่สามารถตรวจสอบสถานะการชำระเงินได้');
        }

        if ((data.status === PaymentStatus.COMPLETED || data.status === PaymentStatus.SUCCEEDED) && data.processed) {
          setStatus(PaymentStatus.COMPLETED);
          onSuccess?.(data);
          clearInterval(intervalId);
        } else if (data.status === PaymentStatus.FAILED || data.status === PaymentStatus.CANCELLED) {
          setStatus(data.status);
          onError?.(data.status === PaymentStatus.FAILED ? 'การชำระเงินล้มเหลว' : 'การชำระเงินถูกยกเลิก');
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    if (autoCheckStatus && status === PaymentStatus.PENDING) {
      // เช็คสถานะทันทีเมื่อ component โหลด
      checkPaymentStatus();
      
      // ตั้งเวลาเช็คสถานะเป็นระยะ
      intervalId = setInterval(checkPaymentStatus, checkInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentId, status, isChecking, autoCheckStatus, checkInterval, onSuccess, onError]);

  // สำหรับการทดสอบ: จำลองการชำระเงินสำเร็จ
  const simulatePayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/wallet/topup', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ไม่สามารถจำลองการชำระเงินได้');
      }

      setStatus(PaymentStatus.COMPLETED);
      onSuccess?.(data);
      toast.success(`เติมเหรียญสำเร็จ! เพิ่ม ${data.coinAmount} เหรียญเข้ากระเป๋าของคุณแล้ว`);
    } catch (error: any) {
      console.error('Error simulating payment:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการจำลองการชำระเงิน');
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // เช็คสถานะการชำระเงินด้วยตนเอง
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/user/wallet/topup?paymentId=${paymentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ไม่สามารถตรวจสอบสถานะการชำระเงินได้');
      }

      if ((data.status === PaymentStatus.COMPLETED || data.status === PaymentStatus.SUCCEEDED) && data.processed) {
        setStatus(PaymentStatus.COMPLETED);
        onSuccess?.(data);
        toast.success(`เติมเหรียญสำเร็จ! เพิ่ม ${data.coinAmount} เหรียญเข้ากระเป๋าของคุณแล้ว`);
      } else if (data.status === PaymentStatus.FAILED) {
        setStatus(PaymentStatus.FAILED);
        toast.error('การชำระเงินล้มเหลว');
        onError?.('การชำระเงินล้มเหลว');
      } else if (data.status === PaymentStatus.CANCELLED) {
        setStatus(PaymentStatus.CANCELLED);
        toast.error('การชำระเงินถูกยกเลิก');
        onError?.('การชำระเงินถูกยกเลิก');
      } else {
        toast.info('รอการชำระเงิน กรุณาสแกน QR Code เพื่อชำระเงิน');
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสถานะการชำระเงิน');
    } finally {
      setIsLoading(false);
    }
  };

  // แสดงเวลาที่เหลือในรูปแบบ mm:ss
  const formatTimeLeft = () => {
    if (timeLeft === null) return '';
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">สแกนเพื่อชำระเงิน</CardTitle>
        <CardDescription className="text-center">
          สแกน QR Code นี้ด้วยแอปธนาคารหรือแอปชำระเงินของคุณ
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {status === PaymentStatus.PENDING && (
          <>
            <div className="bg-white p-4 rounded-lg w-64 h-64 flex items-center justify-center">
              {/* ใช้ Image component เพื่อแสดง QR code จาก data URL */}
              {qrData && qrData.startsWith('data:') ? (
                <Image 
                  src={qrData} 
                  width={192} 
                  height={192} 
                  alt="QR Code สำหรับชำระเงิน"
                />
              ) : (
                <QRCodeSVG 
                  value={qrData || ''} 
                  size={192} 
                  bgColor={"#ffffff"} 
                  fgColor={"#000000"} 
                  level={"M"} 
                  includeMargin={true} 
                />
              )}
            </div>
            
            <div className="text-center">
              <p className="font-semibold">ยอดชำระ: {amount.toLocaleString()} บาท</p>
              <p className="text-sm text-muted-foreground">รหัสอ้างอิง: {reference}</p>
              {timeLeft !== null && (
                <p className={`mt-2 font-medium ${timeLeft < 60 ? 'text-destructive' : ''}`}>
                  หมดอายุใน: {formatTimeLeft()}
                </p>
              )}
            </div>
          </>
        )}

        {status === PaymentStatus.COMPLETED && (
          <div className="flex flex-col items-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold">ชำระเงินสำเร็จ</h3>
            <p className="text-center text-muted-foreground mt-2">
              การชำระเงินของคุณเสร็จสมบูรณ์แล้ว
            </p>
          </div>
        )}

        {(status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) && (
          <div className="flex flex-col items-center py-8">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h3 className="text-xl font-semibold">
              {status === PaymentStatus.FAILED ? 'การชำระเงินล้มเหลว' : 'การชำระเงินถูกยกเลิก'}
            </h3>
            <p className="text-center text-muted-foreground mt-2">
              {status === PaymentStatus.FAILED
                ? 'เกิดข้อผิดพลาดในการชำระเงิน กรุณาลองใหม่อีกครั้ง'
                : 'การชำระเงินถูกยกเลิกหรือหมดเวลา'}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {status === PaymentStatus.PENDING && (
          <>
                          <Button
                onClick={checkStatus}
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                ตรวจสอบสถานะการชำระเงิน
              </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button
                onClick={simulatePayment}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                จำลองการชำระเงิน (เฉพาะโหมดพัฒนา)
              </Button>
            )}
            
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full text-destructive"
              disabled={isLoading}
            >
              ยกเลิก
            </Button>
          </>
        )}

        {(status === PaymentStatus.COMPLETED || 
          status === PaymentStatus.FAILED || 
          status === PaymentStatus.CANCELLED) && (
          <Button
            onClick={onCancel}
            className="w-full"
          >
            {status === PaymentStatus.COMPLETED ? 'ปิด' : 'ลองใหม่'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
