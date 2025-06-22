// src/components/settings/SettingsTabs.tsx
// นี่คือ Client Component ที่จัดการ UI และ Logic การตั้งค่าทั้งหมด
'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2, Monitor, Gamepad2, Bell, Shield, Palette, TextCursorInput, Accessibility, Volume2, PictureInPicture2, Sparkles, UserCheck, Search, Route, Settings2, Save, Rss } from 'lucide-react';
import type { IUserSettings } from '@/backend/models/UserSettings';

// Helper function สำหรับการตั้งค่าค่าใน object ที่ซ้อนกัน (nested object)
// โดยใช้ path แบบ dot notation (เช่น 'display.reading.fontSize')
const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...current[key] }; // สร้างสำเนาของ object ในแต่ละระดับเพื่อไม่ให้กระทบ state เดิม
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
};

// Helper สำหรับ deep merge สอง object เข้าด้วยกัน
const deepMerge = (target: any, source: any): any => {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = deepMerge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

const isObject = (item: any): boolean => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

interface SettingsTabsProps {
  initialPreferences: IUserSettings;
}

export default function SettingsTabs({ initialPreferences }: SettingsTabsProps) {
  const { update: updateSession } = useSession(); // ดึงฟังก์ชัน update session มาใช้
  const [isLoading, setIsLoading] = useState(false);
  
  // State สำหรับเก็บค่าที่เปลี่ยนแปลง แต่ยังไม่ได้บันทึก
  const [pendingUpdates, setPendingUpdates] = useState<Partial<IUserSettings>>({});
  
  // State สำหรับเก็บค่าที่แสดงผลบน UI ซึ่งจะรวมค่าเริ่มต้นกับค่าที่กำลังจะเปลี่ยน
  const [displayPreferences, setDisplayPreferences] = useState(initialPreferences);

  /**
   * @function handleSettingChange
   * @description เมื่อมีการเปลี่ยนแปลงค่าใน UI จะอัปเดต state ทั้งสองตัว
   * @param path - ตำแหน่งของค่าที่เปลี่ยนใน object (dot notation)
   * @param value - ค่าใหม่
   */
  const handleSettingChange = useCallback((path: string, value: any) => {
    const update = setNestedValue({}, path, value);
    setPendingUpdates((prev: Partial<IUserSettings>) => deepMerge(prev, update));
    setDisplayPreferences((prev: IUserSettings) => deepMerge({ ...prev }, update));
  }, []);

  /**
   * @function handleSaveSettings
   * @description ส่งข้อมูลที่เปลี่ยนแปลงไปยัง API เพื่อบันทึก
   */
  const handleSaveSettings = async () => {
    if (Object.keys(pendingUpdates).length === 0) {
      toast.info('ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก');
      return;
    }

    setIsLoading(true);
    const promise = fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: pendingUpdates }),
    }).then(async (res) => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'บันทึกการตั้งค่าล้มเหลว');
      }
      return res.json();
    });

    toast.promise(promise, {
      loading: 'กำลังบันทึกการตั้งค่า...',
      success: (data) => {
        setPendingUpdates({}); // ล้างค่าที่รออัปเดตหลังบันทึกสำเร็จ
        updateSession(); // สั่งให้ NextAuth อัปเดต session เพื่อให้ข้อมูลตรงกัน
        return 'บันทึกการตั้งค่าสำเร็จแล้ว!';
      },
      error: (err) => {
        return err.message;
      },
      finally: () => {
        setIsLoading(false);
      }
    });
  };

  const tabs = [
    { value: 'display', label: 'การแสดงผล', icon: <Palette size={16} /> },
    { value: 'gameplay', label: 'การเล่น', icon: <Gamepad2 size={16} /> },
    { value: 'notifications', label: 'การแจ้งเตือน', icon: <Bell size={16} /> },
    { value: 'privacy', label: 'ความเป็นส่วนตัว', icon: <Shield size={16} /> },
  ];

  return (
    <>
      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 bg-secondary p-1 rounded-lg">
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ================================================================== */}
        {/* TAB 1: การแสดงผล (Display) */}
        {/* ================================================================== */}
        <TabsContent value="display">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* --- หมวด 1.1: ธีมและหน้าตา (Appearance) --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette size={18} /> ธีมและหน้าตา</CardTitle>
                            <CardDescription>ปรับแต่งรูปลักษณ์ของแพลตฟอร์ม</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="theme">ธีมสี</Label>
                                <Select value={displayPreferences.display?.theme || 'system'} onValueChange={(v) => handleSettingChange('display.theme', v)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="เลือกธีม" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">สว่าง</SelectItem>
                                        <SelectItem value="dark">มืด</SelectItem>
                                        <SelectItem value="sepia">ซีเปีย</SelectItem>
                                        <SelectItem value="system">ตามระบบ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- หมวด 1.2: การอ่าน (Reading) --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TextCursorInput size={18} /> การอ่าน</CardTitle>
                            <CardDescription>ปรับประสบการณ์การอ่านนิยายของคุณ</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="font-size">ขนาดตัวอักษร</Label>
                                <Slider id="font-size" value={[displayPreferences.display?.reading?.fontSize as number || 16]} onValueChange={(v) => handleSettingChange('display.reading.fontSize', v[0])} min={12} max={24} step={1} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="text-alignment">การจัดวางข้อความ</Label>
                                <Select value={displayPreferences.display?.reading?.textAlignment || 'left'} onValueChange={(v) => handleSettingChange('display.reading.textAlignment', v)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">ชิดซ้าย</SelectItem>
                                        <SelectItem value="justify">เต็มขอบ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="reading-mode">รูปแบบการอ่าน</Label>
                                <Select value={displayPreferences.display?.reading?.readingModeLayout || 'scrolling'} onValueChange={(v) => handleSettingChange('display.reading.readingModeLayout', v)}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scrolling">เลื่อนยาว (Scrolling)</SelectItem>
                                        <SelectItem value="paginated">แบ่งหน้า (Paginated)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- หมวด 1.3: การเข้าถึง (Accessibility) --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Accessibility size={18} /> การเข้าถึง</CardTitle>
                            <CardDescription>ตั้งค่าเพื่อช่วยเหลือการใช้งานของคุณ</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="dyslexia-font">ฟอนต์สำหรับผู้มีภาวะ Dyslexia</Label>
                                <Switch id="dyslexia-font" checked={displayPreferences.display?.accessibility?.dyslexiaFriendlyFont} onCheckedChange={(c) => handleSettingChange('display.accessibility.dyslexiaFriendlyFont', c)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="high-contrast">โหมดความคมชัดสูง</Label>
                                <Switch id="high-contrast" checked={displayPreferences.display?.accessibility?.highContrastMode} onCheckedChange={(c) => handleSettingChange('display.accessibility.highContrastMode', c)} />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="epilepsy-safe">โหมดลดแสงกระพริบ</Label>
                                <Switch id="epilepsy-safe" checked={displayPreferences.display?.accessibility?.epilepsySafeMode} onCheckedChange={(c) => handleSettingChange('display.accessibility.epilepsySafeMode', c)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- หมวด 1.4: เอฟเฟกต์ภาพ (Visual Effects) --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles size={18} /> เอฟเฟกต์ภาพในเกม</CardTitle>
                            <CardDescription>จัดการเอฟเฟกต์ต่างๆ ขณะเล่น Visual Novel</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="scene-transitions">แอนิเมชันเปลี่ยนฉาก</Label>
                                <Switch id="scene-transitions" checked={displayPreferences.display?.visualEffects?.sceneTransitionAnimations} onCheckedChange={(c) => handleSettingChange('display.visualEffects.sceneTransitionAnimations', c)} />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="action-effects">เอฟเฟกต์ Screen Shake/Flash</Label>
                                <Switch id="action-effects" checked={displayPreferences.display?.visualEffects?.actionSceneEffects} onCheckedChange={(c) => handleSettingChange('display.visualEffects.actionSceneEffects', c)} />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="background-effects">เอฟเฟกต์พื้นหลัง (ฝนตก, หิมะ)</Label>
                                <Switch id="background-effects" checked={displayPreferences.display?.backgroundDisplay?.backgroundEffects} onCheckedChange={(c) => handleSettingChange('display.backgroundDisplay.backgroundEffects', c)} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </motion.div>
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB 2: การเล่น (Gameplay) */}
        {/* ================================================================== */}
        <TabsContent value="gameplay">
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                 <div className="grid gap-6 md:grid-cols-2">
                    {/* --- หมวด 2.1: การควบคุมข้อความ --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TextCursorInput size={18} /> การควบคุมข้อความ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="text-speed">ความเร็วในการแสดงข้อความ</Label>
                                <Slider id="text-speed" value={[displayPreferences.visualNovelGameplay?.textSpeedValue || 50]} onValueChange={(v) => handleSettingChange('visualNovelGameplay.textSpeedValue', v[0])} min={0} max={100} step={1} />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="instant-text">แสดงข้อความทันที</Label>
                                <Switch id="instant-text" checked={displayPreferences.visualNovelGameplay?.instantTextDisplay} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.instantTextDisplay', c)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="skip-read-only">ข้ามเฉพาะข้อความที่เคยอ่านแล้ว</Label>
                                <Switch id="skip-read-only" checked={displayPreferences.visualNovelGameplay?.skipReadTextOnly} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.skipReadTextOnly', c)} />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="skip-all">อนุญาตให้ข้ามข้อความที่ยังไม่อ่าน</Label>
                                <Switch id="skip-all" checked={displayPreferences.visualNovelGameplay?.skipUnreadText} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.skipUnreadText', c)} />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* --- หมวด 2.2: โหมดอัตโนมัติ --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Rss size={18} /> โหมดเล่นอัตโนมัติ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-center justify-between">
                                <Label htmlFor="autoplay-enabled">เปิดใช้งานโหมดเล่นอัตโนมัติ</Label>
                                <Switch id="autoplay-enabled" checked={displayPreferences.visualNovelGameplay?.autoPlayEnabled} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.autoPlayEnabled', c)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="autoplay-speed">ความเร็วในการเล่นอัตโนมัติ</Label>
                                <Slider id="autoplay-speed" value={[displayPreferences.visualNovelGameplay?.autoPlaySpeedValue || 50]} onValueChange={(v) => handleSettingChange('visualNovelGameplay.autoPlaySpeedValue', v[0])} min={0} max={100} step={1} disabled={!displayPreferences.visualNovelGameplay?.autoPlayEnabled} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- หมวด 2.3: เสียง --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Volume2 size={18} /> การตั้งค่าเสียง</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label>ระดับเสียงโดยรวม</Label>
                                <Slider value={[ (displayPreferences.visualNovelGameplay?.masterVolume || 1) * 100 ]} onValueChange={(v) => handleSettingChange('visualNovelGameplay.masterVolume', v[0] / 100)} />
                            </div>
                             <div className="space-y-2">
                                <Label>เสียงเพลงประกอบ (BGM)</Label>
                                <Slider value={[ (displayPreferences.visualNovelGameplay?.bgmVolume || 0.7) * 100 ]} onValueChange={(v) => handleSettingChange('visualNovelGameplay.bgmVolume', v[0] / 100)} />
                            </div>
                             <div className="space-y-2">
                                <Label>เสียงเอฟเฟกต์ (SFX)</Label>
                                <Slider value={[ (displayPreferences.visualNovelGameplay?.sfxVolume || 0.8) * 100 ]} onValueChange={(v) => handleSettingChange('visualNovelGameplay.sfxVolume', v[0] / 100)} />
                            </div>
                             <div className="space-y-2">
                                <Label>เสียงพากย์ (Voice)</Label>
                                <Slider value={[ (displayPreferences.visualNovelGameplay?.voiceVolume || 1) * 100 ]} onValueChange={(v) => handleSettingChange('visualNovelGameplay.voiceVolume', v[0] / 100)} />
                            </div>
                        </CardContent>
                    </Card>

                     {/* --- หมวด 2.4: การบันทึกและเส้นทาง --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Route size={18} /> การบันทึกและเส้นทาง</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-center justify-between">
                                <Label htmlFor="auto-save">เปิดใช้งานการบันทึกอัตโนมัติ</Label>
                                <Switch id="auto-save" checked={displayPreferences.visualNovelGameplay?.saveLoad?.autoSave} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.saveLoad.autoSave', c)} />
                            </div>
                             <div className="flex items-center justify-between">
                                <Label htmlFor="highlight-choices">ไฮไลต์ตัวเลือกที่เคยเลือกแล้ว</Label>
                                <Switch id="highlight-choices" checked={displayPreferences.visualNovelGameplay?.choices?.highlightChoices} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.choices.highlightChoices', c)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="decision-warning">เตือนก่อนการตัดสินใจสำคัญ</Label>
                                <Switch id="decision-warning" checked={displayPreferences.visualNovelGameplay?.decisions?.decisionWarning} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.decisions.decisionWarning', c)} />
                            </div>
                        </CardContent>
                    </Card>
                 </div>
           </motion.div>
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB 3: การแจ้งเตือน (Notifications) */}
        {/* ================================================================== */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle>ช่องทางการแจ้งเตือน</CardTitle>
                <CardDescription>เลือกประเภทและช่องทางการแจ้งเตือนที่คุณต้องการรับ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                  <Label htmlFor="master-notifications" className="font-bold text-lg">เปิด/ปิดการแจ้งเตือนทั้งหมด</Label>
                  <Switch id="master-notifications" checked={displayPreferences.notifications?.masterNotificationsEnabled} onCheckedChange={(c) => handleSettingChange('notifications.masterNotificationsEnabled', c)} />
                </div>
                
                {/* Email Notifications */}
                <Card className="bg-background/50">
                   <CardHeader>
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-md">การแจ้งเตือนทางอีเมล</CardTitle>
                        <Switch checked={displayPreferences.notifications?.email?.enabled} onCheckedChange={(c) => handleSettingChange('notifications.email.enabled', c)} />
                     </div>
                   </CardHeader>
                   <CardContent className="space-y-2 pt-4 border-t" hidden={!displayPreferences.notifications?.email?.enabled}>
                      <div className="flex items-center justify-between">
                        <Label>อัปเดตนิยายที่ติดตาม</Label>
                        <Switch checked={displayPreferences.notifications?.email?.novelUpdatesFromFollowing} onCheckedChange={(c) => handleSettingChange('notifications.email.novelUpdatesFromFollowing', c)} />
                      </div>
                       <div className="flex items-center justify-between">
                        <Label>ตอบกลับความคิดเห็นของคุณ</Label>
                        <Switch checked={displayPreferences.notifications?.email?.repliesToMyComments} onCheckedChange={(c) => handleSettingChange('notifications.email.repliesToMyComments', c)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>ข่าวสารและโปรโมชัน</Label>
                        <Switch checked={displayPreferences.notifications?.email?.promotionalOffers} onCheckedChange={(c) => handleSettingChange('notifications.email.promotionalOffers', c)} />
                      </div>
                   </CardContent>
                </Card>

                 {/* In-App Notifications */}
                <Card className="bg-background/50">
                   <CardHeader>
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-md">การแจ้งเตือนในแอป (ไอคอนกระดิ่ง)</CardTitle>
                        <Switch checked={displayPreferences.notifications?.inApp?.enabled} onCheckedChange={(c) => handleSettingChange('notifications.inApp.enabled', c)} />
                     </div>
                   </CardHeader>
                   <CardContent className="space-y-2 pt-4 border-t" hidden={!displayPreferences.notifications?.inApp?.enabled}>
                      <div className="flex items-center justify-between">
                        <Label>ปลดล็อกความสำเร็จ</Label>
                        <Switch checked={displayPreferences.notifications?.inApp?.achievementUnlocks} onCheckedChange={(c) => handleSettingChange('notifications.inApp.achievementUnlocks', c)} />
                      </div>
                       <div className="flex items-center justify-between">
                        <Label>มีผู้ติดตามใหม่</Label>
                        <Switch checked={displayPreferences.notifications?.inApp?.newFollowers} onCheckedChange={(c) => handleSettingChange('notifications.inApp.newFollowers', c)} />
                      </div>
                       <div className="flex items-center justify-between">
                        <Label>ประกาศจากระบบ</Label>
                        <Switch checked={displayPreferences.notifications?.inApp?.systemAnnouncements} onCheckedChange={(c) => handleSettingChange('notifications.inApp.systemAnnouncements', c)} />
                      </div>
                   </CardContent>
                </Card>

              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB 4: ความเป็นส่วนตัว (Privacy) */}
        {/* ================================================================== */}
        <TabsContent value="privacy">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
             <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCheck size={18} /> การมองเห็นโปรไฟล์</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="profile-visibility">ใครเห็นโปรไฟล์ของคุณได้บ้าง</Label>
                             <Select value={displayPreferences.contentAndPrivacy?.profileVisibility || 'public'} onValueChange={(v) => handleSettingChange('contentAndPrivacy.profileVisibility', v)}>
                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">สาธารณะ</SelectItem>
                                    <SelectItem value="followers_only">เฉพาะผู้ติดตาม</SelectItem>
                                    <SelectItem value="private">ส่วนตัว</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="history-visibility">ใครเห็นประวัติการอ่านของคุณได้บ้าง</Label>
                             <Select value={displayPreferences.contentAndPrivacy?.readingHistoryVisibility || 'followers_only'} onValueChange={(v) => handleSettingChange('contentAndPrivacy.readingHistoryVisibility', v)}>
                                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">สาธารณะ</SelectItem>
                                    <SelectItem value="followers_only">เฉพาะผู้ติดตาม</SelectItem>
                                    <SelectItem value="private">ส่วนตัว</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="activity-status">แสดงสถานะออนไลน์</Label>
                            <Switch id="activity-status" checked={displayPreferences.contentAndPrivacy?.showActivityStatus} onCheckedChange={(c) => handleSettingChange('contentAndPrivacy.showActivityStatus', c)} />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Search size={18} /> การกรองเนื้อหา</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="mature-content">แสดงเนื้อหาสำหรับผู้ใหญ่</Label>
                            <Switch id="mature-content" checked={displayPreferences.contentAndPrivacy?.showMatureContent} onCheckedChange={(c) => handleSettingChange('contentAndPrivacy.showMatureContent', c)} />
                        </div>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="blur-thumbnails">เบลอภาพตัวอย่างเนื้อหาผู้ใหญ่</Label>
                            <Switch id="blur-thumbnails" checked={displayPreferences.visualNovelGameplay?.blurThumbnailsOfMatureContent} onCheckedChange={(c) => handleSettingChange('visualNovelGameplay.blurThumbnailsOfMatureContent', c)} />
                        </div>
                    </CardContent>
                </Card>
                 <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings2 size={18} /> การวิเคราะห์ข้อมูล</CardTitle>
                        <CardDescription>
                            ข้อมูลการเล่นของคุณจะถูกใช้วิเคราะห์เพื่อปรับปรุงแพลตฟอร์มและมอบประสบการณ์ที่ดีขึ้น
                            ข้อมูลส่วนบุคคลของคุณจะถูกเก็บเป็นความลับสูงสุดเสมอ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/50">
                             <div>
                                <Label htmlFor="allow-analysis" className="font-semibold">อนุญาตให้วิเคราะห์ข้อมูลเชิงจิตวิทยา</Label>
                                <p className="text-sm text-muted-foreground">เพื่อแสดงข้อมูลเชิงลึกเกี่ยวกับสุขภาพจิตและอารมณ์ของคุณ (คุณสามารถเลือกปิดได้ตลอดเวลา)</p>
                            </div>
                            <Switch id="allow-analysis" checked={displayPreferences.contentAndPrivacy?.analyticsConsent?.allowPsychologicalAnalysis} onCheckedChange={(c) => handleSettingChange('contentAndPrivacy.analyticsConsent.allowPsychologicalAnalysis', c)} />
                        </div>
                    </CardContent>
                </Card>
             </div>
          </motion.div>
        </TabsContent>
      </Tabs>
      
      {/* ปุ่มบันทึกแบบลอยตัว */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/70 border-t border-border z-50"
      >
        <div className="container mx-auto flex justify-end">
            <Button onClick={handleSaveSettings} size="lg" disabled={isLoading || Object.keys(pendingUpdates).length === 0} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              บันทึกการเปลี่ยนแปลง
            </Button>
        </div>
      </motion.div>
    </>
  );
}

