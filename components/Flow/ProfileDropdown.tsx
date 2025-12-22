"use client"

import { useAuth } from "@/lib/auth"
import { User, LogOut, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export function ProfileDropdown() {
  const { user, profile, isLoading, signInWithGoogle, signOut } = useAuth()

  // Loading state
  if (isLoading) {
    return (
      <button
        disabled
        className="p-2 text-muted-foreground/60 rounded-full border border-muted-foreground/20 bg-background/50 backdrop-blur-sm"
      >
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    )
  }

  // Not signed in - show sign in button
  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={signInWithGoogle}
            className="p-2 text-muted-foreground/60 hover:text-foreground transition-colors rounded-full border border-muted-foreground/20 hover:border-muted-foreground/40 bg-background/50 backdrop-blur-sm cursor-pointer"
          >
            <User className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 text-white border-neutral-700">
          Sign in with Google
        </TooltipContent>
      </Tooltip>
    )
  }

  // Signed in - show dropdown with avatar
  const displayName = profile?.full_name || user.email || "User"
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url
  const initials = getInitials(profile?.full_name || null, user.email || "")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full border border-muted-foreground/20 hover:border-muted-foreground/40 bg-background/50 backdrop-blur-sm transition-colors overflow-hidden cursor-pointer">
          <Avatar className="w-9 h-9">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-neutral-700 text-xs font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-neutral-900 border-neutral-700"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-neutral-700" />
        <DropdownMenuItem
          onClick={signOut}
          className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
