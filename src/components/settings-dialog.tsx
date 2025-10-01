"use client";

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from './ui/button';
import { UserIcons } from './icons';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { theme, setTheme } = useTheme();
  const { icon, setIcon } = useUserPreferences();
  
  // Mounted check to avoid hydration mismatch
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your application experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            {mounted && (
                 <RadioGroup value={theme} onValueChange={setTheme}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark">Dark</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system">System</Label>
                    </div>
                </RadioGroup>
            )}
          </div>
          <div className="space-y-2">
            <Label>Profile Icon</Label>
            <div className="flex items-center gap-2">
                {Object.keys(UserIcons).map((iconKey) => {
                    const IconComponent = UserIcons[iconKey];
                    return (
                        <Button
                            key={iconKey}
                            variant="outline"
                            size="icon"
                            onClick={() => setIcon(iconKey)}
                            className={cn(
                                'h-12 w-12',
                                icon === iconKey && 'ring-2 ring-primary'
                            )}
                        >
                            <IconComponent className="h-6 w-6" />
                        </Button>
                    )
                })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
