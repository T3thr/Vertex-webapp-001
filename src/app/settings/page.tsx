'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Loader2, Monitor, Gamepad2, Bell, Shield, Moon, Sun, BookOpen, Volume2, Image, Text, Rss, Layers } from 'lucide-react';


interface IUserAccessibilityDisplayPreferences {
  highContrastMode: boolean;
  dyslexiaFriendlyFont: boolean;
  epilepsySafeMode: boolean;
}

interface IUserDisplayPreferences {
  theme: string;
  accessibility: IUserAccessibilityDisplayPreferences;
  uiVisibility: {
    textBoxOpacity: number;
    backgroundBrightness: number;
    textBoxBorder: boolean;
  };
  fontSettings: {
    fontSize: number;
    fontFamily: string;
    textContrastMode: boolean;
  };
  visualEffects: {
    sceneTransitionAnimations: boolean;
    actionSceneEffects: boolean;
  };
  characterDisplay: {
    showCharacters: boolean;
    characterMovementAnimations: boolean;
    hideCharactersDuringText: boolean;
  };
  characterVoiceDisplay: {
    voiceIndicatorIcon: boolean;
  };
  backgroundDisplay: {
    backgroundQuality: string;
    showCGs: boolean;
    backgroundEffects: boolean;
  };
  voiceSubtitles: {
    enabled: boolean;
  };
}

interface IUserReadingPreferences {
  textSpeed: number;
  instantText: boolean;
  skipRead: boolean;
  skipAll: boolean;
  skipHold: boolean;
  autoSpeed: number;
  autoPlay: boolean;
  enableHistory: boolean;
  historyVoice: boolean;
  historyBack: boolean;
  choiceTimer: boolean;
  highlightChoices: boolean;
  routePreview: boolean;
  autoSave: boolean;
  saveFrequency: string;
  decisionWarning: boolean;
  importantMark: boolean;
  routeProgress: boolean;
  showUnvisited: boolean;
  secretHints: boolean;
}

interface IUserNotificationPreferences {
  email: {
    enabled: boolean;
  };
  push: {
    enabled: boolean;
  };
  saveLoad: {
    autoSaveNotification: boolean;
    noSaveSpaceWarning: boolean;
  };
  newContent: {
    contentUpdates: boolean;
    promotionEvent: boolean;
  };
  outOfGame: {
    type: string;
  };
  optional: {
    statChange: boolean;
    statDetailLevel: string;
  };
}

interface IUserPrivacyPreferences {
  profileVisibility: boolean;
  readingHistory: boolean;
  activityStatus: boolean;
  dataCollection: boolean;
}

interface IUserPreferences {
  display: IUserDisplayPreferences;
  reading: IUserReadingPreferences;
  notifications: IUserNotificationPreferences;
  privacy: IUserPrivacyPreferences;
}

interface SettingsProps {
  preferences: IUserPreferences;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('display');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const handleSettingsUpdate = async (section: string, updates: any) => {
    setPendingUpdates(prev => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          ...updates
        }
      };
      console.log('pendingUpdates:', next);
      return next;
    });
  };

  const handleSaveSettings = async () => {
    if (Object.keys(pendingUpdates).length === 0) {
      toast.info('ไม่มีการเปลี่ยนแปลงที่ต้องบันทึก', {
        icon: 'ℹ️',
        duration: 2000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: pendingUpdates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast.success('การบันทึกสำเร็จ', {
        icon: '✅',
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#4CAF50',
          color: 'white',
          fontSize: '18px',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
        },
        className: 'toast-success',
      });

      console.log('Settings saved successfully, showing toast');
      
      setPendingUpdates({}); // Clear pending updates after successful save
    } catch (error) {
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้', {
        icon: '❌',
        duration: 4000,
        description: 'กรุณาลองใหม่อีกครั้ง',
        action: {
          label: 'ลองอีกครั้ง',
          onClick: () => handleSaveSettings(),
        },
      });
      console.error('Settings update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        // Add padding-bottom to ensure content doesn't get hidden by the fixed button
        className="pb-20" // Adjust this value as needed based on button height + margin
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">การตั้งค่า</h1>
          {/* REMOVED: Button is moved to a fixed position at the bottom right */}
        </div>

        <Tabs defaultValue="display" className="space-y-0 rounded-lg overflow-hidden">
          <TabsList
            className="grid w-full grid-cols-4 mx-auto justify-center rounded-t-lg"
            style={{ backgroundColor: '#9ccc65' }}
          >
            <TabsTrigger
              value="display"
              className="flex items-center justify-center gap-1 p-2 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-black rounded-tr-none rounded-tl-lg"
              style={{ color: activeTab === 'display' ? 'initial' : 'black' }}
              onClick={() => setActiveTab('display')}
            >
              <div className="flex items-center gap-1">
                <Monitor className="w-4 h-4 text-current flex-shrink-0" />
                <span className="flex-grow-0 whitespace-nowrap">การแสดงผล</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="gameplay"
              className="flex items-center justify-center gap-1 p-2 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-black rounded-none"
              style={{ color: activeTab === 'gameplay' ? 'initial' : 'black' }}
              onClick={() => setActiveTab('gameplay')}
            >
              <div className="flex items-center gap-1">
                <Gamepad2 className="w-4 h-4 text-current flex-shrink-0" />
                <span className="flex-grow-0 whitespace-nowrap">การเล่น</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center justify-center gap-1 p-2 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-black rounded-none"
              style={{ color: activeTab === 'notifications' ? 'initial' : 'black' }}
              onClick={() => setActiveTab('notifications')}
            >
              <div className="flex items-center gap-1">
                <Bell className="w-4 h-4 text-current flex-shrink-0" />
                <span className="flex-grow-0 whitespace-nowrap">การแจ้งเตือน</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="flex items-center justify-center gap-1 p-2 data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:text-black rounded-tl-none rounded-tr-lg"
              style={{ color: activeTab === 'privacy' ? 'initial' : 'black' }}
              onClick={() => setActiveTab('privacy')}
            >
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-current flex-shrink-0" />
                <span className="flex-grow-0 whitespace-nowrap">ความเป็นส่วนตัว</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Display Settings */}
          <TabsContent value="display" className="-mt-1 z-10 relative">
            <Card className="rounded-b-lg">
              <CardHeader>
                <CardTitle>การตั้งค่าการแสดงผล</CardTitle>
                <CardDescription>ปรับแต่งการแสดงผลของแอปพลิเคชัน</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">

                {/* Theme Settings (มีอยู่แล้ว) */}
                <div className="space-y-4">
                <h3 className="text-lg font-bold">ธีม</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme">ธีมของแอปพลิเคชัน</Label>
                    <Select
                      defaultValue={session?.user?.preferences?.display?.theme || 'system'}
                      onValueChange={(value) => handleSettingsUpdate('display', { theme: value })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="เลือกธีม" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4" />
                            <span>สว่าง</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            <span>มืด</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            <span>ตามระบบ</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sepia">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span>ซีเปีย</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Accessibility Settings (รวมโหมดใหม่) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">การเข้าถึง</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-contrast">โหมดคอนทราสต์สูง</Label>
                    <Switch
                      id="high-contrast"
                      defaultChecked={session?.user?.preferences?.display?.accessibility?.highContrastMode}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          accessibility: { ...session?.user?.preferences?.display?.accessibility, highContrastMode: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dyslexia-friendly">ฟอนต์สำหรับผู้บกพร่องทางการอ่าน</Label>
                    <Switch
                      id="dyslexia-friendly"
                      defaultChecked={session?.user?.preferences?.display?.accessibility?.dyslexiaFriendlyFont}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          accessibility: { ...session?.user?.preferences?.display?.accessibility, dyslexiaFriendlyFont: checked }
                        });
                      }}
                    />
                  </div>
                  {/* New: โหมดสำหรับคนแพ้แสงกระพริบ */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="epilepsy-safe-mode">โหมดลดแสงกระพริบ (สำหรับโรคลมชัก)</Label>
                    <Switch
                      id="epilepsy-safe-mode"
                      defaultChecked={session?.user?.preferences?.display?.accessibility?.epilepsySafeMode}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          accessibility: { ...session?.user?.preferences?.display?.accessibility, epilepsySafeMode: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* UI Visibility */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ความสว่าง/ความโปร่งใส UI</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="text-box-opacity">ความโปร่งใสของกล่องข้อความ</Label>
                    <div className="w-[200px]">
                      <Slider
                        id="text-box-opacity"
                        defaultValue={[session?.user?.preferences?.display?.uiVisibility?.textBoxOpacity || 80]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                          handleSettingsUpdate('display', {
                            uiVisibility: { ...session?.user?.preferences?.display?.uiVisibility, textBoxOpacity: value[0] }
                          });
                        }}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>โปร่งใส</span>
                        <span>ทึบ</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="background-brightness">ความสว่างของฉากหลัง</Label>
                    <div className="w-[200px]">
                      <Slider
                        id="background-brightness"
                        defaultValue={[session?.user?.preferences?.display?.uiVisibility?.backgroundBrightness || 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                          handleSettingsUpdate('display', {
                            uiVisibility: { ...session?.user?.preferences?.display?.uiVisibility, backgroundBrightness: value[0] }
                          });
                        }}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>มืด</span>
                        <span>สว่าง</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="text-box-border">เปิด/ปิดกรอบข้อความ</Label>
                    <Switch
                      id="text-box-border"
                      defaultChecked={session?.user?.preferences?.display?.uiVisibility?.textBoxBorder}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          uiVisibility: { ...session?.user?.preferences?.display?.uiVisibility, textBoxBorder: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Font Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ฟอนต์และขนาดตัวอักษร</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="font-size">ขนาดตัวอักษร</Label>
                    <div className="w-[200px]">
                      <Slider
                        id="font-size"
                        defaultValue={[session?.user?.preferences?.display?.fontSettings?.fontSize || 16]}
                        min={10}
                        max={24}
                        step={1}
                        onValueChange={(value) => {
                          handleSettingsUpdate('display', {
                            fontSettings: { ...session?.user?.preferences?.display?.fontSettings, fontSize: value[0] }
                          });
                        }}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>เล็ก</span>
                        <span>ใหญ่</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="font-family">รูปแบบฟอนต์</Label>
                    <Select
                      defaultValue={session?.user?.preferences?.display?.fontSettings?.fontFamily || 'sans-serif'}
                      onValueChange={(value) => handleSettingsUpdate('display', { fontSettings: { ...session?.user?.preferences?.display?.fontSettings, fontFamily: value } })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="เลือกฟอนต์" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans-serif">Sans-serif (ทั่วไป)</SelectItem>
                        <SelectItem value="serif">Serif (มีเชิง)</SelectItem>
                        <SelectItem value="monospace">Monospace (ตัวอักษรกว้างเท่ากัน)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="text-contrast-mode">โหมดปรับ Contrast ตัวอักษร</Label>
                    <Switch
                      id="text-contrast-mode"
                      defaultChecked={session?.user?.preferences?.display?.fontSettings?.textContrastMode}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          fontSettings: { ...session?.user?.preferences?.display?.fontSettings, textContrastMode: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Visual Effects */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">เอฟเฟกต์ภาพ</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="scene-transition-animations">เปิด/ปิดแอนิเมชันเวลาเปลี่ยนฉาก</Label>
                    <Switch
                      id="scene-transition-animations"
                      defaultChecked={session?.user?.preferences?.display?.visualEffects?.sceneTransitionAnimations}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          visualEffects: { ...session?.user?.preferences?.display?.visualEffects, sceneTransitionAnimations: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="action-scene-effects">เปิด/ปิด Screen Shake / Flash</Label>
                    <Switch
                      id="action-scene-effects"
                      defaultChecked={session?.user?.preferences?.display?.visualEffects?.actionSceneEffects}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          visualEffects: { ...session?.user?.preferences?.display?.visualEffects, actionSceneEffects: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Character Display */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ภาพตัวละคร</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-characters">แสดง/ไม่แสดงตัวละครบนหน้าจอ</Label>
                    <Switch
                      id="show-characters"
                      defaultChecked={session?.user?.preferences?.display?.characterDisplay?.showCharacters}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          characterDisplay: { ...session?.user?.preferences?.display?.characterDisplay, showCharacters: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="character-movement-animations">เปิด/ปิดแอนิเมชันการขยับตัวละคร</Label>
                    <Switch
                      id="character-movement-animations"
                      defaultChecked={session?.user?.preferences?.display?.characterDisplay?.characterMovementAnimations}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          characterDisplay: { ...session?.user?.preferences?.display?.characterDisplay, characterMovementAnimations: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hide-characters-during-text">ซ่อนตัวละครเมื่ออ่านข้อความ</Label>
                    <Switch
                      id="hide-characters-during-text"
                      defaultChecked={session?.user?.preferences?.display?.characterDisplay?.hideCharactersDuringText}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          characterDisplay: { ...session?.user?.preferences?.display?.characterDisplay, hideCharactersDuringText: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Character Name + Voice Display */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">การแสดงชื่อ/เสียง</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice-indicator-icon">เปิดไอคอนหรือสัญลักษณ์บอกว่ามีเสียงพากย์</Label>
                    <Switch
                      id="voice-indicator-icon"
                      defaultChecked={session?.user?.preferences?.display?.characterVoiceDisplay?.voiceIndicatorIcon}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          characterVoiceDisplay: { ...session?.user?.preferences?.display?.characterVoiceDisplay, voiceIndicatorIcon: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Background/CG Display */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">แสดงภาพพื้นหลัง/CG</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="background-quality">ความคมชัดภาพพื้นหลัง</Label>
                    <Select
                      defaultValue={session?.user?.preferences?.display?.backgroundDisplay?.backgroundQuality || 'mid'}
                      onValueChange={(value) => handleSettingsUpdate('display', { backgroundDisplay: { ...session?.user?.preferences?.display?.backgroundDisplay, backgroundQuality: value } })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="เลือกความคมชัด" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">ต่ำ</SelectItem>
                        <SelectItem value="mid">ปานกลาง</SelectItem>
                        <SelectItem value="high">สูง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-cgs">เปิด/ปิดภาพ CG ในฉาก</Label>
                    <Switch
                      id="show-cgs"
                      defaultChecked={session?.user?.preferences?.display?.backgroundDisplay?.showCGs}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          backgroundDisplay: { ...session?.user?.preferences?.display?.backgroundDisplay, showCGs: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="background-effects">เปิด/ปิดเอฟเฟกต์พื้นหลัง (เช่น ฝนตก, หิมะ)</Label>
                    <Switch
                      id="background-effects"
                      defaultChecked={session?.user?.preferences?.display?.backgroundDisplay?.backgroundEffects}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          backgroundDisplay: { ...session?.user?.preferences?.display?.backgroundDisplay, backgroundEffects: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Voice Subtitles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ซับไตเติลเสียงพากย์</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice-subtitles">เปิด/ปิดคำบรรยายเสียงพากย์</Label>
                    <Switch
                      id="voice-subtitles"
                      defaultChecked={session?.user?.preferences?.display?.voiceSubtitles?.enabled}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('display', {
                          voiceSubtitles: { ...session?.user?.preferences?.display?.voiceSubtitles, enabled: checked }
                        });
                      }}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Gameplay Settings */}
          <TabsContent value="gameplay" className="-mt-1 z-10 relative">
            <Card className="rounded-b-lg">
              <CardHeader>
                <CardTitle>การตั้งค่าการเล่น</CardTitle>
                <CardDescription>ปรับแต่งประสบการณ์การเล่นของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Text Speed */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ความเร็วข้อความ (Text Speed)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="text-speed">ปรับความเร็วที่ข้อความปรากฏทีละตัวอักษร</Label>
                      <div className="w-[200px]">
                        <Slider
                          id="text-speed"
                          defaultValue={[session?.user?.preferences?.reading?.textSpeed || 50]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(value) => {
                            handleSettingsUpdate('reading', {
                              textSpeed: value[0]
                            });
                          }}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>ช้า</span>
                          <span>เร็ว</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="instant-text">แสดงข้อความทั้งหมดทันที</Label>
                      <Switch
                        id="instant-text"
                        defaultChecked={session?.user?.preferences?.reading?.instantText}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            instantText: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Skip Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">การข้ามข้อความ (Skip Options)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="skip-read">ข้ามเฉพาะข้อความที่เคยอ่านแล้ว</Label>
                      <Switch
                        id="skip-read"
                        defaultChecked={session?.user?.preferences?.reading?.skipRead}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            skipRead: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="skip-all">ข้ามทุกข้อความ (รวมที่ยังไม่เคยอ่าน)</Label>
                      <Switch
                        id="skip-all"
                        defaultChecked={session?.user?.preferences?.reading?.skipAll}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            skipAll: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="skip-hold">ข้ามโดยกดค้าง / อัตโนมัติ</Label>
                      <Switch
                        id="skip-hold"
                        defaultChecked={session?.user?.preferences?.reading?.skipHold}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            skipHold: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Auto Mode */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">โหมดเล่นอัตโนมัติ (Auto Mode)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-speed">ความเร็วในการเปลี่ยนบทสนทนา</Label>
                      <div className="w-[200px]">
                        <Slider
                          id="auto-speed"
                          defaultValue={[session?.user?.preferences?.reading?.autoSpeed || 50]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(value) => {
                            handleSettingsUpdate('reading', {
                              autoSpeed: value[0]
                            });
                          }}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>ช้า</span>
                          <span>เร็ว</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-play">เล่นอัตโนมัติหลังข้อความจบ</Label>
                      <Switch
                        id="auto-play"
                        defaultChecked={session?.user?.preferences?.reading?.autoPlay}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            autoPlay: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Backlog / History */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ตัวเลือกย้อนข้อความ (Backlog / History)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enable-history">เปิดใช้งานประวัติข้อความ</Label>
                      <Switch
                        id="enable-history"
                        defaultChecked={session?.user?.preferences?.reading?.enableHistory}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            enableHistory: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="history-voice">เปิดเสียงพากย์เมื่อกดดูข้อความเก่า</Label>
                      <Switch
                        id="history-voice"
                        defaultChecked={session?.user?.preferences?.reading?.historyVoice}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            historyVoice: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="history-back">กดย้อนเพื่อกลับไปยังตัวเลือกก่อนหน้า</Label>
                      <Switch
                        id="history-back"
                        defaultChecked={session?.user?.preferences?.reading?.historyBack}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            historyBack: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Choices */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ตัวเลือก (Choices)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="choice-timer">แสดงตัวจับเวลาในการเลือก</Label>
                      <Switch
                        id="choice-timer"
                        defaultChecked={session?.user?.preferences?.reading?.choiceTimer}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            choiceTimer: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="highlight-choices">ไฮไลต์ตัวเลือกที่เคยเลือกแล้ว</Label>
                      <Switch
                        id="highlight-choices"
                        defaultChecked={session?.user?.preferences?.reading?.highlightChoices}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            highlightChoices: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="route-preview">แสดงผลลัพธ์เบื้องต้น</Label>
                      <Switch
                        id="route-preview"
                        defaultChecked={session?.user?.preferences?.reading?.routePreview}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            routePreview: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Auto Save */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">เซฟอัตโนมัติ (Auto Save)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-save">เปิด/ปิดเซฟอัตโนมัติ</Label>
                      <Switch
                        id="auto-save"
                        defaultChecked={session?.user?.preferences?.reading?.autoSave}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            autoSave: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="save-frequency">ความถี่ในการเซฟ</Label>
                      <Select
                        defaultValue={session?.user?.preferences?.reading?.saveFrequency || 'scene'}
                        onValueChange={(value) => {
                          handleSettingsUpdate('reading', {
                            saveFrequency: value
                          });
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="เลือกความถี่" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5min">ทุก 5 นาที</SelectItem>
                          <SelectItem value="10min">ทุก 10 นาที</SelectItem>
                          <SelectItem value="scene">ทุกฉาก</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Decision Warning */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ระบบเตือนการตัดสินใจสำคัญ (Decision Warning)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="decision-warning">เปิดแจ้งเตือนเมื่อกำลังจะเลือกตัวเลือกสำคัญ</Label>
                      <Switch
                        id="decision-warning"
                        defaultChecked={session?.user?.preferences?.reading?.decisionWarning}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            decisionWarning: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="important-mark">เปิด/ปิดเครื่องหมาย "สำคัญ" บนตัวเลือก</Label>
                      <Switch
                        id="important-mark"
                        defaultChecked={session?.user?.preferences?.reading?.importantMark}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            importantMark: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Route Management */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">ระบบเส้นทาง (Route Management)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="route-progress">แสดงเปอร์เซ็นต์ความคืบหน้าใน route ปัจจุบัน</Label>
                      <Switch
                        id="route-progress"
                        defaultChecked={session?.user?.preferences?.reading?.routeProgress}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            routeProgress: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-unvisited">แสดงเส้นทางที่ยังไม่เคยเข้า</Label>
                      <Switch
                        id="show-unvisited"
                        defaultChecked={session?.user?.preferences?.reading?.showUnvisited}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            showUnvisited: checked
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="secret-hints">แสดงคำใบ้สำหรับการปลดเส้นทางลับ</Label>
                      <Switch
                        id="secret-hints"
                        defaultChecked={session?.user?.preferences?.reading?.secretHints}
                        onCheckedChange={(checked) => {
                          handleSettingsUpdate('reading', {
                            secretHints: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="-mt-1 z-10 relative">
            <Card className="rounded-b-lg">
              <CardHeader>
                <CardTitle>การตั้งค่าการแจ้งเตือน</CardTitle>
                <CardDescription>จัดการการตั้งค่าการแจ้งเตือนของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* General Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">การแจ้งเตือนทั่วไป</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications">การแจ้งเตือนทางอีเมล</Label>
                    <Switch
                      id="email-notifications"
                      defaultChecked={session?.user?.preferences?.notifications?.email?.enabled}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          email: { enabled: checked }
                        });
                      }}
                    />
                  </div>
                  {/* Push notifications ที่มีอยู่แล้ว - ปรับคำอธิบายให้ครอบคลุม "นอกเกม" */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifications">การแจ้งเตือนแบบพุช (Push Notifications)</Label>
                    <Switch
                      id="push-notifications"
                      defaultChecked={session?.user?.preferences?.notifications?.push?.enabled}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          push: { enabled: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Save / Load Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">แจ้งเตือนเกี่ยวกับการเซฟ / โหลด</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-save-notification">แจ้งเตือนเมื่อบันทึกอัตโนมัติสำเร็จ</Label>
                    <Switch
                      id="auto-save-notification"
                      defaultChecked={session?.user?.preferences?.notifications?.saveLoad?.autoSaveNotification}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          saveLoad: { ...session?.user?.preferences?.notifications?.saveLoad, autoSaveNotification: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="no-save-space-warning">เตือนเมื่อไม่มีที่ว่างในการเซฟ (เฉพาะบางเกม)</Label>
                    <Switch
                      id="no-save-space-warning"
                      defaultChecked={session?.user?.preferences?.notifications?.saveLoad?.noSaveSpaceWarning}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          saveLoad: { ...session?.user?.preferences?.notifications?.saveLoad, noSaveSpaceWarning: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* New Content / Activity Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">แจ้งเตือนกิจกรรม/เนื้อหาใหม่</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content-updates-notification">เปิด/ปิดแจ้งเตือนเมื่อมีเนื้อหาใหม่, ตอนใหม่, หรือกิจกรรมพิเศษ</Label>
                    <Switch
                      id="content-updates-notification"
                      defaultChecked={session?.user?.preferences?.notifications?.newContent?.contentUpdates}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          newContent: { ...session?.user?.preferences?.notifications?.newContent, contentUpdates: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="promotion-event-notification">เปิด/ปิดการแจ้งเตือนโปรโมชั่น หรืออีเวนต์ในเกม</Label>
                    <Switch
                      id="promotion-event-notification"
                      defaultChecked={session?.user?.preferences?.notifications?.newContent?.promotionEvent}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          newContent: { ...session?.user?.preferences?.notifications?.newContent, promotionEvent: checked }
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Out-of-Game Notifications - (Note: push notifications already cover the main switch) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">แจ้งเตือนนอกเกม (เฉพาะแพลตฟอร์มมือถือหรือเชื่อมบัญชีผู้ใช้)</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="out-of-game-type-selection">เลือกประเภทการแจ้งเตือนนอกเกมที่ต้องการ</Label>
                    <Select
                      defaultValue={session?.user?.preferences?.notifications?.outOfGame?.type || 'all'}
                      onValueChange={(value) => handleSettingsUpdate('notifications', { outOfGame: { ...session?.user?.preferences?.notifications?.outOfGame, type: value } })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="เลือกประเภท" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="new-episode">เฉพาะตอนใหม่</SelectItem>
                        <SelectItem value="daily-gift">เฉพาะของขวัญรายวัน</SelectItem>
                        <SelectItem value="stat-progress">เฉพาะความคืบหน้าค่าพลัง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Optional Notifications (Stat/Relationship) */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">แจ้งเตือนเสริม (สำหรับเกมที่มีระบบสถิติหรือความสัมพันธ์)</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stat-change-notification">เปิด/ปิดแจ้งเตือนเมื่อค่าพลังเปลี่ยน</Label>
                    <Switch
                      id="stat-change-notification"
                      defaultChecked={session?.user?.preferences?.notifications?.optional?.statChange}
                      onCheckedChange={(checked) => {
                        handleSettingsUpdate('notifications', {
                          optional: { ...session?.user?.preferences?.notifications?.optional, statChange: checked }
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stat-detail-level">ปรับระดับความละเอียดของข้อมูลค่าพลัง</Label>
                    <Select
                      defaultValue={session?.user?.preferences?.notifications?.optional?.statDetailLevel || 'summary'}
                      onValueChange={(value) => handleSettingsUpdate('notifications', { optional: { ...session?.user?.preferences?.notifications?.optional, statDetailLevel: value } })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="เลือกระดับ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detail">แจ้งละเอียด (เช่น Friendship +1)</SelectItem>
                        <SelectItem value="summary">แจ้งเฉพาะเหตุการณ์สำคัญเท่านั้น</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="-mt-1 z-10 relative">
            <Card className="rounded-b-lg">
              <CardHeader>
                <CardTitle>การตั้งค่าความเป็นส่วนตัว</CardTitle>
                <CardDescription>จัดการการตั้งค่าความเป็นส่วนตัวของคุณ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="profile-visibility">การแสดงโปรไฟล์</Label>
                    <Switch
                      id="profile-visibility"
                      defaultChecked={session?.user?.preferences?.privacy?.profileVisibility}
                      onCheckedChange={(checked) => {
                        console.log('Profile visibility changed:', checked);
                        handleSettingsUpdate('privacy', {
                          profileVisibility: checked
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="reading-history">ประวัติการอ่าน</Label>
                    <Switch
                      id="reading-history"
                      defaultChecked={session?.user?.preferences?.privacy?.readingHistory}
                      onCheckedChange={(checked) => {
                        console.log('Reading history changed:', checked);
                        handleSettingsUpdate('privacy', {
                          readingHistory: checked
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="activity-status">สถานะการใช้งาน</Label>
                    <Switch
                      id="activity-status"
                      defaultChecked={session?.user?.preferences?.privacy?.activityStatus}
                      onCheckedChange={(checked) => {
                        console.log('Activity status changed:', checked);
                        handleSettingsUpdate('privacy', {
                          activityStatus: checked
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="data-collection">การเก็บข้อมูล</Label>
                    <Switch
                      id="data-collection"
                      defaultChecked={session?.user?.preferences?.privacy?.dataCollection}
                      onCheckedChange={(checked) => {
                        console.log('Data collection changed:', checked);
                        handleSettingsUpdate('privacy', {
                          dataCollection: checked
                        });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* NEW: Fixed Save Settings Button at the bottom right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="fixed bottom-8 right-8 z-50"
      >
        <Button 
          onClick={handleSaveSettings} 
          className="shadow-lg min-w-[150px] h-12 text-lg bg-[#9ccc65] hover:bg-[#8bc34a] text-black"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            'บันทึกการตั้งค่า'
          )}
        </Button>
      </motion.div>
    </div>
  );
}