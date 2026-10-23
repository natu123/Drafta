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
      {/* Compact enough to fit a laptop screen (about 650px high) without scrolling: the choices sit in
          a row and import and export side by side (2026-10-23, Gles's request, 0.10.4; it was 739px
          high). Shorter screens still scroll instead of running off the top. */}
      <DialogContent className="max-w-lg max-h-[calc(100dvh-2rem)] gap-3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.settingsTitle}</DialogTitle>
          <DialogDescription>{t.settingsDesc}</DialogDescription>
        </DialogHeader>
        <section className="space-y-2 border-t pt-3">
          <h3 className="font-semibold">{t.appearance}</h3>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Label id="settings-theme">{t.theme}</Label>
            {mounted && (
              <RadioGroup aria-labelledby="settings-theme" value={theme} onValueChange={setTheme} className="flex flex-wrap gap-x-5 gap-y-2">
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
        </section>

        <section className="space-y-2 border-t pt-3">
          <h3 className="font-semibold">{t.listStyle}</h3>
          <Label id="settings-list-style">{t.newItemPos}</Label>
          <RadioGroup aria-labelledby="settings-list-style" value={scrollDirection} onValueChange={(v) => onScrollDirectionChange(v as 'top' | 'bottom')} className="flex flex-wrap gap-x-5 gap-y-2">
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
        </section>

        {(onImport || onExport) && (
          <section className="space-y-2 border-t pt-3">
            <h3 className="font-semibold">{data.section}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {onImport && <div className="space-y-1.5">
                <Button variant="outline" size="sm" onClick={onImport}>{data.open}</Button>
                <p className="text-sm text-muted-foreground">{data.openDescription}</p>
              </div>}
              {onExport && <div className="space-y-1.5">
                <Button variant="outline" size="sm" onClick={onExport}>{transferCopy[lang].export.open}</Button>
                <p className="text-sm text-muted-foreground">{transferCopy[lang].export.openDescription}</p>
              </div>}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
