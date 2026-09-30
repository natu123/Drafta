import type { Lang } from '@/app/languages';

export const authErrorCopy: Record<Lang, { blocked: string; failed: string }> = {
  en: { blocked: 'The sign-in window was blocked. Allow popups in your browser and try again.', failed: 'Could not sign in. Please try again.' },
  ja: { blocked: 'ログイン画面がブロックされました. ブラウザーでポップアップを許可して, もう一度お試しください.', failed: 'ログインできませんでした. もう一度お試しください.' },
  'zh-CN': { blocked: '登录窗口被阻止. 请在浏览器中允许弹出窗口后重试.', failed: '无法登录. 请重试.' },
  ko: { blocked: '로그인 창이 차단되었습니다. 브라우저에서 팝업을 허용한 후 다시 시도하세요.', failed: '로그인하지 못했습니다. 다시 시도하세요.' },
  es: { blocked: 'La ventana de acceso fue bloqueada. Permite ventanas emergentes en tu navegador e inténtalo de nuevo.', failed: 'No se pudo iniciar sesión. Inténtalo de nuevo.' },
  fr: { blocked: 'La fenêtre de connexion a été bloquée. Autorisez les fenêtres contextuelles dans votre navigateur et réessayez.', failed: 'Impossible de se connecter. Veuillez réessayer.' },
  'pt-BR': { blocked: 'A janela de login foi bloqueada. Permita pop-ups no navegador e tente novamente.', failed: 'Não foi possível entrar. Tente novamente.' },
  hi: { blocked: 'साइन-इन विंडो ब्लॉक कर दी गई. ब्राउज़र में पॉपअप की अनुमति दें और फिर कोशिश करें.', failed: 'साइन इन नहीं हो सका. फिर कोशिश करें.' },
  ar: { blocked: 'تم حظر نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة في المتصفح وحاول مجددًا.', failed: 'تعذر تسجيل الدخول. حاول مجددًا.' },
  ru: { blocked: 'Окно входа заблокировано. Разрешите всплывающие окна в браузере и повторите попытку.', failed: 'Не удалось войти. Повторите попытку.' },
  id: { blocked: 'Jendela login diblokir. Izinkan pop-up di browser dan coba lagi.', failed: 'Tidak dapat masuk. Coba lagi.' },
};
