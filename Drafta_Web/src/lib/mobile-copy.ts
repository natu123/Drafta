import type { Lang } from '@/app/languages';

// The phone's bottom navigation, the open tabs list and the editor's memo actions (specs/19_mobile_design.md).
// `{name}` is replaced with the tray name.
type Words = [nav: string, newMemo: string, tabs: string, openTabs: string, noTabs: string, memoActions: string, addMemoTo: string];
const copy = ([nav, newMemo, tabs, openTabs, noTabs, memoActions, addMemoTo]: Words) => ({ nav, newMemo, tabs, openTabs, noTabs, memoActions, addMemoTo });
export type MobileCopy = ReturnType<typeof copy>;

export const mobileCopy: Record<Lang, MobileCopy> = {
  en: copy(['Main menu', 'New', 'Tabs', 'Open tabs', 'No open memos', 'Memo actions', 'Add memo to {name}']),
  ja: copy(['メインメニュー', '新規', 'タブ', '開いているタブ', '開いているメモはありません', 'メモの操作', '{name}にメモを追加']),
  'zh-CN': copy(['主菜单', '新建', '标签', '打开的标签', '没有打开的备忘录', '备忘录操作', '添加备忘录到{name}']),
  ko: copy(['메인 메뉴', '새로 만들기', '탭', '열린 탭', '열린 메모가 없습니다', '메모 작업', '{name}에 메모 추가']),
  hi: copy(['मुख्य मेनू', 'नया', 'टैब', 'खुले टैब', 'कोई नोट खुला नहीं है', 'नोट की क्रियाएं', '{name} में नोट जोड़ें']),
  ar: copy(['القائمة الرئيسية', 'جديد', 'التبويبات', 'التبويبات المفتوحة', 'لا توجد ملاحظات مفتوحة', 'إجراءات الملاحظة', 'إضافة ملاحظة إلى {name}']),
  ru: copy(['Главное меню', 'Новая', 'Вкладки', 'Открытые вкладки', 'Нет открытых заметок', 'Действия с заметкой', 'Добавить заметку в «{name}»']),
  id: copy(['Menu utama', 'Baru', 'Tab', 'Tab terbuka', 'Tidak ada catatan yang terbuka', 'Tindakan catatan', 'Tambah catatan ke {name}']),
  es: copy(['Menú principal', 'Nueva', 'Pestañas', 'Pestañas abiertas', 'No hay notas abiertas', 'Acciones de la nota', 'Añadir nota a {name}']),
  fr: copy(['Menu principal', 'Nouvelle', 'Onglets', 'Onglets ouverts', 'Aucune note ouverte', 'Actions sur la note', 'Ajouter une note à {name}']),
  'pt-BR': copy(['Menu principal', 'Nova', 'Abas', 'Abas abertas', 'Nenhuma nota aberta', 'Ações da nota', 'Adicionar nota a {name}']),
};
