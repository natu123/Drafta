import type { Lang } from '@/app/languages';
import type { Repeat } from './reminder-time';

/** The bell in the memo toolbar, its popover and the list's mark (specs/25_reminders.md, 2.3). */
export type ReminderCopy = {
  remind: string; set: string; offer: string; proOnly: string; when: string; repeat: string; repeats: Record<Repeat, string>;
  save: string; saving: string; change: string; remove: string; done: string; past: string;
  denied: string; install: string; unsupported: string; registerFailed: string; failed: string;
};

export const reminderCopy: Record<Lang, ReminderCopy> = {
  en: { remind: 'Reminder', set: 'Reminder set', offer: 'At the time you set, you get a notification.', proOnly: 'Reminders are a Pro feature.', when: 'Date and time', repeat: 'Repeat',
    repeats: { none: 'Never', daily: 'Every day', weekdays: 'Weekdays (Mon–Fri)', weekly: 'Every week', monthly: 'Every month' },
    save: 'Set', saving: 'Setting…', change: 'Change', remove: 'Remove', done: 'This reminder has ended.', past: 'That time has passed.',
    denied: 'Reminders will not reach this device until you allow notifications.', install: 'On iPhone, notifications come to Drafta added to the home screen.', unsupported: 'This browser cannot receive notifications.', registerFailed: 'This device could not be set up for notifications. Please try again.', failed: 'That did not work. Please try again.' },
  ja: { remind: 'リマインダー', set: 'リマインダー設定中', offer: '設定日時になると、通知が届きます。', proOnly: 'リマインダーはProの機能です。', when: '日時', repeat: '繰り返し',
    repeats: { none: 'なし', daily: '毎日', weekdays: '平日 (月〜金)', weekly: '毎週', monthly: '毎月' },
    save: '設定', saving: '設定しています…', change: '変更', remove: '解除', done: 'このリマインダーは終わりました。', past: 'この日時は過ぎています。',
    denied: '通知を許可するまで、この端末にはリマインダーが届きません。', install: 'iPhoneでは、ホーム画面に追加したDraftaで通知を受け取れます。', unsupported: 'このブラウザーでは通知を受け取れません。', registerFailed: 'この端末を通知の宛先にできませんでした。もう一度お試しください。', failed: 'うまくいきませんでした。もう一度お試しください。' },
  'zh-CN': { remind: '提醒', set: '已设置提醒', offer: '到了设置的时间, 就会收到通知.', proOnly: '提醒是 Pro 功能.', when: '日期和时间', repeat: '重复',
    repeats: { none: '不重复', daily: '每天', weekdays: '工作日 (周一至周五)', weekly: '每周', monthly: '每月' },
    save: '设置', saving: '正在设置…', change: '更改', remove: '取消提醒', done: '此提醒已结束.', past: '该时间已过.',
    denied: '在允许通知之前, 此设备不会收到提醒.', install: '在 iPhone 上, 添加到主屏幕的 Drafta 可以接收通知.', unsupported: '此浏览器无法接收通知.', registerFailed: '无法将此设备设为通知接收端. 请重试.', failed: '操作失败. 请重试.' },
  ko: { remind: '리마인더', set: '리마인더 설정됨', offer: '설정한 시간이 되면 알림이 옵니다.', proOnly: '리마인더는 Pro 기능입니다.', when: '날짜와 시간', repeat: '반복',
    repeats: { none: '안 함', daily: '매일', weekdays: '평일 (월~금)', weekly: '매주', monthly: '매월' },
    save: '설정', saving: '설정 중…', change: '변경', remove: '해제', done: '이 리마인더는 끝났습니다.', past: '이미 지난 시간입니다.',
    denied: '알림을 허용할 때까지 이 기기에는 리마인더가 오지 않습니다.', install: 'iPhone 에서는 홈 화면에 추가한 Drafta 로 알림을 받을 수 있습니다.', unsupported: '이 브라우저에서는 알림을 받을 수 없습니다.', registerFailed: '이 기기를 알림 수신 기기로 설정하지 못했습니다. 다시 시도해 주세요.', failed: '실패했습니다. 다시 시도해 주세요.' },
  es: { remind: 'Recordatorio', set: 'Recordatorio activo', offer: 'A la hora que elijas, recibirás una notificación.', proOnly: 'Los recordatorios son una función Pro.', when: 'Fecha y hora', repeat: 'Repetir',
    repeats: { none: 'Nunca', daily: 'Cada día', weekdays: 'Laborables (lun–vie)', weekly: 'Cada semana', monthly: 'Cada mes' },
    save: 'Establecer', saving: 'Estableciendo…', change: 'Cambiar', remove: 'Quitar', done: 'Este recordatorio terminó.', past: 'Esa hora ya pasó.',
    denied: 'Los recordatorios no llegarán a este dispositivo hasta que permitas las notificaciones.', install: 'En iPhone, las notificaciones llegan a Drafta añadido a la pantalla de inicio.', unsupported: 'Este navegador no puede recibir notificaciones.', registerFailed: 'No se pudo preparar este dispositivo para recibir notificaciones. Inténtalo de nuevo.', failed: 'No funcionó. Inténtalo de nuevo.' },
  fr: { remind: 'Rappel', set: 'Rappel programmé', offer: 'À l’heure choisie, vous recevez une notification.', proOnly: 'Les rappels sont une fonction Pro.', when: 'Date et heure', repeat: 'Répéter',
    repeats: { none: 'Jamais', daily: 'Chaque jour', weekdays: 'En semaine (lun–ven)', weekly: 'Chaque semaine', monthly: 'Chaque mois' },
    save: 'Programmer', saving: 'Programmation…', change: 'Modifier', remove: 'Retirer', done: 'Ce rappel est terminé.', past: 'Cette heure est passée.',
    denied: 'Les rappels n’arriveront pas sur cet appareil tant que vous n’autorisez pas les notifications.', install: 'Sur iPhone, les notifications arrivent dans Drafta ajouté à l’écran d’accueil.', unsupported: 'Ce navigateur ne peut pas recevoir de notifications.', registerFailed: 'Cet appareil n’a pas pu être configuré pour les notifications. Réessayez.', failed: 'Cela n’a pas fonctionné. Réessayez.' },
  'pt-BR': { remind: 'Lembrete', set: 'Lembrete definido', offer: 'Na hora definida, você recebe uma notificação.', proOnly: 'Lembretes são um recurso Pro.', when: 'Data e hora', repeat: 'Repetir',
    repeats: { none: 'Nunca', daily: 'Todo dia', weekdays: 'Dias úteis (seg–sex)', weekly: 'Toda semana', monthly: 'Todo mês' },
    save: 'Definir', saving: 'Definindo…', change: 'Alterar', remove: 'Remover', done: 'Este lembrete terminou.', past: 'Esse horário já passou.',
    denied: 'Os lembretes não chegarão a este dispositivo até você permitir as notificações.', install: 'No iPhone, as notificações chegam ao Drafta adicionado à tela de início.', unsupported: 'Este navegador não pode receber notificações.', registerFailed: 'Não foi possível preparar este dispositivo para notificações. Tente novamente.', failed: 'Não funcionou. Tente novamente.' },
  hi: { remind: 'रिमाइंडर', set: 'रिमाइंडर सेट है', offer: 'तय समय पर सूचना आएगी.', proOnly: 'रिमाइंडर Pro की सुविधा है.', when: 'तारीख और समय', repeat: 'दोहराएँ',
    repeats: { none: 'कभी नहीं', daily: 'हर दिन', weekdays: 'कार्यदिवस (सोम–शुक्र)', weekly: 'हर सप्ताह', monthly: 'हर महीने' },
    save: 'सेट करें', saving: 'सेट हो रहा है…', change: 'बदलें', remove: 'हटाएँ', done: 'यह रिमाइंडर समाप्त हो गया है.', past: 'यह समय बीत चुका है.',
    denied: 'जब तक आप सूचनाओं की अनुमति नहीं देते, इस डिवाइस पर रिमाइंडर नहीं आएँगे.', install: 'iPhone पर, होम स्क्रीन पर जोड़े गए Drafta में सूचनाएँ आती हैं.', unsupported: 'यह ब्राउज़र सूचनाएँ नहीं ले सकता.', registerFailed: 'इस डिवाइस को सूचनाओं के लिए सेट नहीं किया जा सका. फिर से कोशिश करें.', failed: 'यह नहीं हो सका. फिर से कोशिश करें.' },
  ar: { remind: 'تذكير', set: 'تم ضبط التذكير', offer: 'في الوقت الذي تحدده يصلك إشعار.', proOnly: 'التذكيرات ميزة في Pro.', when: 'التاريخ والوقت', repeat: 'التكرار',
    repeats: { none: 'بدون', daily: 'كل يوم', weekdays: 'أيام العمل (الإثنين–الجمعة)', weekly: 'كل أسبوع', monthly: 'كل شهر' },
    save: 'ضبط', saving: 'جارٍ الضبط…', change: 'تغيير', remove: 'إزالة', done: 'انتهى هذا التذكير.', past: 'لقد مضى هذا الوقت.',
    denied: 'لن تصل التذكيرات إلى هذا الجهاز حتى تسمح بالإشعارات.', install: 'على iPhone تصل الإشعارات إلى Drafta المضاف إلى الشاشة الرئيسية.', unsupported: 'لا يستطيع هذا المتصفح تلقي الإشعارات.', registerFailed: 'تعذر إعداد هذا الجهاز لتلقي الإشعارات. حاول مرة أخرى.', failed: 'لم ينجح ذلك. حاول مرة أخرى.' },
  ru: { remind: 'Напоминание', set: 'Напоминание установлено', offer: 'В заданное время придёт уведомление.', proOnly: 'Напоминания доступны в Pro.', when: 'Дата и время', repeat: 'Повтор',
    repeats: { none: 'Никогда', daily: 'Каждый день', weekdays: 'По будням (пн–пт)', weekly: 'Каждую неделю', monthly: 'Каждый месяц' },
    save: 'Установить', saving: 'Устанавливаем…', change: 'Изменить', remove: 'Убрать', done: 'Это напоминание завершено.', past: 'Это время уже прошло.',
    denied: 'Напоминания не будут приходить на это устройство, пока вы не разрешите уведомления.', install: 'На iPhone уведомления приходят в Drafta, добавленный на экран «Домой».', unsupported: 'Этот браузер не может получать уведомления.', registerFailed: 'Не удалось настроить это устройство для уведомлений. Попробуйте ещё раз.', failed: 'Не получилось. Попробуйте ещё раз.' },
  id: { remind: 'Pengingat', set: 'Pengingat diatur', offer: 'Pada waktu yang diatur, notifikasi akan masuk.', proOnly: 'Pengingat adalah fitur Pro.', when: 'Tanggal dan waktu', repeat: 'Ulangi',
    repeats: { none: 'Tidak', daily: 'Setiap hari', weekdays: 'Hari kerja (Sen–Jum)', weekly: 'Setiap minggu', monthly: 'Setiap bulan' },
    save: 'Atur', saving: 'Mengatur…', change: 'Ubah', remove: 'Hapus', done: 'Pengingat ini sudah selesai.', past: 'Waktu itu sudah lewat.',
    denied: 'Pengingat tidak akan masuk ke perangkat ini sampai Anda mengizinkan notifikasi.', install: 'Di iPhone, notifikasi masuk ke Drafta yang ditambahkan ke layar utama.', unsupported: 'Browser ini tidak dapat menerima notifikasi.', registerFailed: 'Perangkat ini tidak dapat disiapkan untuk notifikasi. Silakan coba lagi.', failed: 'Tidak berhasil. Silakan coba lagi.' },
};

/** A ring time for the popover and the list, in this device's time zone and the display language. */
export function ringLabel(time: number, lang: Lang, short = false): string {
  return new Intl.DateTimeFormat(lang, short
    ? { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(time);
}
