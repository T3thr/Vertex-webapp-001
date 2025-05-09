// src/app/user/[username]/components/UserSettingsSection.tsx
// คอมโพเนนต์สำหรับการตั้งค่าผู้ใช้

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import debounce from 'lodash.debounce';

// อินเทอร์เฟซสำหรับ props ของคอมโพเนนต์
interface UserSettingsSectionProps {
  userId: string;
}

// อินเทอร์เฟซสำหรับข้อมูลการตั้งค่า
interface UserSettingsData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  novelUpdatesNotifications?: boolean;
  profileVisibility?: 'public' | 'followersOnly' | 'private';
  showActivityStatus?: boolean;
  readingHistoryVisibility?: 'public' | 'followersOnly' | 'private';
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

// ฟังก์ชันตรวจสอบ URL
const isValidUrl = (url: string) => !url || /^https?:\/\/|^\//.test(url);

const UserSettingsSection: React.FC<UserSettingsSectionProps> = ({ userId }) => {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettingsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof UserSettingsData, string>>>({});
  const isOwnProfile = session?.user?.id === userId;

  // ดึงข้อมูลการตั้งค่า
  useEffect(() => {
    if (isOwnProfile) {
      const fetchSettings = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/users/me/settings', {
            cache: 'no-store',
          });
          if (!response.ok) {
            throw new Error('ไม่สามารถดึงข้อมูลการตั้งค่า');
          }
          const data = await response.json();
          setSettings(data.settings || {});
        } catch (err: any) {
          toast.error(err.message || 'ไม่สามารถโหลดการตั้งค่าได้');
        } finally {
          setIsLoading(false);
        }
      };
      fetchSettings();
    }
  }, [isOwnProfile]);

  // ตรวจสอบข้อมูลก่อนอัปเดต
  const validateInput = (name: keyof UserSettingsData, value: any) => {
    if (name === 'displayName' && value && value.length > 100) {
      return 'ชื่อที่แสดงต้องไม่เกิน 100 ตัวอักษร';
    }
    if (name === 'bio' && value && value.length > 500) {
      return 'ประวัติต้องไม่เกิน 500 ตัวอักษร';
    }
    if ((name === 'avatarUrl' || name === 'coverImageUrl') && value && !isValidUrl(value)) {
      return 'URL ไม่ถูกต้อง';
    }
    return '';
  };

  // จัดการการเปลี่ยนแปลงของ input
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    const error = validateInput(name as keyof UserSettingsData, newValue);
    setErrors((prev) => ({ ...prev, [name]: error }));

    setSettings((prev) => ({ ...prev, [name]: newValue }));
  };

  // จัดการการส่งฟอร์ม (debounced)
  const handleSubmit = useCallback(
    debounce(async (settings: UserSettingsData) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/users/me/settings', {
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
        toast.error(err.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
      } finally {
        setIsLoading(false);
      }
    }, 500),
    []
  );

  // ส่งฟอร์ม
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (Object.values(errors).some((error) => error)) {
      toast.error('กรุณาแก้ไขข้อมูลที่ไม่ถูกต้อง');
      return;
    }
    handleSubmit(settings);
  };

  if (!isOwnProfile) return null;

  if (isLoading && !settings.displayName) {
    return (
      <section className="container-custom my-6 animate-pulse">
        <div className="bg-card p-6 rounded-radius-lg shadow-shadow-md">
          <div className="h-8 bg-muted rounded-radius-md w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded-radius-md w-1/2"></div>
            <div className="h-4 bg-muted rounded-radius-md w-3/4"></div>
            <div className="h-4 bg-muted rounded-radius-md w-1/3"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-custom my-8">
      <div className="bg-card p-8 rounded-radius-lg shadow-shadow-lg animate-fadeIn">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">การตั้งค่าผู้ใช้</h2>
        <form onSubmit={onSubmit} className="space-y-8" aria-label="การตั้งค่าผู้ใช้">
          {/* ส่วนข้อมูลโปรไฟล์ */}
          <fieldset className="space-y-6">
            <legend className="text-lg font-medium text-foreground border-b pb-2 mb-4">
              ข้อมูลโปรไฟล์
            </legend>
            {/* ชื่อที่แสดง */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-foreground/80 mb-2">
                  ชื่อที่แสดง
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={settings.displayName || ''}
                  onChange={handleInputChange}
                  className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                  aria-invalid={!!errors.displayName}
                  aria-describedby={errors.displayName ? 'displayName-error' : undefined}
                />
                {errors.displayName && (
                  <p id="displayName-error" className="text-sm text-red-500 mt-2 animate-slideIn">
                    {errors.displayName}
                  </p>
                )}
              </div>
              {/* URL รูปโปรไฟล์ */}
              <div>
                <label htmlFor="avatarUrl" className="block text-sm font-medium text-foreground/80 mb-2">
                  URL รูปโปรไฟล์
                </label>
                <input
                  type="text"
                  id="avatarUrl"
                  name="avatarUrl"
                  value={settings.avatarUrl || ''}
                  onChange={handleInputChange}
                  className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                  aria-invalid={!!errors.avatarUrl}
                  aria-describedby={fieldset.avatarUrl ? 'avatarUrl-error' : undefined}
                />
                {errors.avatarUrl && (
                  <p id="avatarUrl-error" className="text-sm text-red-500 mt-2 animate-slideIn">
                    {errors.avatarUrl}
                  </p>
                )}
              </div>
            </div>
            {/* ประวัติ */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-foreground/80 mb-2">
                ประวัติ
              </label>
              <textarea
                id="bio"
                name="bio"
                value={settings.bio || ''}
                onChange={handleInputChange}
                className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50 resize-y"
                rows={4}
                aria-invalid={!!errors.bio}
                aria-describedby={errors.bio ? 'bio-error' : undefined}
              />
              {errors.bio && (
                <p id="bio-error" className="text-sm text-red-500 mt-2 animate-slideIn">
                  {errors.bio}
                </p>
              )}
            </div>
            {/* URL รูปปก */}
            <div>
              <label htmlFor="coverImageUrl" className="block text-sm font-medium text-foreground/80 mb-2">
                URL รูปปก
              </label>
              <input
                type="text"
                id="coverImageUrl"
               ños="coverImageUrl"
                value={settings.coverImageUrl || ''}
                onChange={handleInputChange}
                className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                aria-invalid={!!errors.coverImageUrl}
                aria-describedby={errors.coverImageUrl ? 'coverImageUrl-error' : undefined}
              />
              {errors.coverImageUrl && (
                <p id="coverImageUrl-error" className="text-sm text-red-500 mt-2 animate-slideIn">
                  {errors.coverImageUrl}
                </p>
              )}
            </div>
          </fieldset>

          {/* การตั้งค่าการแจ้งเตือน */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium text-foreground border-b pb-2 mb-4">
              การตั้งค่าการแจ้งเตือน
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  name="emailNotifications"
                  checked={settings.emailNotifications || false}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-primary focus:ring-primary border-input rounded-radius-sm transition-colors"
                />
                <label htmlFor="emailNotifications" className="text-sm font-medium text-foreground/80">
                  การแจ้งเตือนทางอีเมล
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="pushNotifications"
                  name="pushNotifications"
                  checked={settings.pushNotifications || false}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-primary focus:ring-primary border-input rounded-radius-sm transition-colors"
                />
                <label htmlFor="pushNotifications" className="text-sm font-medium text-foreground/80">
                  การแจ้งเตือนแบบพุช
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="novelUpdatesNotifications"
                  name="novelUpdatesNotifications"
                  checked={settings.novelUpdatesNotifications || false}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-primary focus:ring-primary border-input rounded-radius-sm transition-colors"
                />
                <label htmlFor="novelUpdatesNotifications" className="text-sm font-medium text-foreground/80">
                  การแจ้งเตือนการอัปเดตนิยาย
                </label>
              </div>
            </div>
          </fieldset>

          {/* การตั้งค่าความเป็นส่วนตัว */}
          <fieldset className="space-y-6">
            <legend className="text-lg font-medium text-foreground border-b pb-2 mb-4">
              การตั้งค่าความเป็นส่วนตัว
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="profileVisibility" className="block text-sm font-medium text-foreground/80 mb-2">
                  การมองเห็นโปรไฟล์
                </label>
                <select
                  id="profileVisibility"
                  name="profileVisibility"
                  value={settings.profileVisibility || 'public'}
                  onChange={handleInputChange}
                  className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                >
                  <option value="public">สาธารณะ</option>
                  <option value="followersOnly">เฉพาะผู้ติดตาม</option>
                  <option value="private">ส่วนตัว</option>
                </select>
              </div>
              <div>
                <label htmlFor="readingHistoryVisibility" className="block text-sm font-medium text-foreground/80 mb-2">
                  การมองเห็นประวัติการอ่าน
                </label>
                <select
                  id="readingHistoryVisibility"
                  name="readingHistoryVisibility"
                  value={settings.readingHistoryVisibility || 'public'}
                  onChange={handleInputChange}
                  className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                >
                  <option value="public">สาธารณะ</option>
                  <option value="followersOnly">เฉพาะผู้ติดตาม</option>
                  <option value="private">ส่วนตัว</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showActivityStatus"
                  name="showActivityStatus"
                  checked={settings.showActivityStatus || false}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-primary focus:ring-primary border-input rounded-radius-sm transition-colors"
                />
                <label htmlFor="showActivityStatus" className="text-sm font-medium text-foreground/80">
                  แสดงสถานะกิจกรรม
                </label>
              </div>
            </div>
          </fieldset>

          {/* การตั้งค่าทั่วไป */}
          <fieldset className="space-y-6">
            <legend className="text-lg font-medium text-foreground border-b pb-2 mb-4">
              การตั้งค่าทั่วไป
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-foreground/80 mb-2">
                  ธีม
                </label>
                <select
                  id="theme"
                  name="theme"
                  value={settings.theme || 'system'}
                  onChange={handleInputChange}
                  className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                >
                  <option value="light">สว่าง</option>
                  <option value="dark">มืด</option>
                  <option value="system">ตามระบบ</option>
                </select>
              </div>
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-foreground/80 mb-2">
                  ภาษา
                </label>
                <select
                  id="language"
                  name="language"
                  value={settings.language || 'th'}
                  onChange={handleInputChange}
                  className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground transition-all hover:border-primary/50"
                >
                  <option value="th">ไทย</option>
                  <option value="en">อังกฤษ</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* ปุ่มบันทึก */}
          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={isLoading || Object.values(errors).some((error) => error)}
              className={`px-6 py-3 rounded-radius-md text-sm font-medium transition-all flex items-center space-x-2 ${
                isLoading || Object.values(errors).some((error) => error)
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
              }`}
              aria-disabled={isLoading || Object.values(errors).some((error) => error)}
            >
              {isLoading && <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-primary-foreground rounded-full"></span>}
              <span>{isLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default UserSettingsSection;