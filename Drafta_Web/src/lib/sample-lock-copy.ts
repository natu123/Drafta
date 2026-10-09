import type { Lang } from '@/app/languages';

type Words = [notice: string, duplicate: string, duplicated: string];
const copy = ([notice, duplicate, duplicated]: Words) => ({ notice, duplicate, duplicated });

export const sampleLockCopy: Record<Lang, ReturnType<typeof copy>> = {
  en: copy(['This guide cannot be edited. Duplicate it to make your own editable copy.', 'Duplicate to edit', 'Created an editable copy.']),
  ja: copy(['このガイドは編集できません. 複製すると自由に編集できます.', '複製して編集', '編集できる複製を作成しました.']),
  'zh-CN': copy(['此指南无法编辑。复制后即可自由编辑。', '复制并编辑', '已创建可编辑的副本。']),
  ko: copy(['이 안내는 편집할 수 없습니다. 복제하면 자유롭게 편집할 수 있습니다.', '복제해서 편집', '편집할 수 있는 복제본을 만들었습니다.']),
  es: copy(['Esta guía no se puede editar. Duplícala para tener una copia editable.', 'Duplicar para editar', 'Se creó una copia editable.']),
  fr: copy(['Ce guide n’est pas modifiable. Dupliquez-le pour obtenir une copie modifiable.', 'Dupliquer pour modifier', 'Une copie modifiable a été créée.']),
  'pt-BR': copy(['Este guia não pode ser editado. Duplique-o para ter uma cópia editável.', 'Duplicar para editar', 'Uma cópia editável foi criada.']),
  hi: copy(['यह गाइड संपादित नहीं की जा सकती। संपादन योग्य प्रति के लिए इसे डुप्लिकेट करें।', 'डुप्लिकेट करके संपादित करें', 'संपादन योग्य प्रति बनाई गई।']),
  ar: copy(['لا يمكن تعديل هذا الدليل. أنشئ نسخة منه لتعديلها بحرية.', 'نسخ للتعديل', 'تم إنشاء نسخة قابلة للتعديل.']),
  ru: copy(['Это руководство нельзя редактировать. Создайте копию, чтобы изменять её.', 'Дублировать для правки', 'Создана копия для редактирования.']),
  id: copy(['Panduan ini tidak dapat diedit. Duplikat untuk membuat salinan yang bisa diedit.', 'Duplikat untuk mengedit', 'Salinan yang bisa diedit telah dibuat.']),
};
