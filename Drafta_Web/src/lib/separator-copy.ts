import type { Lang } from '@/app/languages';

// Placing a separator in the memo or tray list (AGENTS.md, Separators).
type Words = [choose: string, placeHere: string];
const copy = ([choose, placeHere]: Words) => ({ choose, placeHere });
export type SeparatorCopy = ReturnType<typeof copy>;

export const separatorCopy: Record<Lang, SeparatorCopy> = {
  en: copy(['Choose where the separator goes', 'Put here']),
  ja: copy(['区切り線を入れる場所を選んでください', 'ここに入れる']),
  'zh-CN': copy(['请选择分隔线的位置', '放在这里']),
  ko: copy(['구분선을 넣을 곳을 고르세요', '여기에 넣기']),
  hi: copy(['चुनें कि विभाजक कहाँ जाए', 'यहाँ रखें']),
  ar: copy(['اختر مكان الفاصل', 'ضعه هنا']),
  ru: copy(['Выберите место для разделителя', 'Сюда']),
  id: copy(['Pilih tempat pemisah', 'Taruh di sini']),
  es: copy(['Elige dónde va el separador', 'Poner aquí']),
  fr: copy(['Choisissez où placer le séparateur', 'Placer ici']),
  'pt-BR': copy(['Escolha onde o separador vai', 'Colocar aqui']),
};
