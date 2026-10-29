import type { Lang } from '@/app/languages';

/** The public share page (specs/24_share_links.md, 2.6). */
export type ShareCopy = { loading: string; unavailable: string; madeWith: string };

export const shareCopy: Record<Lang, ShareCopy> = {
  en: { loading: 'Loading…', unavailable: 'This memo is not shared.', madeWith: 'Made with Drafta' },
  ja: { loading: '読み込んでいます…', unavailable: 'このメモは公開されていません.', madeWith: 'Draftaで作成' },
  'zh-CN': { loading: '正在加载…', unavailable: '此备忘录未公开.', madeWith: '使用 Drafta 创建' },
  ko: { loading: '불러오는 중…', unavailable: '이 메모는 공개되어 있지 않습니다.', madeWith: 'Drafta 로 작성' },
  es: { loading: 'Cargando…', unavailable: 'Esta nota no está compartida.', madeWith: 'Hecho con Drafta' },
  fr: { loading: 'Chargement…', unavailable: 'Cette note n’est pas partagée.', madeWith: 'Créé avec Drafta' },
  'pt-BR': { loading: 'Carregando…', unavailable: 'Esta nota não está compartilhada.', madeWith: 'Feito com o Drafta' },
  hi: { loading: 'लोड हो रहा है…', unavailable: 'यह मेमो साझा नहीं है.', madeWith: 'Drafta से बनाया गया' },
  ar: { loading: 'جارٍ التحميل…', unavailable: 'هذه المذكرة غير مشتركة.', madeWith: 'أُنشئت باستخدام Drafta' },
  ru: { loading: 'Загрузка…', unavailable: 'Эта заметка не опубликована.', madeWith: 'Сделано в Drafta' },
  id: { loading: 'Memuat…', unavailable: 'Memo ini tidak dibagikan.', madeWith: 'Dibuat dengan Drafta' },
};
