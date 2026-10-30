import type { Lang } from '@/app/languages';

export const literalHtmlReleaseCopy: Record<Lang, string> = {
  en: 'Text that looks like HTML, such as <font color="…"> written in a memo, now stays as written when you switch between Plain and Rich. The updates list no longer repeats the sign-in and saving notice under every version; it remains on the top page.',
  ja: 'メモに書かれた <font color="…"> のようなHTMLに見える文字が、プレーンとリッチを切り替えても消えずにそのまま残るようにしました。更新履歴の各版に毎回表示していたログインと保存の注意書きは、トップページの1か所だけにしました。',
  'zh-CN': '备忘录中写的 <font color="…"> 等看起来像 HTML 的文字, 现在在纯文本与富文本之间切换时会原样保留. 更新记录中不再在每个版本下重复登录和保存的提示, 仅保留在首页.',
  ko: '메모에 적힌 <font color="…"> 같은 HTML처럼 보이는 글자가 일반 텍스트와 서식 있는 텍스트를 전환해도 사라지지 않고 그대로 남습니다. 업데이트 목록의 버전마다 반복되던 로그인과 저장 안내는 첫 페이지에만 표시합니다.',
  es: 'El texto que parece HTML, como <font color="…"> escrito en una nota, ahora se conserva tal cual al cambiar entre texto plano y enriquecido. La lista de novedades ya no repite el aviso de inicio de sesión y guardado en cada versión; se mantiene en la página principal.',
  fr: 'Le texte qui ressemble à du HTML, comme <font color="…"> écrit dans une note, reste désormais tel quel lors du passage entre texte brut et texte enrichi. La liste des mises à jour ne répète plus l’avis de connexion et d’enregistrement sous chaque version ; il reste sur la page d’accueil.',
  'pt-BR': 'Textos que parecem HTML, como <font color="…"> escrito em uma nota, agora permanecem como estão ao alternar entre texto simples e formatado. A lista de novidades não repete mais o aviso de login e salvamento em cada versão; ele fica na página inicial.',
  hi: 'नोट में लिखा <font color="…"> जैसा HTML दिखने वाला टेक्स्ट अब सादे और रिच टेक्स्ट के बीच बदलने पर जैसा है वैसा ही रहता है. अपडेट सूची में हर संस्करण के नीचे लॉगिन और सहेजने की सूचना अब नहीं दोहराई जाती; वह मुख्य पृष्ठ पर रहती है.',
  ar: 'أصبح النص الذي يشبه HTML، مثل <font color="…"> المكتوب في ملاحظة، يبقى كما هو عند التبديل بين النص العادي والمنسّق. ولم تعد قائمة التحديثات تكرر تنبيه تسجيل الدخول والحفظ تحت كل إصدار؛ فهو يبقى في الصفحة الرئيسية.',
  ru: 'Текст, похожий на HTML, например <font color="…"> в заметке, теперь сохраняется как есть при переключении между обычным и форматированным текстом. В списке обновлений больше не повторяется уведомление о входе и сохранении под каждой версией; оно осталось на главной странице.',
  id: 'Teks yang tampak seperti HTML, seperti <font color="…"> yang ditulis di catatan, kini tetap apa adanya saat beralih antara teks biasa dan kaya. Daftar pembaruan tidak lagi mengulang pemberitahuan masuk dan penyimpanan di setiap versi; pemberitahuan itu tetap ada di halaman utama.',
};
