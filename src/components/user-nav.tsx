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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Settings } from 'lucide-react';

interface UserNavProps {
    onOpenSettings: () => void;
}

export function UserNav({ onOpenSettings }: UserNavProps) {
    const [isLoggedIn, setIsLoggedIn] = React.useState(false);

    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                    {/* In a real app, you'd have user data here */}
                    {isLoggedIn ? <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="@shadcn" /> : null}
                    <AvatarFallback>{isLoggedIn ? 'U' : '?'}</AvatarFallback>
                </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">My Account</p>
                <p className="text-xs leading-none text-muted-foreground">
                {isLoggedIn ? 'user@example.com' : 'Not logged in'}
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
            {isLoggedIn ? (
                <DropdownMenuItem onClick={() => setIsLoggedIn(false)}>
                    Log out
                </DropdownMenuItem>
            ) : (
                <DropdownMenuItem onClick={() => setIsLoggedIn(true)}>
                    Log in
                </DropdownMenuItem>
            )}
        </DropdownMenuContent>
        </DropdownMenu>
    )
}
