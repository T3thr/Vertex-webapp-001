import SettingsForm from '@/app/components/settings/SettingsForm';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

async function getUser(userId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch user data');
  }

  return res.json();
}

export default async function DisplaySettingsPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userData = await getUser(session.user.id);

  const displayFields = [
    {
      name: 'theme',
      label: 'Theme',
      type: 'select' as const,
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'System', value: 'system' },
        { label: 'Sepia', value: 'sepia' },
      ],
    },
    {
      name: 'fontFamily',
      label: 'Font Family',
      type: 'text' as const,
    },
    {
      name: 'fontSize',
      label: 'Font Size',
      type: 'select' as const,
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
    {
      name: 'lineHeight',
      label: 'Line Height',
      type: 'text' as const,
    },
    {
      name: 'textAlignment',
      label: 'Text Alignment',
      type: 'select' as const,
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Justify', value: 'justify' },
      ],
    },
    {
      name: 'readingModeLayout',
      label: 'Reading Mode Layout',
      type: 'select' as const,
      options: [
        { label: 'Paginated', value: 'paginated' },
        { label: 'Scrolling', value: 'scrolling' },
      ],
    },
  ];

  const accessibilityFields = [
    {
      name: 'dyslexiaFriendlyFont',
      label: 'Use Dyslexia-Friendly Font',
      type: 'checkbox' as const,
    },
    {
      name: 'highContrastMode',
      label: 'High Contrast Mode',
      type: 'checkbox' as const,
    },
  ];

  const initialData = {
    theme: userData.preferences?.display?.theme || 'system',
    fontFamily: userData.preferences?.display?.reading?.fontFamily || '',
    fontSize: userData.preferences?.display?.reading?.fontSize || 'medium',
    lineHeight: userData.preferences?.display?.reading?.lineHeight || '',
    textAlignment: userData.preferences?.display?.reading?.textAlignment || 'left',
    readingModeLayout: userData.preferences?.display?.reading?.readingModeLayout || 'scrolling',
    dyslexiaFriendlyFont: userData.preferences?.display?.accessibility?.dyslexiaFriendlyFont || false,
    highContrastMode: userData.preferences?.display?.accessibility?.highContrastMode || false,
  };

  const handleSubmit = async (data: any) => {
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: {
          display: {
            theme: data.theme,
            reading: {
              fontFamily: data.fontFamily,
              fontSize: data.fontSize,
              lineHeight: data.lineHeight,
              textAlignment: data.textAlignment,
              readingModeLayout: data.readingModeLayout,
            },
            accessibility: {
              dyslexiaFriendlyFont: data.dyslexiaFriendlyFont,
              highContrastMode: data.highContrastMode,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update display settings');
    }
  };

  return (
    <div className="space-y-10">
      <SettingsForm
        title="Display Settings"
        description="Customize how content appears on your screen."
        initialData={initialData}
        fields={displayFields}
        onSubmit={handleSubmit}
      />

      <SettingsForm
        title="Accessibility Settings"
        description="Adjust settings to make reading more comfortable."
        initialData={initialData}
        fields={accessibilityFields}
        onSubmit={handleSubmit}
      />
    </div>
  );
} 