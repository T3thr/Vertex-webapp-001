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

export default async function NotificationsSettingsPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userData = await getUser(session.user.id);

  const masterFields = [
    {
      name: 'masterNotificationsEnabled',
      label: 'Enable All Notifications',
      type: 'checkbox' as const,
    },
  ];

  const emailFields = [
    {
      name: 'emailEnabled',
      label: 'Enable Email Notifications',
      type: 'checkbox' as const,
    },
    {
      name: 'emailNewsletter',
      label: 'Subscribe to Newsletter',
      type: 'checkbox' as const,
    },
    {
      name: 'emailNovelUpdates',
      label: 'Novel Updates from Following',
      type: 'checkbox' as const,
    },
    {
      name: 'emailNewFollowers',
      label: 'New Followers',
      type: 'checkbox' as const,
    },
    {
      name: 'emailComments',
      label: 'Comments on My Novels',
      type: 'checkbox' as const,
    },
    {
      name: 'emailReplies',
      label: 'Replies to My Comments',
      type: 'checkbox' as const,
    },
    {
      name: 'emailDonations',
      label: 'Donation Alerts',
      type: 'checkbox' as const,
    },
    {
      name: 'emailAnnouncements',
      label: 'System Announcements',
      type: 'checkbox' as const,
    },
    {
      name: 'emailSecurity',
      label: 'Security Alerts',
      type: 'checkbox' as const,
    },
  ];

  const pushFields = [
    {
      name: 'pushEnabled',
      label: 'Enable Push Notifications',
      type: 'checkbox' as const,
    },
    {
      name: 'pushNovelUpdates',
      label: 'Novel Updates from Following',
      type: 'checkbox' as const,
    },
    {
      name: 'pushNewFollowers',
      label: 'New Followers',
      type: 'checkbox' as const,
    },
    {
      name: 'pushComments',
      label: 'Comments on My Novels',
      type: 'checkbox' as const,
    },
    {
      name: 'pushReplies',
      label: 'Replies to My Comments',
      type: 'checkbox' as const,
    },
    {
      name: 'pushDonations',
      label: 'Donation Alerts',
      type: 'checkbox' as const,
    },
    {
      name: 'pushAnnouncements',
      label: 'System Announcements',
      type: 'checkbox' as const,
    },
  ];

  const initialData = {
    masterNotificationsEnabled: userData.preferences?.notifications?.masterNotificationsEnabled ?? true,
    emailEnabled: userData.preferences?.notifications?.email?.enabled ?? true,
    emailNewsletter: userData.preferences?.notifications?.email?.newsletter ?? true,
    emailNovelUpdates: userData.preferences?.notifications?.email?.novelUpdatesFromFollowing ?? true,
    emailNewFollowers: userData.preferences?.notifications?.email?.newFollowers ?? true,
    emailComments: userData.preferences?.notifications?.email?.commentsOnMyNovels ?? true,
    emailReplies: userData.preferences?.notifications?.email?.repliesToMyComments ?? true,
    emailDonations: userData.preferences?.notifications?.email?.donationAlerts ?? true,
    emailAnnouncements: userData.preferences?.notifications?.email?.systemAnnouncements ?? true,
    emailSecurity: userData.preferences?.notifications?.email?.securityAlerts ?? true,
    pushEnabled: userData.preferences?.notifications?.push?.enabled ?? true,
    pushNovelUpdates: userData.preferences?.notifications?.push?.novelUpdatesFromFollowing ?? true,
    pushNewFollowers: userData.preferences?.notifications?.push?.newFollowers ?? true,
    pushComments: userData.preferences?.notifications?.push?.commentsOnMyNovels ?? true,
    pushReplies: userData.preferences?.notifications?.push?.repliesToMyComments ?? true,
    pushDonations: userData.preferences?.notifications?.push?.donationAlerts ?? true,
    pushAnnouncements: userData.preferences?.notifications?.push?.systemAnnouncements ?? true,
  };

  const handleSubmit = async (data: any) => {
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferences: {
          notifications: {
            masterNotificationsEnabled: data.masterNotificationsEnabled,
            email: {
              enabled: data.emailEnabled,
              newsletter: data.emailNewsletter,
              novelUpdatesFromFollowing: data.emailNovelUpdates,
              newFollowers: data.emailNewFollowers,
              commentsOnMyNovels: data.emailComments,
              repliesToMyComments: data.emailReplies,
              donationAlerts: data.emailDonations,
              systemAnnouncements: data.emailAnnouncements,
              securityAlerts: data.emailSecurity,
            },
            push: {
              enabled: data.pushEnabled,
              novelUpdatesFromFollowing: data.pushNovelUpdates,
              newFollowers: data.pushNewFollowers,
              commentsOnMyNovels: data.pushComments,
              repliesToMyComments: data.pushReplies,
              donationAlerts: data.pushDonations,
              systemAnnouncements: data.pushAnnouncements,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update notification settings');
    }
  };

  return (
    <div className="space-y-10">
      <SettingsForm
        title="Notification Settings"
        description="Control which notifications you receive and how you receive them."
        initialData={initialData}
        fields={masterFields}
        onSubmit={handleSubmit}
      />

      <SettingsForm
        title="Email Notifications"
        description="Choose which email notifications you want to receive."
        initialData={initialData}
        fields={emailFields}
        onSubmit={handleSubmit}
      />

      <SettingsForm
        title="Push Notifications"
        description="Choose which push notifications you want to receive on your devices."
        initialData={initialData}
        fields={pushFields}
        onSubmit={handleSubmit}
      />
    </div>
  );
} 