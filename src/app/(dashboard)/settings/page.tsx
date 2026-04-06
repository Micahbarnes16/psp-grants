export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your organization profile and preferences.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="px-6 py-5">
          <h3 className="text-sm font-medium text-gray-900">
            Organization Profile
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Name, mission statement, EIN, and focus areas for PSP.
          </p>
        </div>
        <div className="px-6 py-5">
          <h3 className="text-sm font-medium text-gray-900">Integrations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Claude AI and Resend email configuration.
          </p>
        </div>
      </div>
    </div>
  );
}
