export type Lang = 'ja' | 'en' | 'zh-CN' | 'es' | 'ko' | 'fr' | 'pt-BR';

export const LANGS: Lang[] = ['ja', 'en', 'zh-CN', 'es', 'ko', 'fr', 'pt-BR'];

export const LANG_LABEL: Record<Lang, string> = {
  'ja': '日本語',
  'en': 'English',
  'zh-CN': '中文',
  'es': 'Español',
  'ko': '한국어',
  'fr': 'Français',
  'pt-BR': 'Português',
};

export const LANG_SHORT: Record<Lang, string> = {
  'ja': 'JA',
  'en': 'EN',
  'zh-CN': 'ZH',
  'es': 'ES',
  'ko': 'KO',
  'fr': 'FR',
  'pt-BR': 'PT',
};

export interface FeatureItem {
  title: string;
  desc: string;
}

export interface T {
  statusBadge: string;
  taglinePre: string;
  taglineBold: string;
  subTagline: string;
  beforeTitle: string;
  beforeItems: [string, string, string];
  afterTitle: string;
  afterItems: [string, string, string];
  ctaButton: string;
  noticeTitle: string;
  noticeBody: string;
  noticeFooter: string;
  featuresTitle: string;
  features: [FeatureItem, FeatureItem, FeatureItem];
  platformTitle: string;
  platformSubtitle: string;
  platformBeta: string;
  platformComing: string;
}

export const translations: Record<Lang, T> = {
  'ja': {
    statusBadge: 'Beta - 正式リリース 準備中',
    taglinePre: '「ToDoと ノートを統合した ',
    taglineBold: '新しいメモアプリ」',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: 'Before',
    beforeItems: ['タスクはToDoアプリ', 'メモはノートアプリ', '散らばった情報'],
    afterTitle: 'After with Drafta',
    afterItems: ['すべてが一箇所に', '構造化された知識', '磨かれたアイデア'],
    ctaButton: 'Try Drafta-web!',
    noticeTitle: '「Web版は 試験公開中です。」',
    noticeBody: '現在、データはブラウザに保存されません。',
    noticeFooter: '正式リリースをお待ちください。',
    featuresTitle: 'Features',
    features: [
      { title: 'ToDo + Notes', desc: 'タスクとノートを1つのアプリに統合！' },
      { title: 'Rich & Plain Mode', desc: 'リッチ ⇄ Markdownをワンクリックで切り替え！' },
      { title: 'Improved Markdown', desc: 'Drafta-MD：色付きテキスト＆スマートな番号リストを搭載！' },
    ],
    platformTitle: 'Coming to All Platforms',
    platformSubtitle: '順次、各プラットフォーム向けにリリース予定',
    platformBeta: 'Beta',
    platformComing: 'Coming Soon',
  },
  'en': {
    statusBadge: 'Beta — Official release coming soon',
    taglinePre: 'The new note app that ',
    taglineBold: 'unifies ToDo and Notes',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: 'Before',
    beforeItems: ['Tasks in a ToDo app', 'Notes in a note app', 'Scattered information'],
    afterTitle: 'After Drafta',
    afterItems: ['Everything in one place', 'Structured knowledge', 'Refined ideas'],
    ctaButton: 'Try Drafta-web!',
    noticeTitle: 'Web version is in preview.',
    noticeBody: 'Data is not yet saved in the browser.',
    noticeFooter: 'Full release coming soon.',
    featuresTitle: 'Features',
    features: [
      { title: 'ToDo + Notes', desc: 'Integrate tasks and notes in one app!' },
      { title: 'Rich & Plain Mode', desc: 'Switch between Rich ⇄ Markdown with one click!' },
      { title: 'Improved Markdown', desc: 'Drafta-MD: Color text & smart numbered lists!' },
    ],
    platformTitle: 'Coming to All Platforms',
    platformSubtitle: 'Releasing progressively on each platform',
    platformBeta: 'Beta',
    platformComing: 'Coming Soon',
  },
  'zh-CN': {
    statusBadge: 'Beta — 正式版即将发布',
    taglinePre: '将待办事项与笔记合二为一的',
    taglineBold: '全新备忘录应用',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: '之前',
    beforeItems: ['任务在待办应用', '笔记在笔记应用', '信息分散各处'],
    afterTitle: '使用 Drafta 之后',
    afterItems: ['所有内容集中一处', '结构化的知识', '精炼的想法'],
    ctaButton: '立即体验 Drafta',
    noticeTitle: 'Web 版本目前为预览版。',
    noticeBody: '当前数据不会保存在浏览器中。',
    noticeFooter: '请期待正式版发布。',
    featuresTitle: '功能特点',
    features: [
      { title: '待办 + 笔记', desc: '将任务与笔记整合在同一个应用中！' },
      { title: '富文本与纯文本模式', desc: '一键切换富文本 ⇄ Markdown！' },
      { title: '增强版 Markdown', desc: 'Drafta-MD：支持彩色文字及智能编号列表！' },
    ],
    platformTitle: '即将支持全平台',
    platformSubtitle: '将逐步在各平台发布',
    platformBeta: 'Beta',
    platformComing: '即将推出',
  },
  'es': {
    statusBadge: 'Beta — Lanzamiento oficial próximamente',
    taglinePre: 'La nueva app de notas que ',
    taglineBold: 'unifica tareas y apuntes',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: 'Antes',
    beforeItems: ['Tareas en una app de tareas', 'Notas en una app de notas', 'Información dispersa'],
    afterTitle: 'Con Drafta',
    afterItems: ['Todo en un solo lugar', 'Conocimiento estructurado', 'Ideas refinadas'],
    ctaButton: '¡Probar Drafta!',
    noticeTitle: 'La versión web está en vista previa.',
    noticeBody: 'Los datos no se guardan aún en el navegador.',
    noticeFooter: 'Lanzamiento oficial próximamente.',
    featuresTitle: 'Características',
    features: [
      { title: 'Tareas + Notas', desc: '¡Integra tareas y notas en una sola app!' },
      { title: 'Modo Rico y Simple', desc: '¡Cambia entre Rico ⇄ Markdown con un clic!' },
      { title: 'Markdown Mejorado', desc: 'Drafta-MD: ¡Texto de colores y listas numeradas inteligentes!' },
    ],
    platformTitle: 'Próximamente en Todas las Plataformas',
    platformSubtitle: 'Lanzamiento progresivo en cada plataforma',
    platformBeta: 'Beta',
    platformComing: 'Próximamente',
  },
  'ko': {
    statusBadge: '베타 — 정식 출시 준비 중',
    taglinePre: '할 일과 노트를 통합한 ',
    taglineBold: '새로운 메모 앱',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: '이전',
    beforeItems: ['할 일은 할 일 앱에서', '메모는 노트 앱에서', '흩어진 정보들'],
    afterTitle: 'Drafta 사용 후',
    afterItems: ['모든 것이 한곳에', '구조화된 지식', '정제된 아이디어'],
    ctaButton: 'Drafta 체험하기',
    noticeTitle: '웹 버전은 현재 미리보기 중입니다.',
    noticeBody: '현재 데이터는 브라우저에 저장되지 않습니다.',
    noticeFooter: '정식 출시를 기대해 주세요.',
    featuresTitle: '기능',
    features: [
      { title: '할 일 + 노트', desc: '할 일과 노트를 하나의 앱에서 통합!' },
      { title: '리치 & 플레인 모드', desc: '리치 ⇄ Markdown을 원클릭으로 전환!' },
      { title: '개선된 Markdown', desc: 'Drafta-MD: 색상 텍스트 & 스마트 번호 목록 지원!' },
    ],
    platformTitle: '모든 플랫폼 지원 예정',
    platformSubtitle: '각 플랫폼별 순차 출시 예정',
    platformBeta: '베타',
    platformComing: '출시 예정',
  },
  'fr': {
    statusBadge: 'Beta — Lancement officiel bientôt',
    taglinePre: 'La nouvelle app de notes qui ',
    taglineBold: 'unifie tâches et mémos',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: 'Avant',
    beforeItems: ['Les tâches dans une app dédiée', 'Les notes dans une app dédiée', 'Informations éparpillées'],
    afterTitle: 'Avec Drafta',
    afterItems: ['Tout en un seul endroit', 'Connaissances structurées', 'Idées affinées'],
    ctaButton: 'Essayer Drafta !',
    noticeTitle: 'La version web est en préversion.',
    noticeBody: 'Les données ne sont pas encore sauvegardées dans le navigateur.',
    noticeFooter: 'Lancement officiel bientôt.',
    featuresTitle: 'Fonctionnalités',
    features: [
      { title: 'Tâches + Notes', desc: 'Intègre tâches et notes dans une seule app !' },
      { title: 'Mode Riche & Simple', desc: 'Bascule entre Riche ⇄ Markdown en un clic !' },
      { title: 'Markdown Amélioré', desc: 'Drafta-MD : Texte coloré & listes numérotées intelligentes !' },
    ],
    platformTitle: 'Bientôt sur Toutes les Plateformes',
    platformSubtitle: 'Déploiement progressif sur chaque plateforme',
    platformBeta: 'Beta',
    platformComing: 'Bientôt',
  },
  'pt-BR': {
    statusBadge: 'Beta — Lançamento oficial em breve',
    taglinePre: 'O novo app de notas que ',
    taglineBold: 'une tarefas e anotações',
    subTagline: 'Organize your to-dos and thoughts seamlessly.',
    beforeTitle: 'Antes',
    beforeItems: ['Tarefas em um app de tarefas', 'Notas em um app de notas', 'Informações dispersas'],
    afterTitle: 'Com o Drafta',
    afterItems: ['Tudo em um só lugar', 'Conhecimento estruturado', 'Ideias refinadas'],
    ctaButton: 'Experimentar Drafta!',
    noticeTitle: 'A versão web está em pré-lançamento.',
    noticeBody: 'Os dados ainda não são salvos no navegador.',
    noticeFooter: 'Aguarde o lançamento oficial.',
    featuresTitle: 'Recursos',
    features: [
      { title: 'Tarefas + Notas', desc: 'Integre tarefas e notas em um único app!' },
      { title: 'Modo Rico e Simples', desc: 'Alterne entre Rico ⇄ Markdown com um clique!' },
      { title: 'Markdown Aprimorado', desc: 'Drafta-MD: Texto colorido e listas numeradas inteligentes!' },
    ],
    platformTitle: 'Em Breve em Todas as Plataformas',
    platformSubtitle: 'Lançamento progressivo em cada plataforma',
    platformBeta: 'Beta',
    platformComing: 'Em Breve',
  },
};
