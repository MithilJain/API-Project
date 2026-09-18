"use client";

import { useEffect, useState } from 'react';
import { User, Sliders, Moon, Sun, Bell, Save, Shield, Loader2, WifiOff } from 'lucide-react';
import { getSettings, updateSettings } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

const PROFILE_KEY = 'safe_rag_profile';
const NOTIFICATIONS_KEY = 'safe_rag_notifications';

interface Profile {
  name: string;
  email: string;
}

const DEFAULT_PROFILE: Profile = { name: 'Alex Prompt-Engineer', email: 'alex@enterprise-rag.com' };

function loadProfile(): Profile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

function loadNotifications(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [lowerBound, setLowerBound] = useState(40);
  const [upperBound, setUpperBound] = useState(60);
  // Lazy initializers (not an effect + setState) so localStorage is read on
  // the client's first render pass -- loadProfile/loadNotifications already
  // guard for `typeof window === 'undefined'` so this is SSR-safe.
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [notifications, setNotifications] = useState<boolean>(loadNotifications);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setLowerBound(s.lower_bound);
        setUpperBound(s.upper_bound);
      })
      .catch(() => setError('Could not reach the SAFE-RAG API — showing local defaults, threshold changes won’t be saved.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateSettings({ lower_bound: lowerBound, upper_bound: upperBound });
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      window.localStorage.setItem(NOTIFICATIONS_KEY, String(notifications));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save threshold settings to the API.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings & Configuration</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your profile, system tuning, and user preferences.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center">
          <WifiOff className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-6">

        {/* Account Management */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-500" /> Account Management
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Saved to this browser (no backend user system yet).</p>
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 cursor-pointer transition-colors">
              <span className="text-sm font-medium">Avatar</span>
            </div>
            <div>
              <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Upload New Picture
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* System Tuning (Risk Thresholds) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
            <Sliders className="w-5 h-5 mr-2 text-purple-500" /> System Tuning (Risk Calibration)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Configure the confidence thresholds that decide a claim&apos;s verdict. This is live: it changes the
            classification behavior of <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/v1/verify</code> immediately after saving.
          </p>

          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <div className="space-y-6 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lower Bound: {lowerBound}%</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Below this: Supported</span>
                </div>
                <input
                  type="range"
                  min="0" max="100"
                  value={lowerBound}
                  onChange={(e) => setLowerBound(Math.min(Number(e.target.value), upperBound))}
                  className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Upper Bound: {upperBound}%</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Above this: Contradicted</span>
                </div>
                <input
                  type="range"
                  min="0" max="100"
                  value={upperBound}
                  onChange={(e) => setUpperBound(Math.max(Number(e.target.value), lowerBound))}
                  className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-start bg-amber-50 dark:bg-amber-950 p-4 rounded-md border border-amber-200 dark:border-amber-900">
                <Shield className="w-5 h-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Current Rule: If the calculated hallucination risk is between <strong>{lowerBound}%</strong> and <strong>{upperBound}%</strong>, the system will abstain from making a definitive Supported/Contradicted call.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center">
            <Moon className="w-5 h-5 mr-2 text-indigo-500" /> Appearance & Notifications
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Applies immediately and is remembered on this device.</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" /> : <Sun className="w-5 h-5 text-gray-500 mr-3" />}
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode Theme</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Switch the whole dashboard to dark mode.</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts when a verification run finishes.</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                aria-label="Toggle email notifications"
                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${notifications ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${notifications ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex justify-end items-center pt-4">
          {saved && <span className="text-sm text-green-600 dark:text-green-400 font-medium mr-4">Saved!</span>}
          <button
            onClick={() => {
              setProfile(loadProfile());
              setNotifications(loadNotifications());
            }}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg mr-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
