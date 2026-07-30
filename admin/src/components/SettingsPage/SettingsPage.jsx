import React, { useState } from "react";
import { Settings, Shield, Globe, Bell, Check, Loader2 } from "lucide-react";
import { useAdminAuth } from "../../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAdminAuth();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sysName, setSysName] = useState("MediCare HMS Portal");
  const [contactEmail, setContactEmail] = useState("support@medicare.com");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [enableNotif, setEnableNotif] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <Settings className="text-emerald-500 w-8 h-8" />
          Portal Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure global application preferences, security variables, and notifications.</p>
      </div>

      <div className="bg-white rounded-3xl border border-emerald-100/50 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Sidebar Nav */}
        <div className="p-6 bg-slate-50 border-r border-slate-100 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 text-emerald-800 font-semibold text-sm">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>General Setup</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-2xl text-slate-500 hover:bg-slate-100 transition font-semibold text-sm cursor-pointer">
            <Globe className="w-4 h-4" />
            <span>Localization</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-2xl text-slate-500 hover:bg-slate-100 transition font-semibold text-sm cursor-pointer">
            <Bell className="w-4 h-4" />
            <span>Alert Preferences</span>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="col-span-2 p-8 space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b border-slate-100 pb-3">HMS Preferences</h3>

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings saved successfully.</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1.5 pl-1 uppercase tracking-wider">
                System Brand Name
              </label>
              <input
                type="text"
                value={sysName}
                onChange={(e) => setSysName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1.5 pl-1 uppercase tracking-wider">
                Technical Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1.5 pl-1 uppercase tracking-wider">
                Active System Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition bg-white"
              >
                <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC / Greenwich Mean Time</option>
                <option value="US/Eastern (EST)">US/Eastern (EST)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="enableNotif"
                checked={enableNotif}
                onChange={(e) => setEnableNotif(e.target.checked)}
                className="rounded border-slate-200 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="enableNotif" className="text-sm font-semibold text-slate-700 cursor-pointer">
                Send critical system diagnostic alert emails to administrators
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg focus:outline-none disabled:opacity-50 text-sm flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
