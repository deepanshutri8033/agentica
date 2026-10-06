"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { CalendarDays, CreditCard, Mail, UserRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UserProfile = {
  id?: number;
  name?: string | null;
  email?: string | null;
  agentCredits?: number | null;
  usageCredits?: number | null;
  created_at?: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("/api/users");
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const joinedAt = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
      </div>

      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">{profile?.name || "User"}</CardTitle>
          <CardDescription>Profile details pulled from the database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <UserRound className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">Full name</span>
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">{profile?.name || "—"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">Email</span>
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">{profile?.email || "—"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">Joined</span>
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">{joinedAt}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-[0.12em]">Credits</span>
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {profile?.agentCredits ?? 0} agents / {profile?.usageCredits ?? 0} usage
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
