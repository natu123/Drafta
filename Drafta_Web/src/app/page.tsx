"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Monitor, Smartphone, Apple, Terminal, CheckSquare, FileText, Sparkles, Globe, Feather, ChevronDown } from 'lucide-react';
import { LANGS, LANG_LABEL, translations } from './translations';
import { useLang } from '@/contexts/lang-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LandingPage() {
  const { lang, setLang } = useLang();
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E7A1B0]/10 via-background to-[#C49547]/10">

      {/* Sticky Nav Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Feather className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold font-headline tracking-tight text-foreground">Drafta</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Globe className="w-4 h-4 shrink-0 text-primary" />
                <span>{LANG_LABEL[lang]}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {LANGS.map((l) => (
                <DropdownMenuItem
                  key={l}
                  onSelect={() => setLang(l)}
                  className={lang === l ? 'bg-primary/10 text-primary font-medium' : ''}
                >
                  {LANG_LABEL[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#FFB7C5]/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#FFB7C5]/15 rounded-full blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[60px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-3 pb-12 md:pt-5 md:pb-16">
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E7A1B0]/15 border border-[#E7A1B0]/30 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#E7A1B0] animate-pulse" />
              <span className="text-foreground/80">{t.statusBadge}</span>
            </div>
          </div>

          {/* Main Tagline */}
          <p className="text-xl md:text-2xl text-center text-foreground mb-4 max-w-2xl mx-auto">
            {t.taglinePre}<span className="font-bold">{t.taglineBold}</span>
          </p>

          <p className="text-lg md:text-xl text-center text-primary/80 italic mb-10 max-w-xl mx-auto">
            {t.subTagline}
          </p>

          {/* Before/After Section */}
          <div className="max-w-3xl mx-auto mb-14">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600">
                <h3 className="text-base font-semibold mb-3 text-gray-500 dark:text-gray-400">{t.beforeTitle}</h3>
                <ul className="space-y-2 text-gray-500 dark:text-gray-400 text-sm">
                  {t.beforeItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="line-through">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-[#C49547]/10 border border-[#C49547]/30">
                <h3 className="text-base font-semibold mb-3 text-[#C49547]">{t.afterTitle}</h3>
                <ul className="space-y-2 text-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#C49547]" />
                    <span>{t.afterItems[0]}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C49547]" />
                    <span>{t.afterItems[1]}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C49547]" />
                    <span>{t.afterItems[2]}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
            <Link href="/app">
              <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                {t.ctaButton}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Notice */}
          <div className="max-w-md mx-auto p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t.noticeTitle}</span><br />
              {t.noticeBody}<br />
              {t.noticeFooter}
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-[60rem] mx-auto px-6 pt-10 pb-[5.5rem] border-t border-border/50">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          {t.featuresTitle}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<CheckSquare className="w-8 h-8" />}
            title={t.features[0].title}
            description={t.features[0].desc}
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title={t.features[1].title}
            description={t.features[1].desc}
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title={t.features[2].title}
            description={t.features[2].desc}
          />
        </div>
      </div>

      {/* Platform Section */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20 border-t border-border/50">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          {t.platformTitle}
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          {t.platformSubtitle}
        </p>

        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          <PlatformBadge icon={<Monitor className="w-6 h-6" />} label="Web" status="beta" betaLabel={t.platformBeta} comingLabel={t.platformComing} />
          <PlatformBadge icon={<Apple className="w-6 h-6" />} label="iOS" status="coming" betaLabel={t.platformBeta} comingLabel={t.platformComing} />
          <PlatformBadge icon={<Smartphone className="w-6 h-6" />} label="Android" status="coming" betaLabel={t.platformBeta} comingLabel={t.platformComing} />
          <PlatformBadge icon={<Monitor className="w-6 h-6" />} label="Windows" status="coming" betaLabel={t.platformBeta} comingLabel={t.platformComing} />
          <PlatformBadge icon={<Apple className="w-6 h-6" />} label="macOS" status="coming" betaLabel={t.platformBeta} comingLabel={t.platformComing} />
          <PlatformBadge icon={<Terminal className="w-6 h-6" />} label="Linux" status="coming" betaLabel={t.platformBeta} comingLabel={t.platformComing} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Drafta</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function PlatformBadge({ icon, label, status, betaLabel, comingLabel }: {
  icon: React.ReactNode;
  label: string;
  status: 'beta' | 'coming';
  betaLabel: string;
  comingLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
        status === 'beta'
          ? 'bg-primary/15 text-primary border-2 border-primary/30'
          : 'bg-muted text-muted-foreground border border-border/50'
      }`}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        status === 'beta'
          ? 'bg-primary/15 text-primary'
          : 'bg-muted text-muted-foreground'
      }`}>
        {status === 'beta' ? betaLabel : comingLabel}
      </span>
    </div>
  );
}
