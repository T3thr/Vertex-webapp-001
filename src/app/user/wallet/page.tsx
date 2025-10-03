'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, QrCode, CreditCard, ArrowRight, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import QRCodePayment from '@/components/payment/QRCodePayment';

// ข้อมูลแพ็คเกจเหรียญที่มีให้เลือก
const coinPackages = [
  { id: 'coin-20', amount: 20, price: 20, popular: false },
  { id: 'coin-50', amount: 50, price: 50, popular: false },
  { id: 'coin-100', amount: 100, price: 100, popular: true },
  { id: 'coin-250', amount: 250, price: 250, popular: false },
  { id: 'coin-500', amount: 500, price: 500, popular: false },
  { id: 'coin-custom', amount: 0, price: 0, popular: false, isCustom: true },
];

interface WalletData {
  coinBalance: number;
  lastCoinTransactionAt?: Date;
}

export default function WalletPage() {
  const { data: session } = useSession();
  const [selectedPackage, setSelectedPackage] = useState<typeof coinPackages[0] | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData>({ coinBalance: 0 });
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    qrData: string;
    reference: string;
    expiresAt?: Date;
  } | null>(null);

  // ดึงข้อมูลกระเป๋าเงินจาก API
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!session?.user?.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/wallet');
        
        if (!response.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลกระเป๋าเงินได้');
        }
        
        const data = await response.json();
        setWalletData({
          coinBalance: data.coinBalance || 0,
          lastCoinTransactionAt: data.lastCoinTransactionAt ? new Date(data.lastCoinTransactionAt) : undefined
        });
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        toast.error('ไม่สามารถดึงข้อมูลกระเป๋าเงินได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWalletData();
  }, [session]);

  // จัดการการเลือกแพ็คเกจ
  const handleSelectPackage = (pkg: typeof coinPackages[0]) => {
    if (pkg.isCustom) {
      setSelectedPackage({ ...pkg, amount: parseInt(customAmount) || 0, price: parseInt(customAmount) || 0 });
    } else {
      setSelectedPackage(pkg);
    }
  };

  // จัดการการเปลี่ยนแปลงจำนวนเหรียญที่ต้องการเติมแบบกำหนดเอง
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    if (selectedPackage?.isCustom) {
      setSelectedPackage({
        ...selectedPackage,
        amount: parseInt(value) || 0,
        price: parseInt(value) || 0
      });
    }
  };

  // จัดการการชำระเงิน
  const handleProceedToPayment = async () => {
    if (!session?.user?.id) {
      toast.error('กรุณาเข้าสู่ระบบก่อนทำรายการ');
      return;
    }
    
    if (!selectedPackage || selectedPackage.amount <= 0) {
      toast.error('กรุณาเลือกจำนวนเหรียญที่ต้องการเติม');
      return;
    }
    
    setIsProcessing(true);

    try {
      const successUrl = `${window.location.origin}/user/wallet?payment_status=success`;
      const cancelUrl = `${window.location.origin}/user/wallet?payment_status=cancelled`;

      // ถ้าเป็นแพ็คเกจเหรียญมาตรฐาน (ไม่ใช่กำหนดเอง) ให้ใช้ Stripe Checkout Session
      if (!selectedPackage.isCustom) {
        console.log('Initiating Stripe Checkout Session...');
        const response = await fetch('/api/user/wallet/topup/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: selectedPackage.price,
            description: `เติม ${selectedPackage.amount} เหรียญ`,
            metadata: {
              coinAmount: selectedPackage.amount,
            },
            successUrl,
            cancelUrl,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'ไม่สามารถสร้างรายการ Stripe Checkout ได้');
        }

        // Redirect ไปยัง Stripe Checkout Page
        window.location.href = data.url;
        return; // ออกจากฟังก์ชันหลังจาก redirect
      } else {
        // สำหรับแพ็คเกจกำหนดเอง: ใช้ QR Code Payment Flow เดิม
        console.log('Initiating QR Code Payment Flow...');
        const response = await fetch('/api/user/wallet/topup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: selectedPackage.amount,
            paymentAmount: selectedPackage.price,
            description: `เติม ${selectedPackage.amount} เหรียญ`
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'ไม่สามารถสร้างรายการชำระเงินได้');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'ไม่สามารถสร้างรายการชำระเงินได้');
        }
        
        // เก็บข้อมูลการชำระเงินและแสดง QR Code
        setPaymentData({
          paymentId: data.paymentId,
          qrData: data.qrData,
          reference: data.reference,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
        });
        
        setShowQRDialog(true);
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการดำเนินการชำระเงิน');
    } finally {
      setIsProcessing(false);
    }
  };

  // จัดการเมื่อการชำระเงินสำเร็จ
  const handlePaymentSuccess = (data: any) => {
    // อัปเดตยอดเหรียญในกระเป๋า
    setWalletData(prev => ({
      ...prev,
      coinBalance: (prev.coinBalance || 0) + selectedPackage!.amount,
      lastCoinTransactionAt: new Date()
    }));
    
    setTimeout(() => {
      setShowQRDialog(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">กระเป๋าเงินของฉัน</h1>
      
      {/* แสดงยอดเงินปัจจุบัน */}
      <Card className="mb-8 bg-gradient-to-r from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/30 border-yellow-200 dark:border-yellow-900/50">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            ยอดเหรียญปัจจุบัน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
          ) : (
            <>
              <div className="flex items-center">
                <span className="text-4xl font-bold text-yellow-600 dark:text-yellow-500">{walletData.coinBalance}</span>
                <Coins className="h-6 w-6 ml-2 text-yellow-600 dark:text-yellow-500" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">ใช้เหรียญเพื่อซื้อตอนนิยายและสนับสนุนนักเขียน</p>
              {walletData.lastCoinTransactionAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  อัปเดตล่าสุด: {new Date(walletData.lastCoinTransactionAt).toLocaleString('th-TH')}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {/* ส่วนเติมเหรียญ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">เติมเหรียญ</CardTitle>
          <CardDescription>เลือกจำนวนเหรียญที่ต้องการเติม</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* แถวที่ 1: 20, 50, 100 เหรียญ */}
            {coinPackages.slice(0, 3).map((pkg) => (
              <Card 
                key={pkg.id}
                className={`cursor-pointer transition-all ${
                  selectedPackage?.id === pkg.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelectPackage(pkg)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-bold flex justify-center items-center gap-1">
                    {pkg.amount} <Coins className="h-4 w-4" />
                  </div>
                  <div className="mt-2 text-sm">{pkg.price} บาท</div>
                  {pkg.popular && (
                    <div className="mt-2 text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full inline-block">
                      ยอดนิยม
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {/* แถวที่ 2: 250, 500, กำหนดเอง */}
            {coinPackages.slice(3).map((pkg) => (
              <Card 
                key={pkg.id}
                className={`cursor-pointer transition-all ${
                  selectedPackage?.id === pkg.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelectPackage(pkg)}
              >
                <CardContent className="p-4 text-center">
                  {pkg.isCustom ? (
                    <>
                      <div className="text-xl font-bold">กำหนดเอง</div>
                      <Input 
                        type="text" 
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 text-center"
                        placeholder="จำนวนเหรียญ"
                      />
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold flex justify-center items-center gap-1">
                        {pkg.amount} <Coins className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-sm">{pkg.price} บาท</div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleProceedToPayment}
            disabled={isProcessing || !selectedPackage || selectedPackage.amount <= 0}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                ดำเนินการต่อ <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Dialog สำหรับแสดง QR Code */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          {paymentData ? (
            <QRCodePayment
              paymentId={paymentData.paymentId}
              qrData={paymentData.qrData}
              amount={selectedPackage?.price || 0}
              reference={paymentData.reference}
              expiresAt={paymentData.expiresAt}
              onSuccess={handlePaymentSuccess}
              onError={(error) => toast.error(error)}
              onCancel={() => setShowQRDialog(false)}
              autoCheckStatus={true}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>กำลังสร้าง QR Code...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}