"use client";

import * as React from 'react';
import Image from 'next/image';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLang } from '@/contexts/lang-context';
import { LANGS, LANG_LABEL } from '@/app/translations';
import { LANGUAGE_FLAGS } from '@/app/languages';

/** The language switcher, in the app bar on tablets and PCs or the tray list header on phones (specs/19, specs/21). */
export function LanguageMenu() {
  const { lang, setLang, t } = useLang();
  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.language}>
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.language}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t.language}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => setLang(l)}
            className={lang === l ? 'bg-primary/10 text-primary font-medium' : ''}
          >
            <Image src={`/flags/${LANGUAGE_FLAGS[l]}.svg`} alt="" width={20} height={20} className="shrink-0" />
            {LANG_LABEL[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
