// src/app/api/user/preferences/blueprint/route.ts
// Blueprint Editor preferences API - Smart preference management
// Professional UX เหมือน Premiere Pro และ World-class editor tools

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import UserSettingsModel from '@/backend/models/UserSettings';
import dbConnect from '@/backend/lib/mongodb';

interface BlueprintPreferences {
  showSceneThumbnails?: boolean;
  showNodeLabels?: boolean;
  showConnectionLines?: boolean;
  autoLayout?: boolean;
  enableAnimations?: boolean;
  autoSaveEnabled?: boolean;
  autoSaveIntervalSec?: 15 | 30;
  snapToGrid?: boolean;
  gridSize?: number;
  zoomLevel?: number;
  viewOffset?: { x: number; y: number };
  nodeDefaultColor?: string;
  edgeDefaultColor?: string;
  connectionLineStyle?: "solid" | "dashed" | "dotted";
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // หา UserSettings
    const userSettings = await UserSettingsModel.findOne({ 
      userId: session.user.id 
    });

    // Default preferences สำหรับ professional UX
    const defaultPreferences: BlueprintPreferences = {
      showSceneThumbnails: true,
      showNodeLabels: true,
      showConnectionLines: true,
      autoLayout: false,
      enableAnimations: false, // Professional mode = minimal animations
      autoSaveEnabled: true,
      autoSaveIntervalSec: 15,
      snapToGrid: true,
      gridSize: 20,
      zoomLevel: 1,
      viewOffset: { x: 0, y: 0 },
      nodeDefaultColor: '#3b82f6',
      edgeDefaultColor: '#6b7280',
      connectionLineStyle: 'solid'
    };

    // Merge กับ preferences ที่มีอยู่
    const blueprintPreferences = {
      ...defaultPreferences,
      ...(userSettings?.visualNovelGameplay?.blueprintEditor || {})
    };

    return NextResponse.json({
      success: true,
      preferences: blueprintPreferences
    });

  } catch (error: any) {
    console.error('GET Blueprint preferences error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const preferences: Partial<BlueprintPreferences> = body;

    // Validate preferences
    if (preferences.autoSaveIntervalSec && ![15, 30].includes(preferences.autoSaveIntervalSec)) {
      return NextResponse.json({ 
        error: 'Invalid autoSaveIntervalSec. Must be 15 or 30.' 
      }, { status: 400 });
    }

    if (preferences.connectionLineStyle && !['solid', 'dashed', 'dotted'].includes(preferences.connectionLineStyle)) {
      return NextResponse.json({ 
        error: 'Invalid connectionLineStyle' 
      }, { status: 400 });
    }

    // หา UserSettings หรือสร้างใหม่
    let userSettings = await UserSettingsModel.findOne({ 
      userId: session.user.id 
    });

    if (!userSettings) {
      // สร้าง UserSettings ใหม่ถ้าไม่มี
      userSettings = new UserSettingsModel({
        userId: session.user.id,
        settingsVersion: 1,
        language: 'th',
        display: {
          theme: 'system_default',
          reading: {
            fontSize: 16,
            lineHeight: 1.6,
            textAlignment: 'left',
            readingModeLayout: 'scrolling',
            textContrastMode: false
          },
          accessibility: {
            dyslexiaFriendlyFont: false,
            highContrastMode: false,
            epilepsySafeMode: false,
            reducedMotion: false
          },
          uiVisibility: {
            theme: 'system_default',
            textBoxOpacity: 85,
            backgroundBrightness: 100,
            textBoxBorder: true,
            isDialogueBoxVisible: true
          },
          visualEffects: {
            sceneTransitionAnimations: true,
            actionSceneEffects: true,
            particleEffects: true
          },
          characterDisplay: {
            showCharacters: true,
            characterMovementAnimations: true,
            hideCharactersDuringText: false
          },
          characterVoiceDisplay: {
            voiceIndicatorIcon: true
          },
          backgroundDisplay: {
            backgroundQuality: 'high',
            showCGs: true,
            backgroundEffects: true
          },
          voiceSubtitles: {
            enabled: true
          }
        },
        notifications: {
          masterNotificationsEnabled: true,
          email: {
            enabled: true,
            newsletter: false,
            novelUpdatesFromFollowing: true,
            newFollowers: true,
            commentsOnMyNovels: true,
            repliesToMyComments: true,
            donationAlerts: true,
            systemAnnouncements: true,
            securityAlerts: true,
            promotionalOffers: false,
            achievementUnlocks: true
          },
          push: {
            enabled: true,
            newsletter: false,
            novelUpdatesFromFollowing: true,
            newFollowers: true,
            commentsOnMyNovels: true,
            repliesToMyComments: true,
            donationAlerts: true,
            systemAnnouncements: true,
            securityAlerts: true,
            promotionalOffers: false,
            achievementUnlocks: true
          },
          inApp: {
            enabled: true,
            newsletter: false,
            novelUpdatesFromFollowing: true,
            newFollowers: true,
            commentsOnMyNovels: true,
            repliesToMyComments: true,
            donationAlerts: true,
            systemAnnouncements: true,
            securityAlerts: true,
            promotionalOffers: false,
            achievementUnlocks: true
          },
          saveLoad: {
            autoSaveNotification: true,
            noSaveSpaceWarning: true
          },
          newContent: {
            contentUpdates: true,
            promotionEvent: false
          },
          outOfGame: {
            type: 'new-episode'
          },
          optional: {
            statChange: true,
            statDetailLevel: 'summary'
          }
        },
        contentAndPrivacy: {
          showMatureContent: false,
          preferredGenres: [],
          blockedGenres: [],
          blockedTags: [],
          blockedAuthors: [],
          blockedNovels: [],
          profileVisibility: 'public',
          readingHistoryVisibility: 'followers_only',
          showActivityStatus: true,
          allowDirectMessagesFrom: 'followers',
          analyticsConsent: {
            allowPsychologicalAnalysis: false,
            allowPersonalizedFeedback: true
          }
        },
        visualNovelGameplay: {
          textSpeedValue: 50,
          instantTextDisplay: false,
          autoPlayMode: 'click',
          autoPlayDelayMs: 2000,
          autoPlaySpeedValue: 50,
          autoPlayEnabled: false,
          skipUnreadText: false,
          skipReadTextOnly: true,
          skipAllText: false,
          skipOnHold: true,
          transitionsEnabled: true,
          screenEffectsEnabled: true,
          textWindowOpacity: 85,
          masterVolume: 80,
          bgmVolume: 70,
          sfxVolume: 80,
          voiceVolume: 80,
          voicesEnabled: true,
          preferredVoiceLanguage: 'th',
          showChoiceTimer: true,
          blurThumbnailsOfMatureContent: true,
          preferredArtStyles: [],
          preferredGameplayMechanics: [],
          assetPreloading: 'essential',
          characterAnimationLevel: 'full',
          backlog: {
            enableHistory: true,
            historyVoice: true,
            historyBack: true
          },
          choices: {
            highlightChoices: true,
            routePreview: false
          },
          saveLoad: {
            autoSave: true,
            saveFrequency: 'scene'
          },
          decisions: {
            decisionWarning: true,
            importantMark: true
          },
          routeManagement: {
            routeProgress: true,
            showUnvisited: true,
            secretHints: false
          }
        }
      });
    }

    // อัปเดต Blueprint preferences
    if (!userSettings.visualNovelGameplay) {
      userSettings.visualNovelGameplay = {} as any;
    }

    userSettings.visualNovelGameplay.blueprintEditor = {
      ...userSettings.visualNovelGameplay.blueprintEditor,
      ...preferences
    };

    // เพิ่มเวลาอัปเดต
    userSettings.updatedAt = new Date();

    await userSettings.save();

    return NextResponse.json({
      success: true,
      preferences: userSettings.visualNovelGameplay.blueprintEditor
    });

  } catch (error: any) {
    console.error('PATCH Blueprint preferences error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
