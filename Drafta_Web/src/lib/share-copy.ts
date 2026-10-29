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

/** The share button and its popover in the memo toolbar, and the list's mark (specs/24, 4). */
export type ShareActionCopy = {
  share: string; shared: string; offerTitle: string; offerBody: string; proOnly: string; create: string; creating: string;
  link: string; copy: string; copied: string; open: string; follows: string; paused: string; stop: string; failed: string;
};

export const shareActionCopy: Record<Lang, ShareActionCopy> = {
  en: { share: 'Share', shared: 'Shared', offerTitle: 'Share this memo with a link', offerBody: 'Anyone with the link can read it without signing in. Your edits appear there automatically.', proOnly: 'Share links are a Pro feature.', create: 'Create link', creating: 'Creating…',
    link: 'Share link', copy: 'Copy', copied: 'Copied', open: 'Open', follows: 'Your edits appear automatically.', paused: 'Not shown while you are not on Pro. Get Pro again to show it at the same link.', stop: 'Stop sharing', failed: 'That did not work. Please try again.' },
  ja: { share: '共有', shared: '共有中', offerTitle: 'メモをリンクで公開', offerBody: 'リンクを知っている人は, ログインなしで読めます. 編集は自動で反映されます.', proOnly: '共有リンクはProの機能です.', create: 'リンクを作成', creating: '作成しています…',
    link: '共有リンク', copy: 'コピー', copied: 'コピーしました', open: '開く', follows: '編集は自動で反映されます.', paused: 'Proでない間は公開されません. Proに戻すと, 同じリンクで再び公開されます.', stop: '共有をやめる', failed: 'うまくいきませんでした. もう一度お試しください.' },
  'zh-CN': { share: '分享', shared: '分享中', offerTitle: '通过链接公开此备忘录', offerBody: '知道链接的人无需登录即可阅读. 编辑会自动同步.', proOnly: '分享链接是 Pro 功能.', create: '创建链接', creating: '正在创建…',
    link: '分享链接', copy: '复制', copied: '已复制', open: '打开', follows: '编辑会自动同步.', paused: '不是 Pro 期间不会公开. 恢复 Pro 后, 会以同一链接再次公开.', stop: '停止分享', failed: '操作失败. 请重试.' },
  ko: { share: '공유', shared: '공유 중', offerTitle: '링크로 메모 공개', offerBody: '링크를 아는 사람은 로그인 없이 읽을 수 있습니다. 편집 내용은 자동으로 반영됩니다.', proOnly: '공유 링크는 Pro 기능입니다.', create: '링크 만들기', creating: '만드는 중…',
    link: '공유 링크', copy: '복사', copied: '복사했습니다', open: '열기', follows: '편집 내용은 자동으로 반영됩니다.', paused: 'Pro 가 아닌 동안에는 공개되지 않습니다. Pro 로 돌아오면 같은 링크로 다시 공개됩니다.', stop: '공유 중지', failed: '실패했습니다. 다시 시도해 주세요.' },
  es: { share: 'Compartir', shared: 'Compartida', offerTitle: 'Compartir esta nota con un enlace', offerBody: 'Quien tenga el enlace puede leerla sin iniciar sesión. Tus cambios aparecen ahí automáticamente.', proOnly: 'Los enlaces para compartir son una función Pro.', create: 'Crear enlace', creating: 'Creando…',
    link: 'Enlace para compartir', copy: 'Copiar', copied: 'Copiado', open: 'Abrir', follows: 'Tus cambios aparecen automáticamente.', paused: 'No se muestra mientras no tengas Pro. Vuelve a Pro para mostrarla en el mismo enlace.', stop: 'Dejar de compartir', failed: 'No funcionó. Inténtalo de nuevo.' },
  fr: { share: 'Partager', shared: 'Partagée', offerTitle: 'Partager cette note par un lien', offerBody: 'Toute personne disposant du lien peut la lire sans se connecter. Vos modifications y apparaissent automatiquement.', proOnly: 'Les liens de partage sont une fonction Pro.', create: 'Créer le lien', creating: 'Création…',
    link: 'Lien de partage', copy: 'Copier', copied: 'Copié', open: 'Ouvrir', follows: 'Vos modifications apparaissent automatiquement.', paused: 'Non affichée tant que vous n’êtes pas Pro. Repassez à Pro pour l’afficher au même lien.', stop: 'Arrêter le partage', failed: 'Cela n’a pas fonctionné. Réessayez.' },
  'pt-BR': { share: 'Compartilhar', shared: 'Compartilhada', offerTitle: 'Compartilhar esta nota com um link', offerBody: 'Quem tiver o link pode ler sem entrar. Suas edições aparecem lá automaticamente.', proOnly: 'Links de compartilhamento são um recurso Pro.', create: 'Criar link', creating: 'Criando…',
    link: 'Link de compartilhamento', copy: 'Copiar', copied: 'Copiado', open: 'Abrir', follows: 'Suas edições aparecem automaticamente.', paused: 'Não é exibida enquanto você não for Pro. Volte ao Pro para exibi-la no mesmo link.', stop: 'Parar de compartilhar', failed: 'Não funcionou. Tente novamente.' },
  hi: { share: 'साझा करें', shared: 'साझा है', offerTitle: 'इस मेमो को लिंक से साझा करें', offerBody: 'लिंक वाला कोई भी व्यक्ति बिना साइन इन किए इसे पढ़ सकता है. आपके बदलाव अपने आप दिखते हैं.', proOnly: 'साझा लिंक Pro की सुविधा है.', create: 'लिंक बनाएँ', creating: 'बन रहा है…',
    link: 'साझा लिंक', copy: 'कॉपी करें', copied: 'कॉपी हो गया', open: 'खोलें', follows: 'आपके बदलाव अपने आप दिखते हैं.', paused: 'Pro न होने तक यह नहीं दिखेगा. फिर से Pro लेने पर यह उसी लिंक पर दिखेगा.', stop: 'साझा करना बंद करें', failed: 'यह नहीं हो सका. फिर से कोशिश करें.' },
  ar: { share: 'مشاركة', shared: 'مُشاركة', offerTitle: 'مشاركة هذه المذكرة برابط', offerBody: 'يمكن لأي شخص لديه الرابط قراءتها دون تسجيل الدخول. تظهر تعديلاتك هناك تلقائيًا.', proOnly: 'روابط المشاركة ميزة في Pro.', create: 'إنشاء رابط', creating: 'جارٍ الإنشاء…',
    link: 'رابط المشاركة', copy: 'نسخ', copied: 'تم النسخ', open: 'فتح', follows: 'تظهر تعديلاتك تلقائيًا.', paused: 'لا تظهر ما دمت لست مشتركًا في Pro. اشترك في Pro مجددًا لتظهر على الرابط نفسه.', stop: 'إيقاف المشاركة', failed: 'لم ينجح ذلك. حاول مرة أخرى.' },
  ru: { share: 'Поделиться', shared: 'Опубликована', offerTitle: 'Поделиться заметкой по ссылке', offerBody: 'Любой, у кого есть ссылка, может прочитать её без входа. Ваши правки появляются там автоматически.', proOnly: 'Ссылки для обмена доступны в Pro.', create: 'Создать ссылку', creating: 'Создаём…',
    link: 'Ссылка для обмена', copy: 'Копировать', copied: 'Скопировано', open: 'Открыть', follows: 'Ваши правки появляются автоматически.', paused: 'Не показывается, пока у вас нет Pro. Вернитесь на Pro, чтобы снова показать её по той же ссылке.', stop: 'Закрыть доступ', failed: 'Не получилось. Попробуйте ещё раз.' },
  id: { share: 'Bagikan', shared: 'Dibagikan', offerTitle: 'Bagikan memo ini dengan tautan', offerBody: 'Siapa pun yang memiliki tautan dapat membacanya tanpa masuk. Suntingan Anda muncul di sana secara otomatis.', proOnly: 'Tautan berbagi adalah fitur Pro.', create: 'Buat tautan', creating: 'Membuat…',
    link: 'Tautan berbagi', copy: 'Salin', copied: 'Tersalin', open: 'Buka', follows: 'Suntingan Anda muncul secara otomatis.', paused: 'Tidak ditampilkan selama Anda tidak berlangganan Pro. Kembali ke Pro untuk menampilkannya di tautan yang sama.', stop: 'Berhenti berbagi', failed: 'Tidak berhasil. Silakan coba lagi.' },
};
