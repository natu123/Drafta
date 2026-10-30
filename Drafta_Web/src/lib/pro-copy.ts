import type { Lang } from '@/app/languages';

/** Drafta Pro in the account menu and its small dialog (specs/23, 3.5). `{date}` is the day it renews or ends. */
export type ProCopy = {
  upgrade: string; renews: string; ends: string; manage: string;
  title: string; description: string; features: [string, string, string];
  yearly: string; monthly: string; note: string; opening: string; failed: string; returned: string;
};

export const proCopy: Record<Lang, ProCopy> = {
  en: { upgrade: '✨ Get Pro', renews: '✨ Pro · renews {date}', ends: '✨ Pro · until {date}', manage: 'Manage subscription',
    title: 'Drafta Pro', description: 'Everything in Drafta stays free. Pro adds:', features: ['Reminders for your to-dos', 'AI access to your memos (MCP)', 'Share links for memos'],
    yearly: 'Yearly ¥6,000 (2 months free)', monthly: 'Monthly ¥600', note: 'You will continue on Stripe’s payment page. Prices include tax.', opening: 'Opening…', failed: 'The page could not be opened. Please try again.', returned: 'Checking your payment. Pro appears in a moment.' },
  ja: { upgrade: '✨ Proにする', renews: '✨ Pro・次の更新 {date}', ends: '✨ Pro・{date} まで', manage: '契約を管理',
    title: 'Drafta Pro', description: 'Draftaの機能は、これまでどおり無料です。Proでは次が加わります。', features: ['ToDoのリマインダー', 'AIからメモを読み書き (MCP)', 'メモの共有リンク'],
    yearly: '年払い ¥6,000 (2ヶ月分お得)', monthly: '月払い ¥600', note: 'Stripeのお支払いページに移ります。価格は税込みです。', opening: '開いています…', failed: 'ページを開けませんでした。もう一度お試しください。', returned: 'お支払いを確認しています。まもなくProになります。' },
  'zh-CN': { upgrade: '✨ 升级 Pro', renews: '✨ Pro · {date} 续订', ends: '✨ Pro · 到 {date}', manage: '管理订阅',
    title: 'Drafta Pro', description: 'Drafta 的功能仍然免费. Pro 增加:', features: ['待办提醒', 'AI 读写备忘录 (MCP)', '备忘录分享链接'],
    yearly: '按年 ¥6,000 (省 2 个月)', monthly: '按月 ¥600', note: '将前往 Stripe 的付款页面. 价格含税.', opening: '正在打开…', failed: '无法打开页面. 请重试.', returned: '正在确认付款. Pro 很快生效.' },
  ko: { upgrade: '✨ Pro 시작하기', renews: '✨ Pro · {date} 갱신', ends: '✨ Pro · {date} 까지', manage: '구독 관리',
    title: 'Drafta Pro', description: 'Drafta 의 기능은 계속 무료입니다. Pro 에서는 다음이 추가됩니다.', features: ['할 일 리마인더', 'AI 로 메모 읽고 쓰기 (MCP)', '메모 공유 링크'],
    yearly: '연간 ¥6,000 (2개월 할인)', monthly: '월간 ¥600', note: 'Stripe 결제 페이지로 이동합니다. 가격은 세금 포함입니다.', opening: '여는 중…', failed: '페이지를 열 수 없습니다. 다시 시도해 주세요.', returned: '결제를 확인하고 있습니다. 곧 Pro 가 됩니다.' },
  es: { upgrade: '✨ Obtener Pro', renews: '✨ Pro · se renueva el {date}', ends: '✨ Pro · hasta el {date}', manage: 'Gestionar suscripción',
    title: 'Drafta Pro', description: 'Todo Drafta sigue siendo gratis. Pro añade:', features: ['Recordatorios para tus tareas', 'Acceso de la IA a tus notas (MCP)', 'Enlaces para compartir notas'],
    yearly: 'Anual ¥6,000 (2 meses gratis)', monthly: 'Mensual ¥600', note: 'Continuarás en la página de pago de Stripe. Los precios incluyen impuestos.', opening: 'Abriendo…', failed: 'No se pudo abrir la página. Inténtalo de nuevo.', returned: 'Comprobando tu pago. Pro aparecerá en un momento.' },
  fr: { upgrade: '✨ Passer à Pro', renews: '✨ Pro · renouvelé le {date}', ends: '✨ Pro · jusqu’au {date}', manage: 'Gérer l’abonnement',
    title: 'Drafta Pro', description: 'Tout Drafta reste gratuit. Pro ajoute :', features: ['Des rappels pour vos tâches', 'L’accès de l’IA à vos notes (MCP)', 'Des liens de partage pour les notes'],
    yearly: 'Annuel ¥6,000 (2 mois offerts)', monthly: 'Mensuel ¥600', note: 'Vous continuerez sur la page de paiement de Stripe. Prix TTC.', opening: 'Ouverture…', failed: 'La page n’a pas pu s’ouvrir. Réessayez.', returned: 'Vérification du paiement. Pro apparaît dans un instant.' },
  'pt-BR': { upgrade: '✨ Assinar Pro', renews: '✨ Pro · renova em {date}', ends: '✨ Pro · até {date}', manage: 'Gerenciar assinatura',
    title: 'Drafta Pro', description: 'Tudo no Drafta continua grátis. O Pro adiciona:', features: ['Lembretes para suas tarefas', 'Acesso da IA às suas notas (MCP)', 'Links de compartilhamento de notas'],
    yearly: 'Anual ¥6,000 (2 meses grátis)', monthly: 'Mensal ¥600', note: 'Você continuará na página de pagamento da Stripe. Preços com impostos.', opening: 'Abrindo…', failed: 'Não foi possível abrir a página. Tente novamente.', returned: 'Verificando o pagamento. O Pro aparece em instantes.' },
  hi: { upgrade: '✨ Pro लें', renews: '✨ Pro · {date} को नवीनीकरण', ends: '✨ Pro · {date} तक', manage: 'सदस्यता प्रबंधित करें',
    title: 'Drafta Pro', description: 'Drafta की सारी सुविधाएँ मुफ़्त रहती हैं. Pro में जुड़ता है:', features: ['आपके कामों के रिमाइंडर', 'AI से मेमो पढ़ना-लिखना (MCP)', 'मेमो साझा करने के लिंक'],
    yearly: 'वार्षिक ¥6,000 (2 महीने मुफ़्त)', monthly: 'मासिक ¥600', note: 'आप Stripe के भुगतान पेज पर जाएँगे. कीमतों में कर शामिल है.', opening: 'खुल रहा है…', failed: 'पेज नहीं खुल सका. फिर से कोशिश करें.', returned: 'भुगतान की जाँच हो रही है. Pro कुछ ही पल में दिखेगा.' },
  ar: { upgrade: '✨ الترقية إلى Pro', renews: '✨ Pro · يتجدد في {date}', ends: '✨ Pro · حتى {date}', manage: 'إدارة الاشتراك',
    title: 'Drafta Pro', description: 'تبقى كل ميزات Drafta مجانية. ويضيف Pro:', features: ['تذكيرات لمهامك', 'وصول الذكاء الاصطناعي إلى مذكراتك (MCP)', 'روابط لمشاركة المذكرات'],
    yearly: 'سنوي ¥6,000 (شهران مجانًا)', monthly: 'شهري ¥600', note: 'ستنتقل إلى صفحة الدفع في Stripe. الأسعار شاملة الضريبة.', opening: 'جارٍ الفتح…', failed: 'تعذر فتح الصفحة. حاول مرة أخرى.', returned: 'جارٍ التحقق من الدفع. سيظهر Pro بعد لحظات.' },
  ru: { upgrade: '✨ Перейти на Pro', renews: '✨ Pro · продление {date}', ends: '✨ Pro · до {date}', manage: 'Управлять подпиской',
    title: 'Drafta Pro', description: 'Всё в Drafta остаётся бесплатным. Pro добавляет:', features: ['Напоминания для задач', 'Доступ ИИ к заметкам (MCP)', 'Ссылки для обмена заметками'],
    yearly: 'В год ¥6,000 (2 месяца бесплатно)', monthly: 'В месяц ¥600', note: 'Вы перейдёте на страницу оплаты Stripe. Цены с налогом.', opening: 'Открываем…', failed: 'Не удалось открыть страницу. Попробуйте ещё раз.', returned: 'Проверяем оплату. Pro появится через мгновение.' },
  id: { upgrade: '✨ Ambil Pro', renews: '✨ Pro · diperpanjang {date}', ends: '✨ Pro · sampai {date}', manage: 'Kelola langganan',
    title: 'Drafta Pro', description: 'Semua fitur Drafta tetap gratis. Pro menambahkan:', features: ['Pengingat untuk tugas Anda', 'Akses AI ke memo Anda (MCP)', 'Tautan berbagi memo'],
    yearly: 'Tahunan ¥6,000 (gratis 2 bulan)', monthly: 'Bulanan ¥600', note: 'Anda akan lanjut ke halaman pembayaran Stripe. Harga sudah termasuk pajak.', opening: 'Membuka…', failed: 'Halaman tidak dapat dibuka. Silakan coba lagi.', returned: 'Memeriksa pembayaran. Pro akan muncul sebentar lagi.' },
};
