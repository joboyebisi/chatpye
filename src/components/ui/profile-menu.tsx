"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Settings, LogOut } from "lucide-react"

export function ProfileMenu() {
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-primary text-primary-foreground">
            U
          </AvatarFallback>
        </Avatar>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>View Profile</span>
        </ContextMenuItem>
        <ContextMenuItem className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Account Settings</span>
        </ContextMenuItem>
        <ContextMenuItem className="flex items-center gap-2 text-destructive">
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
} 