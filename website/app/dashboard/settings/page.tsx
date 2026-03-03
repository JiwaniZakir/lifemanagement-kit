import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DeleteAccount } from '@/components/settings/delete-account';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div>
      <h1 className="mb-6 text-[22px] font-normal text-white">Settings</h1>

      <div className="max-w-md space-y-6">
        {/* Account Info */}
        <div className="rounded-xl border border-[#ffffff0d] bg-[#ffffff06] p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-[14px] font-medium text-white">Account</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-[12px] text-[#fff6]">Name</dt>
              <dd className="text-[12px] text-white">{session.user.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[12px] text-[#fff6]">Email</dt>
              <dd className="text-[12px] text-white">{session.user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[12px] text-[#fff6]">Provider</dt>
              <dd className="text-[12px] text-white capitalize">{session.provider ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Danger Zone */}
        <DeleteAccount />
      </div>
    </div>
  );
}
