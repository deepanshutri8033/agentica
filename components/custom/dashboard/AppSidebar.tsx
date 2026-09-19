"use client"

import { useContext } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  AppWindow,
  Blocks,
  Bot,
  Layers,
  Play,
  Settings,
  User,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Progress } from "@/components/ui/progress"
import { UserDetailContext } from "@/context/userDetailContext"
import { useRouter } from "next/navigation"

export function AppSidebar() {
  const path = usePathname()
  const { user } = useUser()
  const { userDetails } = useContext(UserDetailContext)
  const router = useRouter();

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center gap-2.5 px-4 py-7">
        <Image src="/logo.svg" height={40} width={40} alt="logo" />
        <h2 className="text-lg font-semibold text-slate-900">Agentica</h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>WorkSpace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={()=>router.push("/dashboard")}
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path === "/dashboard" ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <AppWindow className="h-[18px] w-[18px] text-blue-900" />
                </div>
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={()=>router.push("/dashboard/agents")}
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path==("/dashboard/agents") ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <Bot className="h-[18px] w-[18px] text-green-900" />
                </div>
                <span>Agents</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={()=>router.push("/dashboard/runs")}
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path==("/dashboard/runs") ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                  <Play className="h-[18px] w-[18px] text-red-900" />
                </div>
                <span>Runs</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={()=>router.push("/dashboard/integrations")}
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path==("/dashboard/integrations") ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                  <Blocks className="h-[18px] w-[18px] text-purple-900" />
                </div>
                <span>Integrations</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton onClick={()=>router.push("/dashboard/templates")}
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path==("/dashboard/templates") ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                  <Layers className="h-[18px] w-[18px] text-orange-900" />
                </div>
                <span>Templates</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Users</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path==("/dashboard/settings") ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Settings className="h-[18px] w-[18px] text-gray-900" />
                </div>
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                className={`h-12 gap-3 hover:bg-slate-100 ${
                  path==("/dashboard/profile") ? "bg-slate-100" : ""
                }`}
              >
                <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-100">
                  <User className="h-[18px] w-[18px] text-yellow-900" />
                </div>
                <span>Profile</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <h2 className="flex justify-between text-sm">
            Agents
            <span>{userDetails?.agentCredits ?? 0}/5</span>
          </h2>
          <h2 className="flex justify-between text-sm">
            Credits
            <span>{userDetails?.usageCredits ?? 0}</span>
          </h2>
          <Progress
            value={
              userDetails?.agentCredits
                ? (userDetails.agentCredits / 5) * 100
                : 0
            }
          />
        </div>
        <div className="mt-2 flex items-center gap-2.5 p-2">
          <UserButton />
          <span className="text-sm font-medium">
            {user?.fullName || user?.firstName || userDetails?.name || "User"}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}