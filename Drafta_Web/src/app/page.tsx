"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Monitor, Smartphone, Apple, Terminal, CheckSquare, FileText, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-3 pb-12 md:pt-5 md:pb-16">
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E7A1B0]/15 border border-[#E7A1B0]/30 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#E7A1B0] animate-pulse" />
              <span className="text-foreground/80">Beta - 正式リリース 準備中</span>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-center mb-6 tracking-tight">
            <span className="text-primary">Drafta</span>
          </h1>

          {/* Main Tagline */}
          <p className="text-xl md:text-2xl text-center text-foreground mb-4 max-w-2xl mx-auto">
            「ToDoと ノートを統合した <span className="font-bold">新しいメモアプリ</span>」
          </p>

          <p className="text-lg md:text-xl text-center text-primary/80 italic mb-10 max-w-xl mx-auto">
            Organize your to-dos and thoughts seamlessly.
          </p>

          {/* Before/After Section */}
          <div className="max-w-3xl mx-auto mb-14">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600">
                <h3 className="text-base font-semibold mb-3 text-gray-500 dark:text-gray-400">Before</h3>
                <ul className="space-y-2 text-gray-500 dark:text-gray-400 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="line-through">タスクはToDoアプリ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="line-through">メモはノートアプリ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="line-through">散らばった情報</span>
                  </li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-[#C49547]/10 border border-[#C49547]/30">
                <h3 className="text-base font-semibold mb-3 text-[#C49547]">After with Drafta</h3>
                <ul className="space-y-2 text-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#C49547]" />
                    <span>すべてが一箇所に</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C49547]" />
                    <span>構造化された知識</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C49547]" />
                    <span>磨かれたアイデア</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
            <Link href="/app">
              <Button size="lg" className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
                Try Drafta-web!
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Notice */}
          <div className="max-w-md mx-auto p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">「Web版は 試験公開中です。」</span><br />
              現在、データはブラウザに保存されません。<br />
              正式リリースをお待ちください。
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-[60rem] mx-auto px-6 pt-10 pb-[5.5rem] border-t border-border/50">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Features
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<CheckSquare className="w-8 h-8" />}
            title="ToDo + Notes"
            description="タスクとノートを1つのアプリに統合！"
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Rich & Plain Mode"
            description="リッチ ⇄ Markdownをワンクリックで切り替え！"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="Improved Markdown"
            description="Drafta-MD：色付きテキスト＆スマートな番号リストを搭載！"
          />
        </div>
      </div>

      {/* Platform Section */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20 border-t border-border/50">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          Coming to All Platforms
        </h2>
        <p className="text-center text-muted-foreground mb-12">
          順次、各プラットフォーム向けにリリース予定
        </p>

        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          <PlatformBadge icon={<Monitor className="w-6 h-6" />} label="Web" status="beta" />
          <PlatformBadge icon={<Apple className="w-6 h-6" />} label="iOS" status="coming" />
          <PlatformBadge icon={<Smartphone className="w-6 h-6" />} label="Android" status="coming" />
          <PlatformBadge icon={<Monitor className="w-6 h-6" />} label="Windows" status="coming" />
          <PlatformBadge icon={<Apple className="w-6 h-6" />} label="macOS" status="coming" />
          <PlatformBadge icon={<Terminal className="w-6 h-6" />} label="Linux" status="coming" />
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

function PlatformBadge({ icon, label, status }: { icon: React.ReactNode; label: string; status: 'beta' | 'coming' }) {
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
        {status === 'beta' ? 'Beta' : 'Coming Soon'}
      </span>
    </div>
  );
}
