'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings,
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  DollarSign,
  BookOpen,
  Calendar,
  Target,
  Award,
  Activity,
  PieChart,
  Save,
  RotateCcw,
  Info,
  AlertCircle,
  CheckCircle,
  Bell,
  Shield,
  Palette,
  Volume2,
  Globe,
  Smartphone
} from 'lucide-react';
import { SerializedUser } from '@/app/dashboard/page';

interface SettingsTabProps {
  user: SerializedUser;
}

// Interface สำหรับการตั้งค่าที่มาจาก UserSettings model
interface WriterDashboardSettings {
  // การแสดงผลสถิติ (จาก UserSettings.notifications)
  enableWeeklyReports: boolean;
  enableMonthlyReports: boolean;
  enableMilestoneNotifications: boolean;
  enableRevenueAlerts: boolean;
  
  // การแจ้งเตือนสำหรับนักเขียน (จาก UserSettings.notifications)
  commentsOnMyNovels: boolean;
  newFollowers: boolean;
  donationAlerts: boolean;
  systemAnnouncements: boolean;
  securityAlerts: boolean;
  promotionalOffers: boolean;
  achievementUnlocks: boolean;
  
  // ความเป็นส่วนตัว (จาก UserSettings.contentAndPrivacy)
  profileVisibility: 'public' | 'followers_only' | 'private';
  readingHistoryVisibility: 'public' | 'followers_only' | 'private';
  showActivityStatus: boolean;
  allowDirectMessagesFrom: 'everyone' | 'followers' | 'no_one';
  
  // การแสดงผล (จาก UserSettings.display)
  theme: string;
  language: string;
  
  // การยินยอมการวิเคราะห์ (จาก UserSettings.contentAndPrivacy.analyticsConsent)
  allowPsychologicalAnalysis: boolean;
  allowPersonalizedFeedback: boolean;
}

export default function SettingsTab({ user }: SettingsTabProps) {
  const [settings, setSettings] = useState<WriterDashboardSettings>({
    // ค่าเริ่มต้นจากข้อมูลผู้ใช้ (ถ้ามี) หรือค่าเริ่มต้นของระบบ
    enableWeeklyReports: true,
    enableMonthlyReports: true,
    enableMilestoneNotifications: true,
    enableRevenueAlerts: false,
    
    commentsOnMyNovels: true,
    newFollowers: true,
    donationAlerts: true,
    systemAnnouncements: true,
    securityAlerts: true,
    promotionalOffers: false,
    achievementUnlocks: true,
    
    profileVisibility: 'public',
    readingHistoryVisibility: 'followers_only',
    showActivityStatus: true,
    allowDirectMessagesFrom: 'followers',
    
    theme: 'system',
    language: 'th',
    
    allowPsychologicalAnalysis: false,
    allowPersonalizedFeedback: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);

  // โหลดการตั้งค่าจาก API เมื่อ component mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const userSettings = await response.json();
          
          // แปลงข้อมูลจาก UserSettings model มาเป็นรูปแบบที่ใช้ใน component
          setSettings({
            enableWeeklyReports: userSettings.notifications?.email?.newsletter ?? true,
            enableMonthlyReports: userSettings.notifications?.email?.newsletter ?? true,
            enableMilestoneNotifications: userSettings.notifications?.email?.achievementUnlocks ?? true,
            enableRevenueAlerts: userSettings.notifications?.email?.donationAlerts ?? false,
            
            commentsOnMyNovels: userSettings.notifications?.email?.commentsOnMyNovels ?? true,
            newFollowers: userSettings.notifications?.email?.newFollowers ?? true,
            donationAlerts: userSettings.notifications?.email?.donationAlerts ?? true,
            systemAnnouncements: userSettings.notifications?.email?.systemAnnouncements ?? true,
            securityAlerts: userSettings.notifications?.email?.securityAlerts ?? true,
            promotionalOffers: userSettings.notifications?.email?.promotionalOffers ?? false,
            achievementUnlocks: userSettings.notifications?.email?.achievementUnlocks ?? true,
            
            profileVisibility: userSettings.contentAndPrivacy?.profileVisibility ?? 'public',
            readingHistoryVisibility: userSettings.contentAndPrivacy?.readingHistoryVisibility ?? 'followers_only',
            showActivityStatus: userSettings.contentAndPrivacy?.showActivityStatus ?? true,
            allowDirectMessagesFrom: userSettings.contentAndPrivacy?.allowDirectMessagesFrom ?? 'followers',
            
            theme: userSettings.display?.theme ?? 'system',
            language: userSettings.language ?? 'th',
            
            allowPsychologicalAnalysis: userSettings.contentAndPrivacy?.analyticsConsent?.allowPsychologicalAnalysis ?? false,
            allowPersonalizedFeedback: userSettings.contentAndPrivacy?.analyticsConsent?.allowPersonalizedFeedback ?? true,
          });
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSettings();
  }, []);

  const handleSettingChange = (key: keyof WriterDashboardSettings, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // แปลงการตั้งค่ากลับเป็นรูปแบบ UserSettings model
      const userSettingsUpdate = {
        notifications: {
          email: {
            newsletter: settings.enableWeeklyReports,
            commentsOnMyNovels: settings.commentsOnMyNovels,
            newFollowers: settings.newFollowers,
            donationAlerts: settings.donationAlerts,
            systemAnnouncements: settings.systemAnnouncements,
            securityAlerts: settings.securityAlerts,
            promotionalOffers: settings.promotionalOffers,
            achievementUnlocks: settings.achievementUnlocks,
          }
        },
        contentAndPrivacy: {
          profileVisibility: settings.profileVisibility,
          readingHistoryVisibility: settings.readingHistoryVisibility,
          showActivityStatus: settings.showActivityStatus,
          allowDirectMessagesFrom: settings.allowDirectMessagesFrom,
          analyticsConsent: {
            allowPsychologicalAnalysis: settings.allowPsychologicalAnalysis,
            allowPersonalizedFeedback: settings.allowPersonalizedFeedback,
          }
        },
        display: {
          theme: settings.theme,
        },
        language: settings.language,
      };

      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userSettingsUpdate),
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      enableWeeklyReports: true,
      enableMonthlyReports: true,
      enableMilestoneNotifications: true,
      enableRevenueAlerts: false,
      
      commentsOnMyNovels: true,
      newFollowers: true,
      donationAlerts: true,
      systemAnnouncements: true,
      securityAlerts: true,
      promotionalOffers: false,
      achievementUnlocks: true,
      
      profileVisibility: 'public',
      readingHistoryVisibility: 'followers_only',
      showActivityStatus: true,
      allowDirectMessagesFrom: 'followers',
      
      theme: 'system',
      language: 'th',
      
      allowPsychologicalAnalysis: false,
      allowPersonalizedFeedback: true,
    });
    setSaveStatus('idle');
  };

  const SettingSection = ({ 
    title, 
    description, 
    icon: Icon, 
    children 
  }: { 
    title: string; 
    description: string; 
    icon: React.ElementType; 
    children: React.ReactNode; 
  }) => (
    <motion.div
      className="bg-card border border-border rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </motion.div>
  );

  const ToggleSwitch = ({ 
    label, 
    description, 
    checked, 
    onChange,
    icon: Icon 
  }: { 
    label: string; 
    description?: string; 
    checked: boolean; 
    onChange: (checked: boolean) => void;
    icon?: React.ElementType;
  }) => (
    <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <div>
          <div className="font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${checked ? 'bg-primary' : 'bg-secondary'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );

  const SelectField = ({
    label,
    description,
    value,
    onChange,
    options,
    icon: Icon
  }: {
    label: string;
    description?: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    icon?: React.ElementType;
  }) => (
    <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <div>
          <div className="font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-muted-foreground">กำลังโหลดการตั้งค่า...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              การตั้งค่า Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              จัดการการแสดงผลและการแจ้งเตือนสำหรับ Dashboard ของคุณ
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              รีเซ็ต
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </motion.div>

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <motion.div
            className={`
              p-4 rounded-lg flex items-center gap-3
              ${saveStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''}
              ${saveStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : ''}
            `}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {saveStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 dark:text-green-400">บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 dark:text-red-400">เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่</span>
              </>
            )}
          </motion.div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* การแจ้งเตือนสำหรับนักเขียน */}
          <SettingSection
            title="การแจ้งเตือนสำหรับนักเขียน"
            description="ตั้งค่าการรับการแจ้งเตือนเกี่ยวกับกิจกรรมในผลงานของคุณ"
            icon={Bell}
          >
            <ToggleSwitch
              label="รายงานสัปดาห์"
              description="รับรายงานสถิติทุกสัปดาห์ทาง Email"
              checked={settings.enableWeeklyReports}
              onChange={(checked) => handleSettingChange('enableWeeklyReports', checked)}
              icon={Calendar}
            />
            <ToggleSwitch
              label="รายงานรายเดือน"
              description="รับรายงานสถิติทุกเดือนทาง Email"
              checked={settings.enableMonthlyReports}
              onChange={(checked) => handleSettingChange('enableMonthlyReports', checked)}
              icon={Calendar}
            />
            <ToggleSwitch
              label="แจ้งเตือนความสำเร็จ"
              description="แจ้งเตือนเมื่อถึงเป้าหมายหรือปลดล็อคความสำเร็จ"
              checked={settings.enableMilestoneNotifications}
              onChange={(checked) => handleSettingChange('enableMilestoneNotifications', checked)}
              icon={Award}
            />
            <ToggleSwitch
              label="คอมเมนต์ในผลงาน"
              description="แจ้งเตือนเมื่อมีคอมเมนต์ใหม่ในนิยายของคุณ"
              checked={settings.commentsOnMyNovels}
              onChange={(checked) => handleSettingChange('commentsOnMyNovels', checked)}
              icon={BookOpen}
            />
            <ToggleSwitch
              label="ผู้ติดตามใหม่"
              description="แจ้งเตือนเมื่อมีผู้ติดตามใหม่"
              checked={settings.newFollowers}
              onChange={(checked) => handleSettingChange('newFollowers', checked)}
              icon={Users}
            />
            <ToggleSwitch
              label="การบริจาค"
              description="แจ้งเตือนเมื่อได้รับการบริจาค"
              checked={settings.donationAlerts}
              onChange={(checked) => handleSettingChange('donationAlerts', checked)}
              icon={DollarSign}
            />
          </SettingSection>

          {/* ความเป็นส่วนตัว */}
          <SettingSection
            title="ความเป็นส่วนตัวและการแสดงผล"
            description="ควบคุมข้อมูลที่แสดงต่อสาธารณะและการเข้าถึงโปรไฟล์"
            icon={Shield}
          >
            <SelectField
              label="การมองเห็นโปรไฟล์"
              description="ใครสามารถดูโปรไฟล์ของคุณได้"
              value={settings.profileVisibility}
              onChange={(value) => handleSettingChange('profileVisibility', value)}
              options={[
                { value: 'public', label: 'สาธารณะ' },
                { value: 'followers_only', label: 'เฉพาะผู้ติดตาม' },
                { value: 'private', label: 'ส่วนตัว' }
              ]}
              icon={Eye}
            />
            <SelectField
              label="ประวัติการอ่าน"
              description="ใครสามารถดูประวัติการอ่านของคุณได้"
              value={settings.readingHistoryVisibility}
              onChange={(value) => handleSettingChange('readingHistoryVisibility', value)}
              options={[
                { value: 'public', label: 'สาธารณะ' },
                { value: 'followers_only', label: 'เฉพาะผู้ติดตาม' },
                { value: 'private', label: 'ส่วนตัว' }
              ]}
              icon={BookOpen}
            />
            <ToggleSwitch
              label="แสดงสถานะกิจกรรม"
              description="แสดงเวลาที่ออนไลน์ล่าสุดให้ผู้อื่นเห็น"
              checked={settings.showActivityStatus}
              onChange={(checked) => handleSettingChange('showActivityStatus', checked)}
              icon={Activity}
            />
            <SelectField
              label="ข้อความส่วนตัว"
              description="ใครสามารถส่งข้อความส่วนตัวหาคุณได้"
              value={settings.allowDirectMessagesFrom}
              onChange={(value) => handleSettingChange('allowDirectMessagesFrom', value)}
              options={[
                { value: 'everyone', label: 'ทุกคน' },
                { value: 'followers', label: 'เฉพาะผู้ติดตาม' },
                { value: 'no_one', label: 'ไม่อนุญาต' }
              ]}
              icon={Smartphone}
            />
          </SettingSection>

          {/* การแสดงผล */}
          <SettingSection
            title="การแสดงผลและภาษา"
            description="ปรับแต่งรูปลักษณ์และภาษาของ Dashboard"
            icon={Palette}
          >
            <SelectField
              label="ธีม"
              description="เลือกธีมการแสดงผล"
              value={settings.theme}
              onChange={(value) => handleSettingChange('theme', value)}
              options={[
                { value: 'light', label: 'สีสว่าง' },
                { value: 'dark', label: 'สีเข้ม' },
                { value: 'system', label: 'ตามระบบ' }
              ]}
              icon={Palette}
            />
            <SelectField
              label="ภาษา"
              description="ภาษาที่ใช้ในการแสดงผล"
              value={settings.language}
              onChange={(value) => handleSettingChange('language', value)}
              options={[
                { value: 'th', label: 'ไทย' },
                { value: 'en', label: 'English' },
                { value: 'ja', label: '日本語' }
              ]}
              icon={Globe}
            />
          </SettingSection>

          {/* การยินยอมการวิเคราะห์ */}
          <SettingSection
            title="การวิเคราะห์และข้อมูลส่วนบุคคล"
            description="จัดการการใช้ข้อมูลเพื่อปรับปรุงประสบการณ์"
            icon={BarChart3}
          >
            <ToggleSwitch
              label="อนุญาตการวิเคราะห์ทางจิตวิทยา"
              description="ให้ระบบวิเคราะห์พฤติกรรมการอ่านเพื่อแนะนำเนื้อหา"
              checked={settings.allowPsychologicalAnalysis}
              onChange={(checked) => handleSettingChange('allowPsychologicalAnalysis', checked)}
              icon={PieChart}
            />
            <ToggleSwitch
              label="คำแนะนำส่วนบุคคล"
              description="รับคำแนะนำที่ปรับแต่งตามความชอบของคุณ"
              checked={settings.allowPersonalizedFeedback}
              onChange={(checked) => handleSettingChange('allowPersonalizedFeedback', checked)}
              icon={Target}
            />
          </SettingSection>
        </div>

        {/* Info Box */}
        <motion.div
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">
                เกี่ยวกับการตั้งค่า
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                การตั้งค่าเหล่านี้จะมีผลต่อการแสดงผลและการทำงานของ Dashboard ของคุณ 
                การเปลี่ยนแปลงจะถูกบันทึกในฐานข้อมูลและมีผลทันทีหลังจากบันทึก
                คุณสามารถเปลี่ยนแปลงการตั้งค่าได้ตลอดเวลา
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
