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
import { useClientReady } from '@/hooks/use-client-ready';
import { Button } from '@/components/ui/button';
import { importCopy } from '@/lib/import-copy';
import { transferCopy } from '@/lib/transfer-copy';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scrollDirection: 'top' | 'bottom';
  onScrollDirectionChange: (direction: 'top' | 'bottom') => void;
  onImport?: () => void;
  onExport?: () => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, scrollDirection, onScrollDirectionChange, onImport, onExport }) => {
  const { theme, setTheme } = useTheme();
  const { t, lang } = useLang();
  const data = importCopy[lang];

  const mounted = useClientReady();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The data section makes it taller than short screens; it scrolls instead of running off the top. */}
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
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

            {(onImport || onExport) && (
              <>
                <div className="pt-2">
                  <hr className="border-border mb-2" />
                  <h3 className="text-lg font-medium">{data.section}</h3>
                </div>
                {onImport && <div className="space-y-2">
                  <Button variant="outline" onClick={onImport}>{data.open}</Button>
                  <p className="text-sm text-muted-foreground">{data.openDescription}</p>
                </div>}
                {onExport && <div className="space-y-2">
                  <Button variant="outline" onClick={onExport}>{transferCopy[lang].export.open}</Button>
                  <p className="text-sm text-muted-foreground">{transferCopy[lang].export.openDescription}</p>
                </div>}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
