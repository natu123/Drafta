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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scrollDirection: 'top' | 'bottom';
  onScrollDirectionChange: (direction: 'top' | 'bottom') => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, scrollDirection, onScrollDirectionChange }) => {
  const { theme, setTheme } = useTheme();

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

            <h3 className="text-lg font-medium pt-4">Navigation</h3>
            <div className="space-y-2">
              <Label>Default View Position</Label>
              <RadioGroup value={scrollDirection} onValueChange={(v) => onScrollDirectionChange(v as 'top' | 'bottom')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="top" id="scroll-top" />
                  <Label htmlFor="scroll-top">Top (First Item)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bottom" id="scroll-bottom" />
                  <Label htmlFor="scroll-bottom">Bottom (Last/Newest)</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">Sets where lists and notes open by default.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
