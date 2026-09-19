"use client";

import * as React from 'react';
import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/custom/dashboard/AppSidebar';
import { UserDetailContext } from '@/context/userDetailContext';

export default function Dashboardlayout({ children }: { children: React.ReactNode }) {
  // Initialize state with default credits or fetch them from your backend/Clerk
  const [userDetails, setUserDetails] = useState({
    name: "User",
    agentCredits: 3,
    usageCredits: 100,
  });

  return (
    <UserDetailContext.Provider value={{ userDetails, setUserDetails }}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger />
        <div className='w-full'>{children}</div>
      </SidebarProvider>
    </UserDetailContext.Provider>
  );
}