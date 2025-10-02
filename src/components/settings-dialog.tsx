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
import { Switch } from '@/components/ui/switch';
import { Separator } from './ui/separator';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { theme, setTheme } = useTheme();
  
  // Local state for the new toggles
  const [isAutopilotOn, setIsAutopilotOn] = React.useState(false);
  const [isDataSharingOn, setIsDataSharingOn] = React.useState(false);
  const [isInPrivateOn, setIsInPrivateOn] = React.useState(false);

  // Mounted check to avoid hydration mismatch
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your application experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Appearance</h3>
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
          </div>

          <Separator />

           <div className="space-y-4">
            <h3 className="text-lg font-medium">AI &amp; Privacy</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autopilot-mode">Autopilot</Label>
                <p className="text-sm text-muted-foreground">Allow AI to proactively assist you.</p>
              </div>
              <Switch id="autopilot-mode" checked={isAutopilotOn} onCheckedChange={setIsAutopilotOn} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="data-sharing-mode">Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Share anonymized data to improve the product.</p>
              </div>
              <Switch id="data-sharing-mode" checked={isDataSharingOn} onCheckedChange={setIsDataSharingOn} />
            </div>
             <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="in-private-mode">In-Private Mode</Label>
                <p className="text-sm text-muted-foreground">Your activity will not be saved to your history.</p>
              </div>
              <Switch id="in-private-mode" checked={isInPrivateOn} onCheckedChange={setIsInPrivateOn} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
