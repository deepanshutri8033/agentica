"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Bell,
  CreditCard,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { user } = useUser();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [runFailureAlerts, setRunFailureAlerts] = useState(true);

  const [saving, setSaving] = useState(false);

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved successfully!");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account preferences and notification settings.
        </p>
      </div>


      {/* Notifications Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <Bell className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Notifications</h3>
            <p className="text-xs text-slate-500">Choose when and how you receive status updates.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Email Digest Notifications</p>
              <p className="text-xs text-slate-500">Receive summary reports of completed agent runs.</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Run Failure Alerts</p>
              <p className="text-xs text-slate-500">Get notified immediately when an agent execution fails.</p>
            </div>
            <Switch
              checked={runFailureAlerts}
              onCheckedChange={setRunFailureAlerts}
            />
          </div>
        </div>
      </div>

      {/* Billing & Usage */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Current Plan & Usage</h3>
              <p className="text-xs text-slate-500">Free Starter Plan</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block">Agent Limit</span>
            <span className="font-bold text-slate-800 text-sm">3 / 5 Agents Used</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block">Execution Credits</span>
            <span className="font-bold text-slate-800 text-sm">100 Starter Credits</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs h-10 px-6 gap-2 shadow-xs cursor-pointer"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
