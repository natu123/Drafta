import type { Lang } from '@/app/languages';
import type { MigrationStep } from './cloud-workspace-migration';

/** Words for memo bodies arriving on a new device and for the storage update (specs/17). */
export type StorageCopy = {
  hydrating: (loaded: number, total: number) => string;
  searchPreparing: (loaded: number, total: number) => string;
  bodyLoading: string;
  migration: {
    title: string; body: string; memos: (count: number) => string; backup: string; backupNote: string;
    start: string; steps: Record<MigrationStep, string>; failed: string; retry: string;
  };
};

export const storageCopy: Record<Lang, StorageCopy> = {
  en: {
    hydrating: (loaded, total) => `Loading memos (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `Preparing search (${loaded} / ${total} memos)`,
    bodyLoading: 'Loading this memo…',
    migration: {
      title: 'Update how memos are stored',
      body: 'Drafta 0.8.0 stores each memo’s list entry and body separately: the list appears sooner on a new device, and a workspace can hold four times more. The update runs once and takes about a minute. Close Drafta on your other devices and tabs first.',
      memos: count => `${count} memos`,
      backup: 'Save a backup (JSON)',
      backupNote: 'Before the update, a copy is also kept on this device until you sign out.',
      start: 'Start the update',
      steps: { reading: 'Reading memos', bodies: 'Saving memo bodies', summaries: 'Saving list entries', switching: 'Switching to the new storage', verifying: 'Checking every memo', cleaning: 'Removing old fields', done: 'Done. Opening Drafta…' },
      failed: 'The update did not finish. No memo was lost. Please try again.',
      retry: 'Try again',
    },
  },
  ja: {
    hydrating: (loaded, total) => `本文を読み込み中 (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `検索の準備中 (${loaded} / ${total}件)`,
    bodyLoading: 'このメモの本文を読み込み中…',
    migration: {
      title: '保存形式の更新',
      body: 'Drafta 0.8.0では, 一覧用の要約と本文を分けて保存します. 新しい端末でも一覧がすぐ表示され, 保存できる量も4倍になります. 更新は1回だけで, 1分ほどかかります. 始める前に, 他の端末やタブのDraftaを閉じてください.',
      memos: count => `${count}件のメモ`,
      backup: 'バックアップを保存 (JSON)',
      backupNote: '更新の前に, この端末にもコピーを保存します (ログアウトで消えます).',
      start: '更新を始める',
      steps: { reading: 'メモを読み込み中', bodies: '本文を保存中', summaries: '一覧用の要約を保存中', switching: '保存形式を切り替え中', verifying: '全メモの内容を確認中', cleaning: '古い項目を整理中', done: '完了しました. Draftaを開きます…' },
      failed: '更新を完了できませんでした. メモは消えていません. もう一度お試しください.',
      retry: '再試行',
    },
  },
  'zh-CN': {
    hydrating: (loaded, total) => `正在加载正文 (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `正在准备搜索 (${loaded} / ${total}条)`,
    bodyLoading: '正在加载此备忘录的正文…',
    migration: {
      title: '更新备忘录的保存方式',
      body: 'Drafta 0.8.0 将列表用的摘要与正文分开保存: 在新设备上列表会更快显示, 可保存的容量也增加到4倍. 更新只需进行一次, 约需1分钟. 开始前请关闭其他设备和标签页中的 Drafta.',
      memos: count => `${count}条备忘录`,
      backup: '保存备份 (JSON)',
      backupNote: '更新前也会在此设备上保留一份副本 (退出登录后删除).',
      start: '开始更新',
      steps: { reading: '正在读取备忘录', bodies: '正在保存正文', summaries: '正在保存列表摘要', switching: '正在切换到新的保存方式', verifying: '正在检查所有备忘录', cleaning: '正在清理旧字段', done: '已完成. 正在打开 Drafta…' },
      failed: '未能完成更新. 没有丢失任何备忘录. 请重试.',
      retry: '重试',
    },
  },
  ko: {
    hydrating: (loaded, total) => `본문 불러오는 중 (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `검색 준비 중 (${loaded} / ${total}개)`,
    bodyLoading: '이 메모의 본문을 불러오는 중…',
    migration: {
      title: '메모 저장 방식 업데이트',
      body: 'Drafta 0.8.0은 목록용 요약과 본문을 나누어 저장합니다. 새 기기에서도 목록이 바로 표시되고, 저장할 수 있는 양도 4배가 됩니다. 업데이트는 한 번만 하며 1분 정도 걸립니다. 시작하기 전에 다른 기기와 탭의 Drafta를 닫아 주세요.',
      memos: count => `메모 ${count}개`,
      backup: '백업 저장 (JSON)',
      backupNote: '업데이트 전에 이 기기에도 사본을 보관합니다 (로그아웃하면 삭제됩니다).',
      start: '업데이트 시작',
      steps: { reading: '메모를 읽는 중', bodies: '본문을 저장하는 중', summaries: '목록용 요약을 저장하는 중', switching: '새 저장 방식으로 전환하는 중', verifying: '모든 메모를 확인하는 중', cleaning: '이전 항목을 정리하는 중', done: '완료되었습니다. Drafta를 엽니다…' },
      failed: '업데이트를 완료하지 못했습니다. 메모는 사라지지 않았습니다. 다시 시도해 주세요.',
      retry: '다시 시도',
    },
  },
  es: {
    hydrating: (loaded, total) => `Cargando notas (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `Preparando la búsqueda (${loaded} / ${total} notas)`,
    bodyLoading: 'Cargando esta nota…',
    migration: {
      title: 'Actualizar cómo se guardan las notas',
      body: 'Drafta 0.8.0 guarda por separado la entrada de la lista y el cuerpo de cada nota: la lista aparece antes en un dispositivo nuevo y un espacio de trabajo puede guardar cuatro veces más. La actualización se hace una sola vez y tarda alrededor de un minuto. Antes, cierra Drafta en tus otros dispositivos y pestañas.',
      memos: count => `${count} notas`,
      backup: 'Guardar una copia de seguridad (JSON)',
      backupNote: 'Antes de actualizar, también se guarda una copia en este dispositivo hasta que cierres sesión.',
      start: 'Iniciar la actualización',
      steps: { reading: 'Leyendo notas', bodies: 'Guardando el cuerpo de las notas', summaries: 'Guardando las entradas de la lista', switching: 'Cambiando al nuevo almacenamiento', verifying: 'Comprobando cada nota', cleaning: 'Quitando campos antiguos', done: 'Listo. Abriendo Drafta…' },
      failed: 'La actualización no terminó. No se perdió ninguna nota. Inténtalo de nuevo.',
      retry: 'Reintentar',
    },
  },
  fr: {
    hydrating: (loaded, total) => `Chargement des notes (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `Préparation de la recherche (${loaded} / ${total} notes)`,
    bodyLoading: 'Chargement de cette note…',
    migration: {
      title: 'Mettre à jour l’enregistrement des notes',
      body: 'Drafta 0.8.0 enregistre séparément l’entrée de liste et le contenu de chaque note : la liste s’affiche plus tôt sur un nouvel appareil et un espace peut contenir quatre fois plus. La mise à jour se fait une seule fois et prend environ une minute. Fermez d’abord Drafta sur vos autres appareils et onglets.',
      memos: count => `${count} notes`,
      backup: 'Enregistrer une sauvegarde (JSON)',
      backupNote: 'Avant la mise à jour, une copie est aussi conservée sur cet appareil jusqu’à la déconnexion.',
      start: 'Lancer la mise à jour',
      steps: { reading: 'Lecture des notes', bodies: 'Enregistrement du contenu', summaries: 'Enregistrement des entrées de liste', switching: 'Passage au nouvel enregistrement', verifying: 'Vérification de chaque note', cleaning: 'Suppression des anciens champs', done: 'Terminé. Ouverture de Drafta…' },
      failed: 'La mise à jour n’a pas abouti. Aucune note n’a été perdue. Réessayez.',
      retry: 'Réessayer',
    },
  },
  'pt-BR': {
    hydrating: (loaded, total) => `Carregando notas (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `Preparando a busca (${loaded} / ${total} notas)`,
    bodyLoading: 'Carregando esta nota…',
    migration: {
      title: 'Atualizar como as notas são salvas',
      body: 'O Drafta 0.8.0 salva separadamente a entrada da lista e o conteúdo de cada nota: a lista aparece antes em um dispositivo novo e um espaço de trabalho comporta quatro vezes mais. A atualização acontece uma única vez e leva cerca de um minuto. Antes, feche o Drafta nos seus outros dispositivos e abas.',
      memos: count => `${count} notas`,
      backup: 'Salvar um backup (JSON)',
      backupNote: 'Antes da atualização, uma cópia também fica neste dispositivo até você sair.',
      start: 'Iniciar a atualização',
      steps: { reading: 'Lendo notas', bodies: 'Salvando o conteúdo das notas', summaries: 'Salvando as entradas da lista', switching: 'Mudando para o novo armazenamento', verifying: 'Verificando cada nota', cleaning: 'Removendo campos antigos', done: 'Pronto. Abrindo o Drafta…' },
      failed: 'A atualização não terminou. Nenhuma nota foi perdida. Tente novamente.',
      retry: 'Tentar novamente',
    },
  },
  hi: {
    hydrating: (loaded, total) => `नोट लोड हो रहे हैं (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `खोज तैयार हो रही है (${loaded} / ${total} नोट)`,
    bodyLoading: 'यह नोट लोड हो रहा है…',
    migration: {
      title: 'नोट सहेजने का तरीका अपडेट करें',
      body: 'Drafta 0.8.0 हर नोट की सूची वाली जानकारी और सामग्री अलग-अलग सहेजता है: नए डिवाइस पर सूची जल्दी दिखती है, और वर्कस्पेस चार गुना ज़्यादा रख सकता है. अपडेट एक ही बार होता है और लगभग एक मिनट लगता है. पहले अपने दूसरे डिवाइस और टैब में Drafta बंद करें.',
      memos: count => `${count} नोट`,
      backup: 'बैकअप सहेजें (JSON)',
      backupNote: 'अपडेट से पहले इस डिवाइस पर भी एक प्रति रखी जाती है (साइन आउट करने पर हट जाती है).',
      start: 'अपडेट शुरू करें',
      steps: { reading: 'नोट पढ़े जा रहे हैं', bodies: 'नोट की सामग्री सहेजी जा रही है', summaries: 'सूची की जानकारी सहेजी जा रही है', switching: 'नए तरीके पर स्विच हो रहा है', verifying: 'हर नोट जाँचा जा रहा है', cleaning: 'पुराने फ़ील्ड हटाए जा रहे हैं', done: 'हो गया. Drafta खुल रहा है…' },
      failed: 'अपडेट पूरा नहीं हुआ. कोई नोट नहीं खोया. फिर से कोशिश करें.',
      retry: 'फिर कोशिश करें',
    },
  },
  ar: {
    hydrating: (loaded, total) => `جارٍ تحميل الملاحظات (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `جارٍ تجهيز البحث (${loaded} / ${total} ملاحظة)`,
    bodyLoading: 'جارٍ تحميل هذه الملاحظة…',
    migration: {
      title: 'تحديث طريقة حفظ الملاحظات',
      body: 'يحفظ Drafta 0.8.0 مدخل القائمة ومحتوى كل ملاحظة بشكل منفصل: تظهر القائمة أسرع على جهاز جديد، وتتسع مساحة العمل لأربعة أضعاف. يجري التحديث مرة واحدة ويستغرق نحو دقيقة. أغلق Drafta أولًا على أجهزتك وعلاماتك الأخرى.',
      memos: count => `${count} ملاحظة`,
      backup: 'حفظ نسخة احتياطية (JSON)',
      backupNote: 'قبل التحديث تُحفظ أيضًا نسخة على هذا الجهاز حتى تسجيل الخروج.',
      start: 'بدء التحديث',
      steps: { reading: 'جارٍ قراءة الملاحظات', bodies: 'جارٍ حفظ محتوى الملاحظات', summaries: 'جارٍ حفظ مدخلات القائمة', switching: 'جارٍ التبديل إلى طريقة الحفظ الجديدة', verifying: 'جارٍ التحقق من كل ملاحظة', cleaning: 'جارٍ إزالة الحقول القديمة', done: 'تم. جارٍ فتح Drafta…' },
      failed: 'لم يكتمل التحديث. لم تُفقد أي ملاحظة. حاول مرة أخرى.',
      retry: 'إعادة المحاولة',
    },
  },
  ru: {
    hydrating: (loaded, total) => `Загрузка заметок (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `Подготовка поиска (${loaded} / ${total} заметок)`,
    bodyLoading: 'Загрузка заметки…',
    migration: {
      title: 'Обновление способа хранения заметок',
      body: 'Drafta 0.8.0 хранит строку списка и текст каждой заметки отдельно: на новом устройстве список появляется быстрее, а пространство вмещает в четыре раза больше. Обновление выполняется один раз и занимает около минуты. Сначала закройте Drafta на других устройствах и вкладках.',
      memos: count => `Заметок: ${count}`,
      backup: 'Сохранить резервную копию (JSON)',
      backupNote: 'Перед обновлением копия также сохраняется на этом устройстве до выхода из аккаунта.',
      start: 'Начать обновление',
      steps: { reading: 'Чтение заметок', bodies: 'Сохранение текста заметок', summaries: 'Сохранение строк списка', switching: 'Переход на новое хранение', verifying: 'Проверка каждой заметки', cleaning: 'Удаление старых полей', done: 'Готово. Открываем Drafta…' },
      failed: 'Обновление не завершено. Заметки не потеряны. Попробуйте ещё раз.',
      retry: 'Повторить',
    },
  },
  id: {
    hydrating: (loaded, total) => `Memuat catatan (${loaded} / ${total})`,
    searchPreparing: (loaded, total) => `Menyiapkan pencarian (${loaded} / ${total} catatan)`,
    bodyLoading: 'Memuat catatan ini…',
    migration: {
      title: 'Perbarui cara catatan disimpan',
      body: 'Drafta 0.8.0 menyimpan entri daftar dan isi setiap catatan secara terpisah: daftar tampil lebih cepat di perangkat baru, dan ruang kerja dapat menampung empat kali lebih banyak. Pembaruan dilakukan sekali dan memakan waktu sekitar satu menit. Tutup Drafta di perangkat dan tab lain terlebih dahulu.',
      memos: count => `${count} catatan`,
      backup: 'Simpan cadangan (JSON)',
      backupNote: 'Sebelum pembaruan, salinan juga disimpan di perangkat ini sampai Anda keluar.',
      start: 'Mulai pembaruan',
      steps: { reading: 'Membaca catatan', bodies: 'Menyimpan isi catatan', summaries: 'Menyimpan entri daftar', switching: 'Beralih ke penyimpanan baru', verifying: 'Memeriksa setiap catatan', cleaning: 'Menghapus kolom lama', done: 'Selesai. Membuka Drafta…' },
      failed: 'Pembaruan belum selesai. Tidak ada catatan yang hilang. Silakan coba lagi.',
      retry: 'Coba lagi',
    },
  },
};
