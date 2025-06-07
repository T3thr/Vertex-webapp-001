import { getServerSession } from 'next-auth/next';
import Image from 'next/image';
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

export default async function SettingsPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userData = await getUser(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This information will be displayed publicly so be careful what you share.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <div className="mt-1 flex items-center">
            <span className="h-24 w-24 rounded-full overflow-hidden bg-gray-100">
              {userData.profile.avatarUrl ? (
                <Image
                  src={userData.profile.avatarUrl}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full"
                />
              ) : (
                <span className="h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                  <svg
                    className="h-full w-full text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Username
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="username"
              id="username"
              defaultValue={userData.username}
              disabled
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Bio
          </label>
          <div className="mt-1">
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={userData.profile.bio}
              disabled
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Write a few sentences about yourself.
          </p>
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor="penName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Pen Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="penName"
              id="penName"
              defaultValue={userData.profile.penName}
              disabled
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Country
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="country"
              id="country"
              defaultValue={userData.profile.country}
              disabled
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Timezone
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="timezone"
              id="timezone"
              defaultValue={userData.profile.timezone}
              disabled
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 