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
  Smartphone,
  User,
  Lock,
  Mail,
  Heart,
  MessageCircle,
  Zap,
  Sun,
  Moon,
  Monitor
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
      className="bg-card border border-border rounded-xl p-4 md:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-start sm:items-center gap-3 mb-4 md:mb-6">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h3>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="space-y-3 md:space-y-4">
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
    <div className="flex items-start sm:items-center justify-between p-3 md:p-4 hover:bg-secondary/50 rounded-lg transition-colors gap-3">
      <div className="flex items-start sm:items-center gap-2 md:gap-3 flex-1 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm md:text-base truncate">{label}</div>
          {description && (
            <div className="text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</div>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors flex-shrink-0
          ${checked ? 'bg-primary' : 'bg-secondary'}
        `}
      >
        <span
          className={`
            inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 hover:bg-secondary/50 rounded-lg transition-colors gap-3">
      <div className="flex items-start sm:items-center gap-2 md:gap-3 flex-1 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground text-sm md:text-base truncate">{label}</div>
          {description && (
            <div className="text-xs md:text-sm text-muted-foreground leading-relaxed">{description}</div>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded-lg px-3 py-2 text-xs md:text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 min-w-0 sm:min-w-[140px]"
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
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="ml-3 text-muted-foreground text-sm md:text-base">กำลังโหลดการตั้งค่า...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <Settings className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0" />
              <span className="truncate">การตั้งค่า Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base leading-relaxed">
              จัดการการแสดงผลและการแจ้งเตือนสำหรับ Dashboard ของคุณ
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={handleReset}
              className="px-3 md:px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 text-sm md:text-base"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">รีเซ็ต</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 md:px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2 disabled:opacity-50 text-sm md:text-base"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Save Status */}
        {saveStatus !== 'idle' && (
          <motion.div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              saveStatus === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {saveStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm md:text-base">
              {saveStatus === 'success' 
                ? 'บันทึกการตั้งค่าเรียบร้อยแล้ว' 
                : 'เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง'
              }
            </span>
          </motion.div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6 md:space-y-8">
          {/* Reports & Analytics */}
          <SettingSection
            title="รายงานและการวิเคราะห์"
            description="ตั้งค่าการแจ้งเตือนเกี่ยวกับสถิติและรายงานผลงาน"
            icon={TrendingUp}
          >
            <ToggleSwitch
              label="รายงานรายสัปดาห์"
              description="รับรายงานสถิติผลงานทุกสัปดาห์"
              checked={settings.enableWeeklyReports}
              onChange={(checked) => handleSettingChange('enableWeeklyReports', checked)}
              icon={Activity}
            />
            <ToggleSwitch
              label="รายงานรายเดือน"
              description="รับรายงานสถิติผลงานทุกเดือน"
              checked={settings.enableMonthlyReports}
              onChange={(checked) => handleSettingChange('enableMonthlyReports', checked)}
              icon={Activity}
            />
            <ToggleSwitch
              label="การแจ้งเตือนเมื่อถึงเป้าหมาย"
              description="แจ้งเตือนเมื่อผลงานถึงเป้าหมายที่กำหนด"
              checked={settings.enableMilestoneNotifications}
              onChange={(checked) => handleSettingChange('enableMilestoneNotifications', checked)}
              icon={Award}
            />
            <ToggleSwitch
              label="การแจ้งเตือนรายได้"
              description="แจ้งเตือนเมื่อมีรายได้เข้าใหม่"
              checked={settings.enableRevenueAlerts}
              onChange={(checked) => handleSettingChange('enableRevenueAlerts', checked)}
              icon={DollarSign}
            />
          </SettingSection>

          {/* Notifications */}
          <SettingSection
            title="การแจ้งเตือน"
            description="จัดการการแจ้งเตือนต่างๆ สำหรับกิจกรรมในผลงานของคุณ"
            icon={Bell}
          >
            <ToggleSwitch
              label="คอมเมนต์ในผลงาน"
              description="แจ้งเตือนเมื่อมีคอมเมนต์ใหม่ในนิยายของคุณ"
              checked={settings.commentsOnMyNovels}
              onChange={(checked) => handleSettingChange('commentsOnMyNovels', checked)}
              icon={Mail}
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
              description="แจ้งเตือนเมื่อมีผู้สนับสนุนบริจาคให้คุณ"
              checked={settings.donationAlerts}
              onChange={(checked) => handleSettingChange('donationAlerts', checked)}
              icon={Heart}
            />
            <ToggleSwitch
              label="ประกาศระบบ"
              description="รับประกาศสำคัญจากระบบ"
              checked={settings.systemAnnouncements}
              onChange={(checked) => handleSettingChange('systemAnnouncements', checked)}
              icon={Bell}
            />
            <ToggleSwitch
              label="การแจ้งเตือนความปลอดภัย"
              description="แจ้งเตือนเกี่ยวกับความปลอดภัยของบัญชี"
              checked={settings.securityAlerts}
              onChange={(checked) => handleSettingChange('securityAlerts', checked)}
              icon={Shield}
            />
            <ToggleSwitch
              label="ข้อเสนอพิเศษ"
              description="รับข้อเสนอและโปรโมชั่นพิเศษ"
              checked={settings.promotionalOffers}
              onChange={(checked) => handleSettingChange('promotionalOffers', checked)}
              icon={Zap}
            />
            <ToggleSwitch
              label="ความสำเร็จที่ปลดล็อค"
              description="แจ้งเตือนเมื่อปลดล็อคความสำเร็จใหม่"
              checked={settings.achievementUnlocks}
              onChange={(checked) => handleSettingChange('achievementUnlocks', checked)}
              icon={Award}
            />
          </SettingSection>

          {/* Privacy & Security */}
          <SettingSection
            title="ความเป็นส่วนตัวและความปลอดภัย"
            description="จัดการการมองเห็นข้อมูลและความเป็นส่วนตัวของคุณ"
            icon={Shield}
          >
            <SelectField
              label="การมองเห็นโปรไฟล์"
              description="กำหนดใครสามารถดูโปรไฟล์ของคุณได้"
              value={settings.profileVisibility}
              onChange={(value) => handleSettingChange('profileVisibility', value)}
              options={[
                { value: 'public', label: 'สาธารณะ' },
                { value: 'followers_only', label: 'เฉพาะผู้ติดตาม' },
                { value: 'private', label: 'ส่วนตัว' }
              ]}
              icon={User}
            />
            <SelectField
              label="การมองเห็นประวัติการอ่าน"
              description="กำหนดใครสามารถดูประวัติการอ่านของคุณได้"
              value={settings.readingHistoryVisibility}
              onChange={(value) => handleSettingChange('readingHistoryVisibility', value)}
              options={[
                { value: 'public', label: 'สาธารณะ' },
                { value: 'followers_only', label: 'เฉพาะผู้ติดตาม' },
                { value: 'private', label: 'ส่วนตัว' }
              ]}
              icon={Eye}
            />
            <ToggleSwitch
              label="แสดงสถานะออนไลน์"
              description="ให้ผู้อื่นเห็นว่าคุณออนไลน์อยู่หรือไม่"
              checked={settings.showActivityStatus}
              onChange={(checked) => handleSettingChange('showActivityStatus', checked)}
              icon={Activity}
            />
            <SelectField
              label="อนุญาตข้อความส่วนตัวจาก"
              description="กำหนดใครสามารถส่งข้อความส่วนตัวให้คุณได้"
              value={settings.allowDirectMessagesFrom}
              onChange={(value) => handleSettingChange('allowDirectMessagesFrom', value)}
              options={[
                { value: 'everyone', label: 'ทุกคน' },
                { value: 'followers', label: 'เฉพาะผู้ติดตาม' },
                { value: 'no_one', label: 'ไม่อนุญาต' }
              ]}
              icon={Mail}
            />
          </SettingSection>

          {/* Display Preferences */}
          <SettingSection
            title="การแสดงผล"
            description="ปรับแต่งธีมและภาษาการแสดงผล"
            icon={Palette}
          >
            <SelectField
              label="ธีมการแสดงผล"
              description="เลือกธีมที่คุณต้องการใช้"
              value={settings.theme}
              onChange={(value) => handleSettingChange('theme', value)}
              options={[
                { value: 'light', label: 'สว่าง' },
                { value: 'dark', label: 'มืด' },
                { value: 'system', label: 'ตามระบบ' }
              ]}
              icon={settings.theme === 'light' ? Sun : settings.theme === 'dark' ? Moon : Monitor}
            />
            <SelectField
              label="ภาษา"
              description="เลือกภาษาที่ใช้ในระบบ"
              value={settings.language}
              onChange={(value) => handleSettingChange('language', value)}
              options={[
                { value: 'th', label: 'ไทย' },
                { value: 'en', label: 'English' }
              ]}
              icon={Globe}
            />
          </SettingSection>

          {/* Analytics Consent */}
          <SettingSection
            title="การยินยอมการวิเคราะห์"
            description="จัดการการใช้ข้อมูลของคุณเพื่อการวิเคราะห์และปรับปรุงประสบการณ์"
            icon={Activity}
          >
            <ToggleSwitch
              label="อนุญาตการวิเคราะห์เชิงจิตวิทยา"
              description="ให้ระบบวิเคราะห์พฤติกรรมการอ่านเพื่อแนะนำเนื้อหาที่เหมาะสม"
              checked={settings.allowPsychologicalAnalysis}
              onChange={(checked) => handleSettingChange('allowPsychologicalAnalysis', checked)}
              icon={Activity}
            />
            <ToggleSwitch
              label="อนุญาตการให้ข้อเสนอแนะส่วนบุคคล"
              description="รับคำแนะนำที่ปรับแต่งตามความชอบและพฤติกรรมของคุณ"
              checked={settings.allowPersonalizedFeedback}
              onChange={(checked) => handleSettingChange('allowPersonalizedFeedback', checked)}
              icon={Zap}
            />
          </SettingSection>
        </div>
      </div>
    </div>
  );
}
