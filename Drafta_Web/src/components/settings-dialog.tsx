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
import { useLang } from '@/contexts/lang-context';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scrollDirection: 'top' | 'bottom';
  onScrollDirectionChange: (direction: 'top' | 'bottom') => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, scrollDirection, onScrollDirectionChange }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useLang();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.settingsTitle}</DialogTitle>
          <DialogDescription>{t.settingsDesc}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <hr className="border-border mb-2" />
              <h3 className="text-lg font-medium">{t.appearance}</h3>
            </div>
            <div className="space-y-2">
              <Label>{t.theme}</Label>
              {mounted && (
                <RadioGroup value={theme} onValueChange={setTheme}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light">{t.themeLight}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark">{t.themeDark}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system">{t.themeSystem}</Label>
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="pt-2">
              <hr className="border-border mb-2" />
              <h3 className="text-lg font-medium">{t.listStyle}</h3>
            </div>
            <div className="space-y-2">
              <Label>{t.newItemPos}</Label>
              <RadioGroup value={scrollDirection} onValueChange={(v) => onScrollDirectionChange(v as 'top' | 'bottom')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="top" id="scroll-top" />
                  <Label htmlFor="scroll-top">{t.addToTop}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bottom" id="scroll-bottom" />
                  <Label htmlFor="scroll-bottom">{t.addToBottom}</Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">{t.newItemPosDesc}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
