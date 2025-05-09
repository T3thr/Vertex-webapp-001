// src/app/user/[username]/components/UserSettingsSection.tsx
"use client";

// นำเข้าโมดูลที่จำเป็นสำหรับการจัดการสถานะ, การยืนยันตัวตน, และการแจ้งเตือน
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

// กำหนด interface สำหรับ props ของคอมโพเนนต์
interface UserSettingsSectionProps {
  userId: string; // ID ของผู้ใช้ที่กำลังดู/แก้ไขการตั้งค่า
}

// กำหนด interface สำหรับข้อมูลการตั้งค่าผู้ใช้
interface UserSettingsData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  // การตั้งค่าการแจ้งเตือน
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  novelUpdatesNotifications?: boolean;
  // การตั้งค่าความเป็นส่วนตัว
  profileVisibility?: 'public' | 'followersOnly' | 'private';
  showActivityStatus?: boolean;
  readingHistoryVisibility?: 'public' | 'followersOnly' | 'private';
}

// คอมโพเนนต์หลักสำหรับการตั้งค่าผู้ใช้
const UserSettingsSection: React.FC<UserSettingsSectionProps> = ({ userId }) => {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettingsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = session?.user?.id === userId;

  // ดึงข้อมูลการตั้งค่าเมื่อเป็นโปรไฟล์ของผู้ใช้เอง
  useEffect(() => {
    if (isOwnProfile) {
      const fetchSettings = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/users/me/settings`, {
            cache: 'no-store', // ป้องกันการแคชเพื่อข้อมูลล่าสุด
          });
          if (!response.ok) {
            throw new Error('ไม่สามารถดึงข้อมูลการตั้งค่า');
          }
          const data = await response.json();
          setSettings(data.settings || {});
        } catch (err: any) {
          setError(err.message || 'ไม่สามารถโหลดการตั้งค่าได้');
        } finally {
          setIsLoading(false);
        }
      };
      fetchSettings();
    }
  }, [isOwnProfile, userId]);

  // จัดการการเปลี่ยนแปลงของ input
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  // จัดการการส่งฟอร์มเพื่อบันทึกการตั้งค่า
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/me/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ไม่สามารถอัปเดตการตั้งค่า');
      }
      toast.success('บันทึกการตั้งค่าสำเร็จ!');
    } catch (err: any) {
      const errorMessage = err.message || 'ไม่สามารถบันทึกการตั้งค่าได้';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ไม่แสดงคอมโพเนนต์หากไม่ใช่โปรไฟล์ของผู้ใช้เอง
  if (!isOwnProfile) {
    return null;
  }

  // แสดงสถานะการโหลดเมื่อเริ่มต้น
  if (isLoading && !settings.displayName) {
    return (
      <div className="p-4 bg-card rounded-lg shadow-md my-4 animate-pulse text-center text-foreground">
        กำลังโหลดการตั้งค่า...
      </div>
    );
  }

  // แสดงข้อผิดพลาดหากโหลดไม่สำเร็จ
  if (error && !settings.displayName) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 rounded-lg shadow-md my-4">
        ข้อผิดพลาด: {error}
      </div>
    );
  }

  return (
    <div className="p-6 bg-card shadow-lg rounded-lg my-6 animate-fadeIn">
      <h2 className="text-2xl font-semibold text-foreground mb-6">การตั้งค่าผู้ใช้</h2>
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ชื่อที่แสดง */}
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-foreground/80 mb-1"
          >
            ชื่อที่แสดง
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={settings.displayName || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground transition-colors"
          />
        </div>

        {/* ประวัติ */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-foreground/80 mb-1"
          >
            ประวัติ
          </label>
          <textarea
            id="bio"
            name="bio"
            value={settings.bio || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground transition-colors resize-y"
            rows={3}
          />
        </div>

        {/* การตั้งค่าการแจ้งเตือน */}
        <h3 className="text-lg font-medium text-foreground mt-6 mb-2 border-b pb-1">
          การตั้งค่าการแจ้งเตือน
        </h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="emailNotifications"
              name="emailNotifications"
              checked={settings.emailNotifications || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
            />
            <label
              htmlFor="emailNotifications"
              className="text-sm text-foreground/80"
            >
              การแจ้งเตือนทางอีเมล
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="pushNotifications"
              name="pushNotifications"
              checked={settings.pushNotifications || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
            />
            <label
              htmlFor="pushNotifications"
              className="text-sm text-foreground/80"
            >
              การแจ้งเตือนแบบพุช (แอป)
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="novelUpdatesNotifications"
              name="novelUpdatesNotifications"
              checked={settings.novelUpdatesNotifications || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
            />
            <label
              htmlFor="novelUpdatesNotifications"
              className="text-sm text-foreground/80"
            >
              การแจ้งเตือนการอัปเดตนิยาย
            </label>
          </div>
        </div>

        {/* การตั้งค่าความเป็นส่วนตัว */}
        <h3 className="text-lg font-medium text-foreground mt-6 mb-2 border-b pb-1">
          การตั้งค่าความเป็นส่วนตัว
        </h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showActivityStatus"
              name="showActivityStatus"
              checked={settings.showActivityStatus || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
            />
            <label
              htmlFor="showActivityStatus"
              className="text-sm text-foreground/80"
            >
              แสดงสถานะกิจกรรม
            </label>
          </div>
          <div>
            <label
              htmlFor="profileVisibility"
              className="block text-sm font-medium text-foreground/80 mb-1"
            >
              การมองเห็นโปรไฟล์
            </label>
            <select
              id="profileVisibility"
              name="profileVisibility"
              value={settings.profileVisibility || 'public'}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground transition-colors"
            >
              <option value="public">สาธารณะ</option>
              <option value="followersOnly">เฉพาะผู้ติดตาม</option>
              <option value="private">ส่วนตัว</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="readingHistoryVisibility"
              className="block text-sm font-medium text-foreground/80 mb-1">
              การมองเห็นประวัติการอ่าน
            </label>
            <select
              id="readingHistoryVisibility"
              name="readingHistoryVisibility"
              value={settings.readingHistoryVisibility || 'public'}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground transition-colors"
            >
              <option value="public">สาธารณะ</option>
              <option value="followersOnly">เฉพาะผู้ติดตาม</option>
              <option value="private">ส่วนตัว</option>
            </select>
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <div className="flex justify-end mt-8">
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isLoading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserSettingsSection;