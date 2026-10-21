import type { Lang } from '@/app/languages';

/** Words for /playground/ and its entry points (AGENTS.md, Playground). */
export type PlaygroundCopy = {
  /** Entry link on the Landing-page and the sign-in screen. */
  tryIt: string;
  /** The band at the top of the Playground. */
  notice: string;
  /** The band's way to the signed-in app. */
  signIn: string;
  /** Landing-page notice: sign-in is for saving, the Playground keeps nothing. */
  warning: string;
};

export const playgroundCopy: Record<Lang, PlaygroundCopy> = {
  en: {
    tryIt: 'Try without signing in',
    notice: 'Playground: changes here are not saved and are lost when you reload or close the page.',
    signIn: 'Sign in to save',
    warning: 'Sign in with Google to save your memos (the Playground lets you try Drafta without saving). Wait for “Saved” before closing. Held unsaved edits are lost if you reload or close the page.',
  },
  ja: {
    tryIt: 'ログインせずに試す',
    notice: 'Playground: ここでの変更は保存されず, 再読み込みやページを閉じると消えます.',
    signIn: 'ログインして保存する',
    warning: '保存して使うにはGoogleログインが必要です (Playgroundでは保存なしで試せます). 閉じる前に「保存済み」を確認してください. 保留中の未保存編集は, 再読み込みやページを閉じると失われます.',
  },
  'zh-CN': {
    tryIt: '无需登录试用',
    notice: 'Playground: 此处的更改不会保存, 刷新或关闭页面后将消失.',
    signIn: '登录以保存',
    warning: '保存备忘录需要登录Google (可在Playground中免保存试用). 关闭前请确认“已保存”. 刷新或关闭页面会丢失保留的未保存编辑.',
  },
  ko: {
    tryIt: '로그인 없이 체험하기',
    notice: 'Playground: 여기서의 변경은 저장되지 않으며, 새로고침하거나 페이지를 닫으면 사라집니다.',
    signIn: '로그인하여 저장하기',
    warning: '메모를 저장하려면 Google 로그인이 필요합니다 (Playground에서는 저장 없이 체험할 수 있습니다). 닫기 전에 “저장됨”을 확인하세요. 새로고침하거나 페이지를 닫으면 보관 중인 미저장 편집이 사라집니다.',
  },
  es: {
    tryIt: 'Probar sin iniciar sesión',
    notice: 'Playground: los cambios aquí no se guardan y se pierden al recargar o cerrar la página.',
    signIn: 'Inicia sesión para guardar',
    warning: 'Inicia sesión con Google para guardar tus notas (el Playground permite probar Drafta sin guardar). Confirma “Guardado” antes de cerrar. Recargar o cerrar la página elimina los cambios sin guardar retenidos.',
  },
  fr: {
    tryIt: 'Essayer sans se connecter',
    notice: 'Playground : les modifications ne sont pas enregistrées et disparaissent si vous rechargez ou fermez la page.',
    signIn: 'Se connecter pour enregistrer',
    warning: 'Connectez-vous avec Google pour enregistrer vos notes (le Playground permet d’essayer Drafta sans enregistrer). Vérifiez “Enregistré” avant de fermer. Recharger ou fermer la page efface les modifications non enregistrées en attente.',
  },
  'pt-BR': {
    tryIt: 'Experimentar sem entrar',
    notice: 'Playground: as alterações aqui não são salvas e se perdem ao recarregar ou fechar a página.',
    signIn: 'Entrar para salvar',
    warning: 'Entre com o Google para salvar suas notas (o Playground permite experimentar o Drafta sem salvar). Confirme “Salvo” antes de fechar. Recarregar ou fechar a página elimina as alterações não salvas retidas.',
  },
  hi: {
    tryIt: 'साइन इन किए बिना आज़माएँ',
    notice: 'Playground: यहाँ के बदलाव सहेजे नहीं जाते और पेज दोबारा लोड या बंद करने पर मिट जाते हैं.',
    signIn: 'सहेजने के लिए साइन इन करें',
    warning: 'नोट सहेजने के लिए Google से साइन इन करें (Playground में बिना सहेजे आज़मा सकते हैं). बंद करने से पहले “सहेजा गया” की पुष्टि करें. पेज दोबारा लोड या बंद करने पर रखे गए बिना सहेजे बदलाव खो जाते हैं.',
  },
  ar: {
    tryIt: 'جرّب دون تسجيل الدخول',
    notice: 'Playground: لا تُحفظ التغييرات هنا وتضيع عند إعادة تحميل الصفحة أو إغلاقها.',
    signIn: 'سجّل الدخول للحفظ',
    warning: 'سجّل الدخول باستخدام Google لحفظ ملاحظاتك (يتيح Playground تجربة Drafta دون حفظ). تحقق من “تم الحفظ” قبل الإغلاق. إعادة تحميل الصفحة أو إغلاقها يفقد التعديلات غير المحفوظة المحتفظ بها.',
  },
  ru: {
    tryIt: 'Попробовать без входа',
    notice: 'Playground: изменения здесь не сохраняются и пропадут при перезагрузке или закрытии страницы.',
    signIn: 'Войти, чтобы сохранять',
    warning: 'Чтобы сохранять заметки, войдите через Google (в Playground можно попробовать Drafta без сохранения). Перед закрытием проверьте “Сохранено”. Перезагрузка или закрытие страницы удаляет удерживаемые несохранённые изменения.',
  },
  id: {
    tryIt: 'Coba tanpa masuk',
    notice: 'Playground: perubahan di sini tidak disimpan dan hilang saat halaman dimuat ulang atau ditutup.',
    signIn: 'Masuk untuk menyimpan',
    warning: 'Masuk dengan Google untuk menyimpan catatan (Playground memungkinkan mencoba Drafta tanpa menyimpan). Pastikan “Tersimpan” sebelum menutup. Memuat ulang atau menutup halaman menghilangkan perubahan yang belum disimpan yang ditahan.',
  },
};
