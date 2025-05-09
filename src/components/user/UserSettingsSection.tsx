// src/app/user/[username]/components/UserSettingsSection.tsx
// คอมโพเนนต์สำหรับการตั้งค่าผู้ใช้

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

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

// ฟังก์ชัน debounce แบบกำหนดเอง
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const UserSettingsSection: React.FC<UserSettingsSectionProps> = ({ userId }) => {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettingsData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof UserSettingsData, string>>>({});
  const [expandedSections, setExpandedSections] = useState({
    profile: true,
    notifications: true,
    privacy: true,
    general: true,
  });
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

  // จัดการการสลับส่วนที่ขยาย
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
      <div className="p-6 bg-card rounded-radius-lg shadow-shadow-md my-4 animate-pulse">
        <div className="h-6 bg-muted rounded-radius-md w-1/4 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded-radius-md w-1/2"></div>
          <div className="h-4 bg-muted rounded-radius-md w-3/4"></div>
          <div className="h-4 bg-muted rounded-radius-md w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="bg-card shadow-shadow-lg rounded-radius-lg p-6 md:p-8 animate-fadeIn">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
          การตั้งค่าผู้ใช้
        </h2>
        <form onSubmit={onSubmit} className="space-y-6" aria-label="การตั้งค่าผู้ใช้">
          {/* ส่วนโปรไฟล์ */}
          <section className="border-b border-border pb-4">
            <button
              type="button"
              onClick={() => toggleSection('profile')}
              className="flex items-center justify-between w-full text-lg font-medium text-foreground mb-2 transition-colors hover:text-primary"
              aria-expanded={expandedSections.profile}
              aria-controls="profile-settings"
            >
              <span>ข้อมูลโปรไฟล์</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedSections.profile ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.profile && (
              <div id="profile-settings" className="space-y-4 animate-slideIn">
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
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                    aria-invalid={!!errors.displayName}
                    aria-describedby={errors.displayName ? 'displayName-error' : undefined}
                  />
                  {errors.displayName && (
                    <p id="displayName-error" className="text-sm text-red-500 mt-1">
                      {errors.displayName}
                    </p>
                  )}
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
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                    rows={4}
                    aria-invalid={!!errors.bio}
                    aria-describedby={errors.bio ? 'bio-error' : undefined}
                  />
                  {errors.bio && (
                    <p id="bio-error" className="text-sm text-red-500 mt-1">{errors.bio}</p>
                  )}
                </div>
                {/* URL รูปโปรไฟล์ */}
                <div>
                  <label
                    htmlFor="avatarUrl"
                    className="block text-sm font-medium text-foreground/80 mb-1"
                  >
                    URL รูปโปรไฟล์
                  </label>
                  <input
                    type="text"
                    id="avatarUrl"
                    name="avatarUrl"
                    value={settings.avatarUrl || ''}
                    onChange={handleInputChange}
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                    aria-invalid={!!errors.avatarUrl}
                    aria-describedby={errors.avatarUrl ? 'avatarUrl-error' : undefined}
                  />
                  {errors.avatarUrl && (
                    <p id="avatarUrl-error" className="text-sm text-red-500 mt-1">
                      {errors.avatarUrl}
                    </p>
                  )}
                </div>
                {/* URL รูปปก */}
                <div>
                  <label
                    htmlFor="coverImageUrl"
                    className="block text-sm font-medium text-foreground/80 mb-1"
                  >
                    URL รูปปก
                  </label>
                  <input
                    type="text"
                    id="coverImageUrl"
                    name="coverImageUrl"
                    value={settings.coverImageUrl || ''}
                    onChange={handleInputChange}
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                    aria-invalid={!!errors.coverImageUrl}
                    aria-describedby={errors.coverImageUrl ? 'coverImageUrl-error' : undefined}
                  />
                  {errors.coverImageUrl && (
                    <p id="coverImageUrl-error" className="text-sm text-red-500 mt-1">
                      {errors.coverImageUrl}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ส่วนการแจ้งเตือน */}
          <section className="border-b border-border pb-4">
            <button
              type="button"
              onClick={() => toggleSection('notifications')}
              className="flex items-center justify-between w-full text-lg font-medium text-foreground mb-2 transition-colors hover:text-primary"
              aria-expanded={expandedSections.notifications}
              aria-controls="notification-settings"
            >
              <span>การตั้งค่าการแจ้งเตือน</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedSections.notifications ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.notifications && (
              <div id="notification-settings" className="space-y-2 animate-slideIn">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    name="emailNotifications"
                    checked={settings.emailNotifications || false}
                    onChange={handleInputChange}
                    className="h-5 w-5 text-primary focus:ring-ring border-input rounded-radius-sm transition-colors"
                  />
                  <label
                    htmlFor="emailNotifications"
                    className="text-sm text-foreground/80 cursor-pointer"
                  >
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
                    className="h-5 w-5 text-primary focus:ring-ring border-input rounded-radius-sm transition-colors"
                  />
                  <label
                    htmlFor="pushNotifications"
                    className="text-sm text-foreground/80 cursor-pointer"
                  >
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
                    className="h-5 w-5 text-primary focus:ring-ring border-input rounded-radius-sm transition-colors"
                  />
                  <label
                    htmlFor="novelUpdatesNotifications"
                    className="text-sm text-foreground/80 cursor-pointer"
                  >
                    การแจ้งเตือนการอัปเดตนิยาย
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* ส่วนความเป็นส่วนตัว */}
          <section className="border-b border-border pb-4">
            <button
              type="button"
              onClick={() => toggleSection('privacy')}
              className="flex items-center justify-between w-full text-lg font-medium text-foreground mb-2 transition-colors hover:text-primary"
              aria-expanded={expandedSections.privacy}
              aria-controls="privacy-settings"
            >
              <span>การตั้งค่าความเป็นส่วนตัว</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedSections.privacy ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.privacy && (
              <div id="privacy-settings" className="space-y-4 animate-slideIn">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="showActivityStatus"
                    name="showActivityStatus"
                    checked={settings.showActivityStatus || false}
                    onChange={handleInputChange}
                    className="h-5 w-5 text-primary focus:ring-ring border-input rounded-radius-sm transition-colors"
                  />
                  <label
                    htmlFor="showActivityStatus"
                    className="text-sm text-foreground/80 cursor-pointer"
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
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="public">สาธารณะ</option>
                    <option value="followersOnly">เฉพาะผู้ติดตาม</option>
                    <option value="private">ส่วนตัว</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="readingHistoryVisibility"
                    className="block text-sm font-medium text-foreground/80 mb-1"
                  >
                    การมองเห็นประวัติการอ่าน
                  </label>
                  <select
                    id="readingHistoryVisibility"
                    name="readingHistoryVisibility"
                    value={settings.readingHistoryVisibility || 'public'}
                    onChange={handleInputChange}
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="public">สาธารณะ</option>
                    <option value="followersOnly">เฉพาะผู้ติดตาม</option>
                    <option value="private">ส่วนตัว</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ส่วนการตั้งค่าทั่วไป */}
          <section>
            <button
              type="button"
              onClick={() => toggleSection('general')}
              className="flex items-center justify-between w-full text-lg font-medium text-foreground mb-2 transition-colors hover:text-primary"
              aria-expanded={expandedSections.general}
              aria-controls="general-settings"
            >
              <span>การตั้งค่าทั่วไป</span>
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedSections.general ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.general && (
              <div id="general-settings" className="space-y-4 animate-slideIn">
                <div>
                  <label
                    htmlFor="theme"
                    className="block text-sm font-medium text-foreground/80 mb-1"
                  >
                    ธีม
                  </label>
                  <select
                    id="theme"
                    name="theme"
                    value={settings.theme || 'system'}
                    onChange={handleInputChange}
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="light">สว่าง</option>
                    <option value="dark">มืด</option>
                    <option value="system">ตามระบบ</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="language"
                    className="block text-sm font-medium text-foreground/80 mb-1"
                  >
                    ภาษา
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={settings.language || 'th'}
                    onChange={handleInputChange}
                    className="block w-full p-3 border border-input rounded-radius-md shadow-shadow-sm bg-background text-foreground transition-all focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="th">ไทย</option>
                    <option value="en">อังกฤษ</option>
                  </select>
                </div>
              </div>
            )}
          </section>

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
              {isLoading && (
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                  />
                </svg>
              )}
              <span>{isLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettingsSection;