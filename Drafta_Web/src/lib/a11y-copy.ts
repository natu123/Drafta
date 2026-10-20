import type { Lang } from '@/app/languages';

// Labels read by screen readers or shown as tooltips on icon-only controls. `{name}` is replaced with the item title.
type Words = [loadingEditor: string, selectSeparator: string, deleteSeparator: string, restoreMemo: string, deleteMemoForever: string, moveSelected: string, deleteSelected: string, cancelSelection: string, selectItems: string, restoreTray: string, deleteTrayForever: string, openTrays: string, closeTrays: string, backToMemos: string, closeTab: string];
const copy = ([loadingEditor, selectSeparator, deleteSeparator, restoreMemo, deleteMemoForever, moveSelected, deleteSelected, cancelSelection, selectItems, restoreTray, deleteTrayForever, openTrays, closeTrays, backToMemos, closeTab]: Words) => ({ loadingEditor, selectSeparator, deleteSeparator, restoreMemo, deleteMemoForever, moveSelected, deleteSelected, cancelSelection, selectItems, restoreTray, deleteTrayForever, openTrays, closeTrays, backToMemos, closeTab });
export type A11yCopy = ReturnType<typeof copy>;

export const a11yCopy: Record<Lang, A11yCopy> = {
  en: copy(['Loading editor', 'Select separator', 'Delete separator', 'Restore {name}', 'Delete {name} forever', 'Move selected', 'Delete selected', 'Cancel selection', 'Select items', 'Restore tray', 'Delete tray forever', 'Open trays', 'Close trays', 'Back to memos', 'Close {name}']),
  ja: copy(['エディタを読み込み中', '区切り線を選択', '区切り線を削除', '{name}を復元', '{name}を完全削除', '選択項目を移動', '選択項目を削除', '選択を解除', '項目を選択', 'トレイを復元', 'トレイを完全削除', 'トレイを開く', 'トレイを閉じる', 'メモ一覧に戻る', '{name}を閉じる']),
  'zh-CN': copy(['正在加载编辑器', '选择分隔线', '删除分隔线', '恢复{name}', '永久删除{name}', '移动所选项', '删除所选项', '取消选择', '选择项目', '恢复托盘', '永久删除托盘', '打开托盘', '关闭托盘', '返回备忘录', '关闭{name}']),
  ko: copy(['편집기 불러오는 중', '구분선 선택', '구분선 삭제', '{name} 복원', '{name} 영구 삭제', '선택 항목 이동', '선택 항목 삭제', '선택 취소', '항목 선택', '트레이 복원', '트레이 영구 삭제', '트레이 열기', '트레이 닫기', '메모로 돌아가기', '{name} 닫기']),
  hi: copy(['एडिटर लोड हो रहा है', 'विभाजक चुनें', 'विभाजक हटाएं', '{name} रीस्टोर करें', '{name} हमेशा के लिए हटाएं', 'चुने गए आइटम ले जाएं', 'चुने गए आइटम हटाएं', 'चयन रद्द करें', 'आइटम चुनें', 'ट्रे रीस्टोर करें', 'ट्रे हमेशा के लिए हटाएं', 'ट्रे खोलें', 'ट्रे बंद करें', 'नोट्स पर वापस जाएं', '{name} बंद करें']),
  ar: copy(['جارٍ تحميل المحرر', 'تحديد الفاصل', 'حذف الفاصل', 'استعادة {name}', 'حذف {name} نهائيًا', 'نقل العناصر المحددة', 'حذف العناصر المحددة', 'إلغاء التحديد', 'تحديد العناصر', 'استعادة الدرج', 'حذف الدرج نهائيًا', 'فتح الأدراج', 'إغلاق الأدراج', 'العودة إلى الملاحظات', 'إغلاق {name}']),
  ru: copy(['Загрузка редактора', 'Выбрать разделитель', 'Удалить разделитель', 'Восстановить «{name}»', 'Удалить «{name}» навсегда', 'Переместить выбранное', 'Удалить выбранное', 'Отменить выбор', 'Выбрать элементы', 'Восстановить лоток', 'Удалить лоток навсегда', 'Открыть лотки', 'Закрыть лотки', 'Назад к заметкам', 'Закрыть «{name}»']),
  id: copy(['Memuat editor', 'Pilih pemisah', 'Hapus pemisah', 'Pulihkan {name}', 'Hapus {name} selamanya', 'Pindahkan yang dipilih', 'Hapus yang dipilih', 'Batalkan pilihan', 'Pilih item', 'Pulihkan nampan', 'Hapus nampan selamanya', 'Buka nampan', 'Tutup nampan', 'Kembali ke catatan', 'Tutup {name}']),
  es: copy(['Cargando editor', 'Seleccionar separador', 'Eliminar separador', 'Restaurar {name}', 'Eliminar {name} para siempre', 'Mover seleccionados', 'Eliminar seleccionados', 'Cancelar selección', 'Seleccionar elementos', 'Restaurar bandeja', 'Eliminar bandeja para siempre', 'Abrir bandejas', 'Cerrar bandejas', 'Volver a las notas', 'Cerrar {name}']),
  fr: copy(['Chargement de l’éditeur', 'Sélectionner le séparateur', 'Supprimer le séparateur', 'Restaurer {name}', 'Supprimer {name} définitivement', 'Déplacer la sélection', 'Supprimer la sélection', 'Annuler la sélection', 'Sélectionner des éléments', 'Restaurer le bac', 'Supprimer le bac définitivement', 'Ouvrir les bacs', 'Fermer les bacs', 'Retour aux notes', 'Fermer {name}']),
  'pt-BR': copy(['Carregando editor', 'Selecionar separador', 'Excluir separador', 'Restaurar {name}', 'Excluir {name} permanentemente', 'Mover selecionados', 'Excluir selecionados', 'Cancelar seleção', 'Selecionar itens', 'Restaurar bandeja', 'Excluir bandeja permanentemente', 'Abrir bandejas', 'Fechar bandejas', 'Voltar às notas', 'Fechar {name}']),
};

export const withName = (template: string, name: string) => template.replace('{name}', name);
