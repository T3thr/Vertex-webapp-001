import type { IReaderSettings } from "@/components/read/ReaderSettings";
import { deepmerge } from 'deepmerge-ts';

/**
 * Default settings for the visual novel reader.
 * This object provides a fallback for all user-configurable settings.
 */
export const DEFAULT_USER_SETTINGS: IReaderSettings = {
  display: {
    reading: {
      fontSize: 16,
      lineHeight: 1.6,
      textAlignment: 'left',
      readingModeLayout: 'scrolling',
      textContrastMode: false,
    },
    uiVisibility: {
      theme: 'system_default',
      textBoxOpacity: 80, // percentage
      backgroundBrightness: 100,
      textBoxBorder: true,
      isDialogueBoxVisible: true,
    },
    // Add other display defaults if necessary
  },
  gameplay: {
    textSpeedValue: 50, // 0-100 scale
    autoPlayEnabled: false,
    autoPlayDelayMs: 2000,
    masterVolume: 100,
    bgmVolume: 70,
    sfxVolume: 80,
    voiceVolume: 100,
    // Add other gameplay defaults if necessary
  },
};

/**
 * Retrieves initial settings for the reader.
 * It follows a fallback chain: API -> localStorage -> Defaults.
 * @param userId The ID of the logged-in user, if any.
 * @returns A promise that resolves to the initial reader settings.
 */
export async function getInitialSettings(userId?: string): Promise<IReaderSettings> {
  // 1. If user is logged in, try fetching from API
  if (userId) {
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const dbSettings = await response.json();
        // Merge with defaults to ensure all keys are present
        return deepmerge(DEFAULT_USER_SETTINGS, dbSettings) as IReaderSettings;
      }
    } catch (error) {
      console.warn('Could not fetch user settings from API, falling back.', error);
    }
  }

  // 2. If no user or API fails, try localStorage
  try {
    const storedSettings = localStorage.getItem('divwy-reader-settings');
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      // Merge with defaults to ensure all keys are present after updates
      return deepmerge(DEFAULT_USER_SETTINGS, parsedSettings) as IReaderSettings;
    }
  } catch (error) {
    console.warn('Could not parse settings from localStorage, falling back.', error);
  }

  // 3. Fallback to default settings
  return DEFAULT_USER_SETTINGS;
} 