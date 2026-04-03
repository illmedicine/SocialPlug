import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Save, User } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [interval, setInterval] = useState(profile?.settings?.screenshotInterval || 60);
  const [maxTabs, setMaxTabs] = useState(profile?.settings?.maxTabsPerVM || 10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateDoc(doc(db, 'users', user.uid), {
      'settings.screenshotInterval': Number(interval),
      'settings.maxTabsPerVM': Number(maxTabs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <SettingsIcon size={24} className="text-primary-500" />
        Settings
      </h1>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <User size={16} /> Profile
        </h2>
        <div className="flex items-center gap-4">
          <img
            src={user?.photoURL || ''}
            alt=""
            className="w-14 h-14 rounded-full bg-gray-200"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="font-medium text-gray-800">{user?.displayName}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* VM Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">VM Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screenshot Interval (seconds)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              How often the VM agent takes a screenshot (10–300 seconds)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tabs Per VM
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxTabs}
              onChange={(e) => setMaxTabs(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition text-sm font-medium"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Settings saved!</span>
          )}
        </div>
      </div>

      {/* Agent Key Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-2">VM Agent Setup</h2>
        <p className="text-sm text-gray-500 mb-3">
          Each VM needs the Echo Vue agent installed. The agent connects to Firebase
          to receive session commands and upload screenshots.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600">
          <div className="text-gray-400 mb-1"># Install on each VM</div>
          <div>git clone &lt;your-repo&gt;</div>
          <div>cd vm-agent</div>
          <div>pip install -r requirements.txt</div>
          <div>python agent.py --vm-id YOUR_VM_ID</div>
        </div>
      </div>
    </div>
  );
}
