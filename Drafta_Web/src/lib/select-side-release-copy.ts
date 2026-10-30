import type { Lang } from '@/app/languages';

export const selectSideReleaseCopy: Record<Lang, string> = {
  en: 'Select all (Ctrl+A, or the iPhone’s menu) now selects only the title or only the body, whichever the caret is in. On PCs, a drag that starts just left of the body text now selects too.',
  ja: 'すべてを選択 (Ctrl+A、iPhoneのメニュー) で、カーソルのある側 (タイトルだけ、または本文だけ) を選ぶようにしました。PCで、本文の左の余白から始めたドラッグでも選択できるようにしました。',
  'zh-CN': '全选 (Ctrl+A 或 iPhone 的菜单) 现在只选择光标所在的一侧 (仅标题或仅正文). 在电脑上, 从正文左侧空白处开始拖动也能选择了.',
  ko: '모두 선택 (Ctrl+A, iPhone 의 메뉴) 은 이제 커서가 있는 쪽 (제목만 또는 본문만) 을 선택합니다. PC 에서 본문 왼쪽 여백에서 시작한 드래그로도 선택할 수 있습니다.',
  es: 'Seleccionar todo (Ctrl+A o el menú del iPhone) ahora selecciona solo el título o solo el cuerpo, según dónde esté el cursor. En el ordenador, arrastrar desde justo a la izquierda del texto del cuerpo ahora también selecciona.',
  fr: 'Tout sélectionner (Ctrl+A ou le menu de l’iPhone) ne sélectionne plus que le titre ou que le corps, selon l’emplacement du curseur. Sur ordinateur, un glisser commencé juste à gauche du texte du corps sélectionne désormais aussi.',
  'pt-BR': 'Selecionar tudo (Ctrl+A ou o menu do iPhone) agora seleciona só o título ou só o corpo, onde estiver o cursor. No computador, arrastar a partir do espaço à esquerda do texto do corpo agora também seleciona.',
  hi: 'सब चुनें (Ctrl+A या iPhone का मेनू) अब केवल शीर्षक या केवल मुख्य भाग चुनता है, जहाँ कर्सर हो. कंप्यूटर पर मुख्य भाग के पाठ के ठीक बाईं ओर से शुरू किया गया खिंचाव भी अब चुनता है.',
  ar: 'صار «تحديد الكل» (Ctrl+A أو قائمة iPhone) يحدد العنوان وحده أو النص وحده بحسب موضع المؤشر. وعلى الحاسوب، صار السحب الذي يبدأ يسار نص المذكرة مباشرة يحدد أيضًا.',
  ru: '«Выделить всё» (Ctrl+A или меню iPhone) теперь выделяет только заголовок или только текст — там, где курсор. На компьютере перетаскивание, начатое слева от текста, теперь тоже выделяет.',
  id: 'Pilih semua (Ctrl+A atau menu iPhone) kini hanya memilih judul atau hanya isi, sesuai letak kursor. Di komputer, menyeret yang dimulai tepat di kiri teks isi kini juga memilih.',
};
