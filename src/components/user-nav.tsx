"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { UserIcons } from "./icons"
import { useUserPreferences } from "@/hooks/use-user-preferences"

interface UserNavProps {
    onOpenSettings: () => void;
}

export function UserNav({ onOpenSettings }: UserNavProps) {
    const { icon } = useUserPreferences();

    const ActiveIcon = UserIcons[icon] || UserIcons['mono-d'];

    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <ActiveIcon className="h-5 w-5" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs leading-none text-muted-foreground">
                user@example.com
                </p>
            </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuItem onClick={onOpenSettings}>
                Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
                Subscription
            </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
             <DropdownMenuItem>
                Log in
            </DropdownMenuItem>
            <DropdownMenuItem>
                Log out
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    )
}
