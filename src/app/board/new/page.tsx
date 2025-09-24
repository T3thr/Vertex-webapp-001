'use client';

import { BoardType } from '@/backend/models/BoardClientSide';
import { AlertCircle, ArrowLeft, Check, Image, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NewBoardPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    boardType: BoardType.DISCUSSION,
    categoryAssociatedId: '', // จะถูกตั้งค่าหลังจากโหลดหมวดหมู่
    tags: '',
    containsSpoilers: false,
  });

  // โหลดหมวดหมู่
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/board/categories');
        const data = await response.json();
        
        if (data.success && data.categories.length > 0) {
          setCategories(data.categories);
          // ตั้งค่าหมวดหมู่แรกเป็นค่าเริ่มต้น
          setFormData(prev => ({
            ...prev,
            categoryAssociatedId: data.categories[0]._id
          }));
        } else {
          // ถ้าไม่มีหมวดหมู่ ให้ใช้หมวดหมู่เริ่มต้น (ไม่ส่ง categoryAssociatedId)
          setCategories(defaultCategories);
          setFormData(prev => ({
            ...prev,
            categoryAssociatedId: '' // ให้ service สร้างหมวดหมู่เริ่มต้นเอง
          }));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        // ใช้หมวดหมู่เริ่มต้น (ไม่ส่ง categoryAssociatedId)
        setCategories(defaultCategories);
        setFormData(prev => ({
          ...prev,
          categoryAssociatedId: '' // ให้ service สร้างหมวดหมู่เริ่มต้นเอง
        }));
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // ตรวจสอบการล็อกอิน
  if (status === 'loading' || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-alert-error p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-alert-error-foreground mt-1" size={20} />
          <div>
            <h3 className="font-medium text-alert-error-foreground">กรุณาเข้าสู่ระบบ</h3>
            <p className="text-sm">คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถสร้างกระทู้ใหม่ได้</p>
            <Link href="/signin" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ฟังก์ชันจัดการการเปลี่ยนแปลงข้อมูลฟอร์ม
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ฟังก์ชันจัดการการเปลี่ยนแปลง checkbox
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // ฟังก์ชันส่งข้อมูลฟอร์ม
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // แปลงแท็กจากข้อความเป็นอาร์เรย์
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim().toLowerCase())
        : [];

      // สร้างข้อมูลที่จะส่ง
      const requestData: any = {
        title: formData.title,
        content: formData.content,
        boardType: formData.boardType,
        tags: tagsArray,
        containsSpoilers: formData.containsSpoilers,
      };

      // ส่ง categoryAssociatedId เฉพาะเมื่อมีค่าและเป็น ObjectId ที่ถูกต้อง
      if (formData.categoryAssociatedId && formData.categoryAssociatedId.length === 24) {
        requestData.categoryAssociatedId = formData.categoryAssociatedId;
      }

      // ส่งข้อมูลไปยัง API
      const response = await fetch('/api/board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างกระทู้');
      }

      setSuccess('สร้างกระทู้สำเร็จ กำลังนำคุณไปยังหน้ากระทู้...');
      
      // รีเดเร็คไปยังหน้ากระทู้ทันทีหลังจากสร้างสำเร็จ
      router.push('/board');
    } catch (error: any) {
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้างกระทู้');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ประเภทของกระทู้
  const boardTypes = [
    { value: BoardType.DISCUSSION, label: 'พูดคุยทั่วไป' },
    { value: BoardType.QUESTION, label: 'คำถาม' },
    { value: BoardType.REVIEW, label: 'รีวิว' },
    { value: BoardType.GUIDE, label: 'แนะนำ/สอน' },
    { value: BoardType.FAN_CREATION, label: 'ผลงานแฟน' },
    { value: BoardType.THEORY_CRAFTING, label: 'ทฤษฎี' },
    { value: BoardType.BUG_REPORT, label: 'รายงานปัญหา' },
  ];

  // หมวดหมู่เริ่มต้น (จะถูกแทนที่ด้วยข้อมูลจาก API)
  const defaultCategories = [
    { id: 'general', name: 'พูดคุยทั่วไป' },
    { id: 'reviews', name: 'รีวิวนิยาย' },
    { id: 'questions', name: 'ถาม-ตอบปัญหา' },
    { id: 'recommendations', name: 'แนะนำนิยาย' },
    { id: 'writing', name: 'เทคนิคการเขียน' },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* หัวข้อและปุ่มย้อนกลับ */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">สร้างกระทู้ใหม่</h1>
        <Link
          href="/board"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>กลับไปยังหน้ากระทู้</span>
        </Link>
      </div>

      {/* แสดงข้อความแจ้งเตือน */}
      {error && (
        <div className="bg-alert-error p-4 rounded-lg flex items-start gap-3 mb-6">
          <AlertCircle className="text-alert-error-foreground mt-1" size={20} />
          <div>
            <h3 className="font-medium text-alert-error-foreground">เกิดข้อผิดพลาด</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-alert-success p-4 rounded-lg flex items-start gap-3 mb-6">
          <Check className="text-alert-success-foreground mt-1" size={20} />
          <div>
            <h3 className="font-medium text-alert-success-foreground">สำเร็จ</h3>
            <p className="text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* ฟอร์มสร้างกระทู้ใหม่ */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* หัวข้อกระทู้ */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1 text-foreground">
            หัวข้อกระทู้ <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            minLength={5}
            maxLength={200}
            placeholder="ระบุหัวข้อกระทู้ (5-200 ตัวอักษร)"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        {/* ประเภทกระทู้ */}
        <div>
          <label htmlFor="boardType" className="block text-sm font-medium mb-1 text-foreground">
            ประเภทกระทู้ <span className="text-destructive">*</span>
          </label>
          <select
            id="boardType"
            name="boardType"
            value={formData.boardType}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          >
            {boardTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* หมวดหมู่ */}
        <div>
          <label htmlFor="categoryAssociatedId" className="block text-sm font-medium mb-1 text-foreground">
            หมวดหมู่ <span className="text-destructive">*</span>
          </label>
          <select
            id="categoryAssociatedId"
            name="categoryAssociatedId"
            value={formData.categoryAssociatedId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* เนื้อหากระทู้ */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-1 text-foreground">
            เนื้อหากระทู้ <span className="text-destructive">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            minLength={10}
            rows={10}
            placeholder="เขียนเนื้อหากระทู้ของคุณที่นี่ (อย่างน้อย 10 ตัวอักษร)"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-vertical"
          ></textarea>
        </div>

        {/* แท็ก */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium mb-1 text-foreground">
            แท็ก (คั่นด้วยเครื่องหมายคอมม่า)
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="เช่น: นิยาย, แฟนตาซี, รีวิว"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
          <p className="text-xs text-muted-foreground mt-1">
            ใส่แท็กเพื่อให้ผู้อื่นค้นหากระทู้ของคุณได้ง่ายขึ้น
          </p>
        </div>

        {/* ตัวเลือกเพิ่มเติม */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="containsSpoilers"
            name="containsSpoilers"
            checked={formData.containsSpoilers}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-primary border-border rounded focus:ring-primary focus:ring-2 bg-background"
          />
          <label htmlFor="containsSpoilers" className="ml-2 block text-sm text-foreground">
            กระทู้นี้มีสปอยล์
          </label>
        </div>

        {/* ปุ่มแนบรูปภาพ (จะพัฒนาในอนาคต) */}
        <div className="border border-dashed border-border rounded-md p-6 text-center bg-muted/20">
          <div className="flex flex-col items-center">
            <Image size={24} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              แนบรูปภาพ (ยังไม่รองรับในขณะนี้)
            </p>
          </div>
        </div>

        {/* คำแนะนำการโพสต์ */}
        <div className="bg-secondary/50 p-4 rounded-md flex items-start gap-3">
          <Info size={20} className="text-muted-foreground mt-1" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">คำแนะนำในการโพสต์กระทู้</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>ตั้งชื่อกระทู้ที่ตรงประเด็นและเข้าใจง่าย</li>
              <li>หากมีสปอยล์ กรุณาทำเครื่องหมายว่ามีสปอยล์</li>
              <li>โปรดใช้ภาษาที่สุภาพและเคารพผู้อื่น</li>
              <li>ไม่โพสต์เนื้อหาที่ผิดกฎหมายหรือละเมิดลิขสิทธิ์</li>
            </ul>
          </div>
        </div>

        {/* ปุ่มส่งฟอร์ม */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'กำลังสร้างกระทู้...' : 'สร้างกระทู้ใหม่'}
          </button>
        </div>
      </form>
    </main>
  );
}
