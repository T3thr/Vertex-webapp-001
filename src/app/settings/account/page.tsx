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

export default async function AccountSettingsPage() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const userData = await getUser(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Settings</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings and connected services.
        </p>
      </div>

      {/* Email Section */}
      <div className="mt-6">
        <div className="shadow sm:rounded-md sm:overflow-hidden">
          <div className="px-4 py-5 bg-white dark:bg-gray-800 space-y-6 sm:p-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="email"
                  name="email"
                  id="email"
                  defaultValue={userData.email}
                  disabled
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  userData.isEmailVerified
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                }`}>
                  {userData.isEmailVerified ? 'Verified' : 'Not Verified'}
                </span>
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Connected Accounts</h4>
              <div className="mt-2 space-y-4">
                {userData.accounts.map((account: any) => (
                  <div
                    key={account.provider}
                    className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Connected</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Status */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Account Status</h4>
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}>
                    {userData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Member Since</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(userData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Last Login</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Roles */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Account Roles</h4>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {userData.roles.map((role: string) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 