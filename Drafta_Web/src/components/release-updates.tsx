'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLang } from '@/contexts/lang-context';
import { releaseCopy } from '@/lib/release-copy';
import { IMPLEMENTATION_HISTORY, RELEASES } from '@/lib/release-info';

export function ReleaseUpdates({ full = false }: { full?: boolean }) {
  const { lang } = useLang();
  const t = releaseCopy[lang];

  return (
    <div className="flex flex-col gap-6" dir={lang === 'ar' ? 'rtl' : undefined}>
      {(full ? RELEASES : RELEASES.slice(0, 1)).map(release => <article key={release.version} id={`v${release.version.replaceAll('.', '-')}`} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="text-lg font-semibold"><bdi>Version {release.version}</bdi></h3>
          <time className="text-sm text-muted-foreground" dateTime={release.date}>{release.date}</time>
          <span className="text-sm text-muted-foreground">{t.preview}</span>
        </div>
        <p className="leading-relaxed">{t[release.copyKey]}</p>
        <p className="text-sm text-muted-foreground">{release.version.startsWith('0.1.') ? t.legacyWarning : t.warning}</p>
      </article>)}
      {full ? (
        <section aria-labelledby="implementation-history" className="flex flex-col gap-5">
          <div>
            <h2 id="implementation-history" className="text-xl font-semibold">{t.historyTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.historyNote}</p>
          </div>
          <ol className="flex flex-col gap-5">
            {IMPLEMENTATION_HISTORY.map(({ date, copyKey }) => (
              <li key={copyKey} className="flex flex-col gap-1 border-s-2 border-border ps-4">
                <time dateTime={date} className="text-sm text-muted-foreground">{date}</time>
                <p className="leading-relaxed">{t[copyKey]}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <div><Button asChild variant="outline"><Link href="/updates/">{t.allUpdates}</Link></Button></div>
      )}
    </div>
  );
}

export function LandingRoadmap() {
  const { lang } = useLang();
  const t = releaseCopy[lang];
  const stages = [[t.next, t.nextBody], [t.later, t.laterBody], [t.future, t.futureBody]];
  return (
    <section id="roadmap" aria-labelledby="roadmap-title" data-nosnippet="" className="border-t border-border/50" dir={lang === 'ar' ? 'rtl' : undefined}>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h2 id="roadmap-title" className="text-2xl font-semibold">{t.roadmapTitle}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t.roadmapNote}</p>
        <ol className="mt-8 flex flex-col gap-6 md:flex-row md:gap-8">
          {stages.map(([title, body], index) => (
            <li key={title} className="min-w-0 flex-1">
              <p className="text-sm text-primary" aria-hidden="true">0{index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function UpdatesPageContent() {
  const { lang } = useLang();
  const t = releaseCopy[lang];
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10" dir={lang === 'ar' ? 'rtl' : undefined}>
      <Link href="/" className="w-fit text-sm text-primary underline underline-offset-4">{t.back}</Link>
      <h1 className="text-3xl font-bold">Drafta — {t.updates}</h1>
      <ReleaseUpdates full />
    </main>
  );
}
