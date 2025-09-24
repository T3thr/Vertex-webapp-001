'use client';

import { BoardType } from '@/backend/models/BoardClientSide';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewProblemPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [problemType, setProblemType] = useState<'QUESTION' | 'BUG_REPORT'>('QUESTION');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // สร้างปัญหาใหม่
  const createProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      setError('กรุณาเข้าสู่ระบบก่อนสร้างปัญหา');
      return;
    }
    
    if (!title.trim() || title.trim().length < 5) {
      setError('กรุณาระบุหัวข้อปัญหาอย่างน้อย 5 ตัวอักษร');
      return;
    }
    
    if (!content.trim() || content.trim().length < 10) {
      setError('กรุณาอธิบายรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/board/create?sourceType=problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          boardType: problemType === 'QUESTION' ? BoardType.QUESTION : BoardType.BUG_REPORT,
          sourceType: 'problem', // เพิ่มการระบุ sourceType เพื่อให้รู้ว่ากระทู้นี้สร้างจากปุ่มปัญหา
          tags: problemType === 'QUESTION' ? ['คำถาม'] : ['รายงานบัก'],
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // สร้างปัญหาสำเร็จ นำทางไปยังหน้าปัญหา
        router.push('/board/problems');
      } else {
        setError(data.error || 'ไม่สามารถสร้างปัญหาได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้างปัญหา');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">กรุณาเข้าสู่ระบบ</h1>
        <p className="mb-4">คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถสร้างปัญหาได้</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center px-4 py-2 bg-[#8bc34a] text-white rounded-full hover:bg-[#7baf41] transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link
          href="/board/problems"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-[#8bc34a] transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>กลับไปหน้าปัญหา</span>
        </Link>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h1 className="text-2xl font-bold mb-6">สร้างปัญหาใหม่</h1>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={createProblem}>
          {/* ประเภทปัญหา */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">ประเภทปัญหา</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="problemType"
                  value="QUESTION"
                  checked={problemType === 'QUESTION'}
                  onChange={() => setProblemType('QUESTION')}
                  className="mr-2"
                />
                คำถามทั่วไป
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="problemType"
                  value="BUG_REPORT"
                  checked={problemType === 'BUG_REPORT'}
                  onChange={() => setProblemType('BUG_REPORT')}
                  className="mr-2"
                />
                รายงานข้อผิดพลาด
              </label>
            </div>
          </div>
          
          {/* หัวข้อปัญหา */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              หัวข้อปัญหา
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={problemType === 'QUESTION' ? "เขียนคำถามของคุณ" : "เขียนหัวข้อรายงานข้อผิดพลาด"}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bc34a] focus:border-[#8bc34a] bg-background text-foreground"
              required
            />
          </div>
          
          {/* รายละเอียดปัญหา */}
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              รายละเอียดปัญหา
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={problemType === 'QUESTION' 
                ? "อธิบายคำถามของคุณอย่างละเอียด..." 
                : "อธิบายข้อผิดพลาดที่พบ ขั้นตอนการทำซ้ำ และผลที่คาดหวัง..."
              }
              rows={8}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bc34a] focus:border-[#8bc34a] bg-background text-foreground"
              required
            />
          </div>
          
          {/* ปุ่มส่ง */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#8bc34a] text-white rounded-md hover:bg-[#7baf41] transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? 'กำลังบันทึก...' : 'โพสต์ปัญหา'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
