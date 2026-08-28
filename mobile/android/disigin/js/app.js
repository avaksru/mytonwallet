/* ============================================================
   Crypto Wallet Prototype — ЛОГИКА ПРИЛОЖЕНИЯ (навигация, тема, языки)
   ============================================================
   ЧТО ДЕЛАЕТ ЭТОТ ФАЙЛ:
   • i18n — 7 языков интерфейса: словари I18N, перевод всех
     элементов с data-i18n, формы множественного числа;
   • навигация — показ экранов .screen, стек истории, кнопка «Назад»;
   • тема — переключение светлой/тёмной (класс .dark на #phone);
   • kebab-меню «⋮», сворачиваемые секции «Доход»/«История»;
   • строки чипов — перетаскивание мышью, колесо, адаптивная раскладка;
   • часы в статус-баре.

   КАК УСТРОЕН:
   весь код обёрнут в IIFE (немедленно вызываемую функцию), чтобы
   не засорять глобальную область видимости. Наружу выставляется
   только объект window.WalletApp (конец файла) — его вызывают
   из HTML: onchange="WalletApp.toggleTheme()" и т.п.

   СВЯЗЬ С РАЗМЕТКОЙ — скрипт ищет элементы по data-атрибутам:
     data-i18n / data-i18n-title / data-i18n-placeholder /
     data-i18n-aria / data-i18n-value / data-count / data-ts /
     data-chip / data-nav / data-back / data-wallet / data-lang.
   ============================================================ */

(function() {
  /* ---- Языки интерфейса (i18n) ----
     LANGS — коды языков, которые поддерживает приложение.
     Порядок важен: по нему ищется совпадение с языком браузера
     (detectLang ниже). Язык вне списка сбрасывается на ru
     (applyLang). */
  var LANGS = ['ru', 'en', 'zh', 'de', 'fr', 'es', 'it'];
  /* Человекочитаемые названия языков. Показываются в настройках:
     подпись выбранного языка в строке «Язык» (элемент с
     id="settings-language-value") и в списке языков. */
  var LANG_NAMES = {
    ru: 'Русский', en: 'English', zh: '中文', de: 'Deutsch',
    fr: 'Français', es: 'Español', it: 'Italiano'
  };
  /* Локали (формат BCP-47) для каждого языка — передаются в
     Intl.DateTimeFormat, чтобы даты транзакций выглядели
     «по-местному»: ru-RU → «22 авг, 11:05», en-US → «Aug 22, 11:05». */
  var LOCALES = {
    ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', de: 'de-DE',
    fr: 'fr-FR', es: 'es-ES', it: 'it-IT'
  };
  /* Имя ключа в localStorage, под которым хранится выбранный язык.
     Благодаря этому выбор языка запоминается между запусками. */
  var STORAGE_KEY = 'wallet-lang';

  /* ---- Словари переводов: I18N[язык][ключ] ----
     Два вида значений:
     • строка — обычная надпись; если в ней есть плейсхолдер {value},
       он заменяется атрибутом data-i18n-value этого элемента
       (пример: change_24h: «{value} за 24ч» + data-i18n-value="+3.24%");
     • массив — формы множественного числа: форма выбирается по числу
       из атрибута data-count, число подставляется вместо {n}
       (пример: assets: [«{n} актив», «{n} актива», «{n} активов»]).
     Русский (ru) — резервный язык: недостающие ключи берутся из него. */
  var I18N = {
    ru: {
      wallets: 'Кошельки',
      all: 'Все',
      wallet_main: 'Основной',
      wallet_trading: 'Trading',
      wallet_savings: 'Savings',
      wallet_invest: 'Инвестиции',
      wallet_business: 'Бизнес',
      total_balance: 'Общий баланс',
      change_24h: '{value} за 24ч',
      income: 'Доход',
      per_year: '{value} за год',
      month: 'Месяц',
      months_3: '3 месяца',
      year: 'Год',
      all_time: 'Всё время',
      staking: 'Стейкинг',
      assets: ['{n} актив', '{n} актива', '{n} активов'],
      history: 'История',
      tx_count: ['{n} операция', '{n} операции', '{n} операций'],
      tx_received: 'Получено',
      tx_sent: 'Отправлено',
      tx_swap: 'Обмен',
      tx_staking: 'Награда за стейкинг',
      settings: 'Настройки',
      profile: 'Профиль',
      user: 'Пользователь',
      appearance: 'Оформление',
      dark_theme: 'Тёмная тема',
      security: 'Безопасность',
      passcode: 'Код-пароль',
      enabled: 'Включено',
      general: 'Общие',
      language: 'Язык',
      about: 'О приложении',
      data: 'Данные',
      reset_data: 'Сбросить все данные',
      night_mode: 'Ночной режим',
      day_mode: 'Дневной режим',
      add_wallet: 'Добавить кошелёк',
      new_wallet: 'Новый кошелёк',
      name: 'Название',
      name_example: 'Например: Основной',
      wallet_type: 'Тип кошелька',
      choose: 'Выбрать...',
      color: 'Цвет',
      create_wallet: 'Создать кошелёк',
      cancel: 'Отмена',
      menu: 'Меню',
      wallet_locked: 'Кошелёк заблокирован'
    },
    en: {
      wallets: 'Wallets',
      all: 'All',
      wallet_main: 'Main',
      wallet_trading: 'Trading',
      wallet_savings: 'Savings',
      wallet_invest: 'Investments',
      wallet_business: 'Business',
      total_balance: 'Total balance',
      change_24h: '{value} in 24h',
      income: 'Income',
      per_year: '{value} this year',
      month: 'Month',
      months_3: '3 months',
      year: 'Year',
      all_time: 'All time',
      staking: 'Staking',
      assets: ['{n} asset', '{n} assets'],
      history: 'History',
      tx_count: ['{n} transaction', '{n} transactions'],
      tx_received: 'Received',
      tx_sent: 'Sent',
      tx_swap: 'Swap',
      tx_staking: 'Staking reward',
      settings: 'Settings',
      profile: 'Profile',
      user: 'User',
      appearance: 'Appearance',
      dark_theme: 'Dark theme',
      security: 'Security',
      passcode: 'Passcode',
      enabled: 'Enabled',
      general: 'General',
      language: 'Language',
      about: 'About',
      data: 'Data',
      reset_data: 'Reset all data',
      night_mode: 'Night mode',
      day_mode: 'Day mode',
      add_wallet: 'Add wallet',
      new_wallet: 'New wallet',
      name: 'Name',
      name_example: 'E.g. Main',
      wallet_type: 'Wallet type',
      choose: 'Choose...',
      color: 'Color',
      create_wallet: 'Create wallet',
      cancel: 'Cancel',
      menu: 'Menu',
      wallet_locked: 'Wallet locked'
    },
    zh: {
      wallets: '钱包',
      all: '全部',
      wallet_main: '主要',
      wallet_trading: '交易',
      wallet_savings: '储蓄',
      wallet_invest: '投资',
      wallet_business: '商务',
      total_balance: '总余额',
      change_24h: '24小时 {value}',
      income: '收益',
      per_year: '今年 {value}',
      month: '1 个月',
      months_3: '3 个月',
      year: '1 年',
      all_time: '全部时间',
      staking: '质押',
      assets: ['{n} 个资产'],
      history: '历史记录',
      tx_count: ['{n} 笔交易'],
      tx_received: '已接收',
      tx_sent: '已发送',
      tx_swap: '兑换',
      tx_staking: '质押奖励',
      settings: '设置',
      profile: '个人资料',
      user: '用户',
      appearance: '外观',
      dark_theme: '深色主题',
      security: '安全',
      passcode: '密码锁定',
      enabled: '已开启',
      general: '通用',
      language: '语言',
      about: '关于',
      data: '数据',
      reset_data: '重置所有数据',
      night_mode: '夜间模式',
      day_mode: '日间模式',
      add_wallet: '添加钱包',
      new_wallet: '新建钱包',
      name: '名称',
      name_example: '例如：主要',
      wallet_type: '钱包类型',
      choose: '选择...',
      color: '颜色',
      create_wallet: '创建钱包',
      cancel: '取消',
      menu: '菜单',
      wallet_locked: '钱包已锁定'
    },
    de: {
      wallets: 'Wallets',
      all: 'Alle',
      wallet_main: 'Hauptkonto',
      wallet_trading: 'Trading',
      wallet_savings: 'Sparen',
      wallet_invest: 'Investments',
      wallet_business: 'Geschäft',
      total_balance: 'Gesamtguthaben',
      change_24h: '{value} in 24 Std.',
      income: 'Einnahmen',
      per_year: '{value} dieses Jahr',
      month: 'Monat',
      months_3: '3 Monate',
      year: 'Jahr',
      all_time: 'Gesamtzeitraum',
      staking: 'Staking',
      assets: ['{n} Asset', '{n} Assets'],
      history: 'Verlauf',
      tx_count: ['{n} Transaktion', '{n} Transaktionen'],
      tx_received: 'Empfangen',
      tx_sent: 'Gesendet',
      tx_swap: 'Tausch',
      tx_staking: 'Staking-Belohnung',
      settings: 'Einstellungen',
      profile: 'Profil',
      user: 'Benutzer',
      appearance: 'Darstellung',
      dark_theme: 'Dunkles Design',
      security: 'Sicherheit',
      passcode: 'Code',
      enabled: 'Aktiviert',
      general: 'Allgemein',
      language: 'Sprache',
      about: 'Über die App',
      data: 'Daten',
      reset_data: 'Alle Daten zurücksetzen',
      night_mode: 'Nachtmodus',
      day_mode: 'Tagmodus',
      add_wallet: 'Wallet hinzufügen',
      new_wallet: 'Neues Wallet',
      name: 'Name',
      name_example: 'Z. B. Hauptkonto',
      wallet_type: 'Wallet-Typ',
      choose: 'Auswählen...',
      color: 'Farbe',
      create_wallet: 'Wallet erstellen',
      cancel: 'Abbrechen',
      menu: 'Menü',
      wallet_locked: 'Wallet gesperrt'
    },
    fr: {
      wallets: 'Portefeuilles',
      all: 'Tous',
      wallet_main: 'Principal',
      wallet_trading: 'Trading',
      wallet_savings: 'Épargne',
      wallet_invest: 'Investissements',
      wallet_business: 'Business',
      total_balance: 'Solde total',
      change_24h: '{value} sur 24 h',
      income: 'Revenus',
      per_year: '{value} cette année',
      month: 'Mois',
      months_3: '3 mois',
      year: 'Année',
      all_time: 'Depuis le début',
      staking: 'Staking',
      assets: ['{n} actif', '{n} actifs'],
      history: 'Historique',
      tx_count: ['{n} transaction', '{n} transactions'],
      tx_received: 'Reçu',
      tx_sent: 'Envoyé',
      tx_swap: 'Échange',
      tx_staking: 'Récompense de staking',
      settings: 'Réglages',
      profile: 'Profil',
      user: 'Utilisateur',
      appearance: 'Apparence',
      dark_theme: 'Thème sombre',
      security: 'Sécurité',
      passcode: "Code d'accès",
      enabled: 'Activé',
      general: 'Général',
      language: 'Langue',
      about: 'À propos',
      data: 'Données',
      reset_data: 'Réinitialiser les données',
      night_mode: 'Mode nuit',
      day_mode: 'Mode jour',
      add_wallet: 'Ajouter un portefeuille',
      new_wallet: 'Nouveau portefeuille',
      name: 'Nom',
      name_example: 'Ex. : Principal',
      wallet_type: 'Type de portefeuille',
      choose: 'Choisir...',
      color: 'Couleur',
      create_wallet: 'Créer le portefeuille',
      cancel: 'Annuler',
      menu: 'Menu',
      wallet_locked: 'Portefeuille verrouillé'
    },
    es: {
      wallets: 'Monederos',
      all: 'Todos',
      wallet_main: 'Principal',
      wallet_trading: 'Trading',
      wallet_savings: 'Ahorros',
      wallet_invest: 'Inversiones',
      wallet_business: 'Negocios',
      total_balance: 'Saldo total',
      change_24h: '{value} en 24 h',
      income: 'Ingresos',
      per_year: '{value} este año',
      month: 'Mes',
      months_3: '3 meses',
      year: 'Año',
      all_time: 'Todo el tiempo',
      staking: 'Staking',
      assets: ['{n} activo', '{n} activos'],
      history: 'Historial',
      tx_count: ['{n} transacción', '{n} transacciones'],
      tx_received: 'Recibido',
      tx_sent: 'Enviado',
      tx_swap: 'Intercambio',
      tx_staking: 'Recompensa de staking',
      settings: 'Ajustes',
      profile: 'Perfil',
      user: 'Usuario',
      appearance: 'Apariencia',
      dark_theme: 'Tema oscuro',
      security: 'Seguridad',
      passcode: 'Código de acceso',
      enabled: 'Activado',
      general: 'General',
      language: 'Idioma',
      about: 'Acerca de',
      data: 'Datos',
      reset_data: 'Restablecer todos los datos',
      night_mode: 'Modo nocturno',
      day_mode: 'Modo diurno',
      add_wallet: 'Añadir monedero',
      new_wallet: 'Nuevo monedero',
      name: 'Nombre',
      name_example: 'Ej.: Principal',
      wallet_type: 'Tipo de monedero',
      choose: 'Elegir...',
      color: 'Color',
      create_wallet: 'Crear monedero',
      cancel: 'Cancelar',
      menu: 'Menú',
      wallet_locked: 'Monedero bloqueado'
    },
    it: {
      wallets: 'Portafogli',
      all: 'Tutti',
      wallet_main: 'Principale',
      wallet_trading: 'Trading',
      wallet_savings: 'Risparmi',
      wallet_invest: 'Investimenti',
      wallet_business: 'Business',
      total_balance: 'Saldo totale',
      change_24h: '{value} in 24 ore',
      income: 'Reddito',
      per_year: "{value} quest'anno",
      month: 'Mese',
      months_3: '3 mesi',
      year: 'Anno',
      all_time: 'Da sempre',
      staking: 'Staking',
      assets: ['{n} attività', '{n} attività'],
      history: 'Cronologia',
      tx_count: ['{n} transazione', '{n} transazioni'],
      tx_received: 'Ricevuto',
      tx_sent: 'Inviato',
      tx_swap: 'Scambio',
      tx_staking: 'Ricompensa di staking',
      settings: 'Impostazioni',
      profile: 'Profilo',
      user: 'Utente',
      appearance: 'Aspetto',
      dark_theme: 'Tema scuro',
      security: 'Sicurezza',
      passcode: 'Codice di accesso',
      enabled: 'Attivato',
      general: 'Generale',
      language: 'Lingua',
      about: "Info sull'app",
      data: 'Dati',
      reset_data: 'Reimposta tutti i dati',
      night_mode: 'Modalità notte',
      day_mode: 'Modalità giorno',
      add_wallet: 'Aggiungi portafoglio',
      new_wallet: 'Nuovo portafoglio',
      name: 'Nome',
      name_example: 'Es.: Principale',
      wallet_type: 'Tipo di portafoglio',
      choose: 'Scegli...',
      color: 'Colore',
      create_wallet: 'Crea portafoglio',
      cancel: 'Annulla',
      menu: 'Menu',
      wallet_locked: 'Portafoglio bloccato'
    }
  };

  /* ---- Состояние приложения ----
     currentScreen — id открытого экрана (без приставки «screen-»):
                     home, wallet-detail, settings и т.д.
     navHistory    — стек истории навигации: при каждом переходе сюда
                     кладётся предыдущий экран; кнопка «Назад» (goBack)
                     снимает верхний элемент и показывает его.
     currentLang   — текущий язык; определяется сразу при загрузке
                     вызовом detectLang(). */
  var currentScreen = 'home';
  var navHistory = [];
  var currentLang = detectLang();

  /* ---- Ссылки на элементы страницы ----
     screens    — коллекция всех экранов (.screen) для показа/скрытия;
     fab        — плавающая кнопка «+» (id="fab-add");
     kebabMenu  — выпадающее меню «⋮» (id="kebab-menu");
     themeLabel — надпись «Ночной/Дневной режим» внутри меню. */
  var screens = document.querySelectorAll('.screen');
  var fab = document.getElementById('fab-add');
  var kebabMenu = document.getElementById('kebab-menu');
  var themeLabel = document.getElementById('menu-theme-label');
  /* ==== i18n: вспомогательные функции ==== */
  /* Определяет язык при первом открытии страницы.
     Приоритет: 1) язык, сохранённый в localStorage;
                2) первый язык браузера из списка поддерживаемых
                   (сравнение по началу кода: ru-RU → ru);
                3) ru — если ничего не совпало.
     try/catch нужен, т.к. доступ к localStorage может быть запрещён. */
  function detectLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGS.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
    for (var i = 0; i < LANGS.length; i++) {
      if (nav.indexOf(LANGS[i]) === 0) return LANGS[i];
    }
    return 'ru';
  }

  /* Простой перевод по ключу для текущего языка.
     Нет перевода → берётся русский; нет и его → null.
     Для ключей-массивов (множественное число) вернёт null —
     такие ключи переводит tf(). */
  function t(key) {
    var dict = I18N[currentLang] || I18N.ru;
    var val = dict[key];
    if (val == null) val = I18N.ru[key];
    return (typeof val === 'string') ? val : null;
  }

  /* Индекс формы множественного числа для языка и числа n:
     ru — три формы (1 актив / 2 актива / 5 активов);
     zh — одна форма; fr — своя пара (0 и 1 → первая форма);
     en, de, es, it — две формы (1 → первая, остальное → вторая). */
  function pluralIndex(lang, n) {
    n = Math.abs(n);
    if (lang === 'zh') return 0;
    if (lang === 'ru') {
      var n10 = n % 10, n100 = n % 100;
      if (n10 === 1 && n100 !== 11) return 0;
      if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 1;
      return 2;
    }
    if (lang === 'fr') return (n < 2) ? 0 : 1;
    return (n === 1) ? 0 : 1;
  }

  /* Перевод с учётом множественного числа.
     Берёт массив форм из словаря, выбирает форму по pluralIndex
     для текущего языка и числа n и подставляет число вместо {n}.
     Пример: tf(assets, 5) при языке ru → «5 активов». */
  function tf(key, n) {
    var dict = I18N[currentLang] || I18N.ru;
    var forms = dict[key];
    if (!Array.isArray(forms)) forms = I18N.ru[key];
    if (!Array.isArray(forms)) return String(key);
    var idx = pluralIndex(currentLang, n);
    if (idx >= forms.length) idx = forms.length - 1;
    return forms[idx].replace('{n}', n);
  }

  /* Включена ли тёмная тема. Признак — класс dark на корневом
     контейнере #phone: он переключает все CSS-переменные
     на тёмные значения (блок .dark в styles.css). */
  function isDark() {
    var phone = document.getElementById('phone');
    return !!(phone && phone.classList.contains('dark'));
  }

  /* Обновляет подпись пункта меню темы: в тёмной теме показываем
     «Дневной режим» (предлагаем переключиться назад),
     в светлой — «Ночной режим». */
  function updateThemeLabel() {
    if (themeLabel) themeLabel.textContent = isDark() ? t('day_mode') : t('night_mode');
  }

  /* Локализует даты транзакций в блоках «История».
     Даты в разметке лежат в атрибуте data-ts (ISO 8601), а их
     текст перерисовывается по правилам текущего языка (Intl). */
  function formatTxDates() {
    var fmt = null;
    try {
      fmt = new Intl.DateTimeFormat(LOCALES[currentLang] || currentLang, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {}
    if (!fmt) return;
    document.querySelectorAll('[data-ts]').forEach(function(el) {
      var d = new Date(el.getAttribute('data-ts'));
      if (!isNaN(d.getTime())) el.textContent = fmt.format(d);
    });
  }

  /* ГЛАВНАЯ ФУНКЦИЯ ЛОКАЛИЗАЦИИ — применяет выбранный язык
     ко всей странице. Шаги:
     1. Запоминает язык (localStorage) и ставит lang у тега html.
     2. Для всех элементов [data-i18n] подставляет перевод:
        массив → форма множественного числа (tf + data-count);
        строка → замена {value} на data-i18n-value.
     3. Переводит атрибуты по data-i18n-title / data-i18n-placeholder
        / data-i18n-aria → title / placeholder / aria-label.
     4. Показывает название языка в настройках и галочку в списке.
     5. Обновляет подпись темы и даты транзакций.
     6. Пересобирает строки чипов — длины надписей изменились. */
  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'ru';
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.lang = lang;

    /* 2. Текст элементов с data-i18n */
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = I18N[lang][key];
      if (val == null) val = I18N.ru[key];
      if (val == null) return;
      if (Array.isArray(val)) {
        el.textContent = tf(key, parseInt(el.getAttribute('data-count') || '0', 10));
      } else {
        var v = el.getAttribute('data-i18n-value');
        el.textContent = (v != null) ? val.replace('{value}', v) : val;
      }
    });

    /* 3. Перевод атрибутов: title / placeholder / aria-label */
    var attrMap = {
      'data-i18n-title': 'title',
      'data-i18n-placeholder': 'placeholder',
      'data-i18n-aria': 'aria-label'
    };
    Object.keys(attrMap).forEach(function(attr) {
      document.querySelectorAll('[' + attr + ']').forEach(function(el) {
        var key = el.getAttribute(attr);
        var val = I18N[lang][key];
        if (val == null) val = I18N.ru[key];
        if (typeof val === 'string') el.setAttribute(attrMap[attr], val);
      });
    });

    /* 4. Текущий язык в настройках и галочка напротив него в списке */
    var langValue = document.getElementById('settings-language-value');
    if (langValue) langValue.textContent = LANG_NAMES[lang];
    document.querySelectorAll('.lang-item').forEach(function(item) {
      item.classList.toggle('selected', item.getAttribute('data-lang') === lang);
    });

    updateThemeLabel();
    formatTxDates();

    /* 6. Надписи чипов изменили длину — пересобираем строки чипов */
    layoutChipsBars();
  }

  /* Публичная точка входа для смены языка — вызывается при выборе
     языка на экране «Язык» (см. обработчик клика по .lang-item). */
  function setLanguage(lang) { applyLang(lang); }
  /* ---- Тема оформления ----
     toggleTheme() переключает светлую/тёмную тему:
     • класс dark на #phone — включает тёмные CSS-переменные;
     • класс dark-page на body — затемняет фон вокруг «телефона»;
     • синхронизирует чекбокс в настройках (id="theme-toggle"),
       подпись пункта меню и его иконку (луна ⇄ солнце). */
  function toggleTheme() {
    var phone = document.getElementById('phone');
    var dark = phone.classList.toggle('dark');
    document.body.classList.toggle('dark-page', dark);
    var cb = document.getElementById('theme-toggle');
    if (cb) cb.checked = dark;
    updateThemeLabel();
    var themeIcon = document.getElementById('menu-theme-icon');
    if (themeIcon) {
      themeIcon.innerHTML = dark
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  /* ---- Kebab-меню (кнопка «⋮» в шапке) ----
     Открытие/закрытие — добавление/снятие класса open:
     видимость и анимация описаны в CSS (.kebab-menu / .open). */
  function openMenu()  { if (kebabMenu) kebabMenu.classList.add('open'); }
  function closeMenu() { if (kebabMenu) kebabMenu.classList.remove('open'); }
  function isMenuOpen() { return kebabMenu && kebabMenu.classList.contains('open'); }

  /* ---- Чипы (вкладки-фильтры кошельков, как папки в Telegram) ----
     setActiveChip() подсвечивает активный чип: класс active
     получает чип, у которого data-chip совпадает с chipId. */
  function setActiveChip(chipId) {
    document.querySelectorAll('.chip').forEach(function(c) {
      c.classList.toggle('active', c.getAttribute('data-chip') === chipId);
    });
  }

  /* ---- Строка чипов: перетаскивание мышью и колесо ----
     Прокручивается только сама строка чипов, остальной экран
     остаётся на месте. Тач-устройства используют нативную
     прокрутку (в CSS задано touch-action: pan-x). */
  function enableChipsScroll(bar) {
    if (!bar) return function() {};
    /* Состояние перетаскивания: active — тянем ли сейчас;
       moved — сдвигался ли указатель (порог «клик/тяга»);
       startX и startScroll — точка старта;
       pointerId — какой именно указатель тянет. */
    var drag = { active: false, moved: false, startX: 0, startScroll: 0, pointerId: null };

    /* Помечает строку классом scrollable (курсор grab), только
       если чипы не помещаются и прокрутка реально доступна. */
    function updateScrollable() {
      bar.classList.toggle('scrollable', bar.scrollWidth > bar.clientWidth + 1);
      return updateScrollable;
    }

    /* Начало перетаскивания. Тач не перехватываем — пусть скроллит
       браузер; тянуть можно левой кнопкой мыши или пером. */
    bar.addEventListener('pointerdown', function(e) {
      /* Тач → нативный скролл браузера; здесь обрабатываем только мышь/перо */
      if (e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag.active = true;
      drag.moved = false;
      drag.startX = e.clientX;
      drag.startScroll = bar.scrollLeft;
      drag.pointerId = e.pointerId;
    });

    /* Перетаскивание: scrollLeft следует за мышью. Порог 5 px
       отделяет случайный клик от тяги; после него включается
       режим dragging и указатель «захватывается» строкой. */
    bar.addEventListener('pointermove', function(e) {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      var dx = e.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(dx) < 5) return;
        drag.moved = true;
        bar.classList.add('dragging');
        if (bar.setPointerCapture) {
          try { bar.setPointerCapture(drag.pointerId); } catch (err) {}
        }
      }
      bar.scrollLeft = drag.startScroll - dx;
    });

    /* Завершение перетаскивания. Слушатели висят на window:
       кнопку можно отпустить и за пределами строки чипов. */
    function endDrag(e) {
      if (!drag.active) return;
      if (e && e.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
      drag.active = false;
      if (!drag.moved) return;
      drag.moved = false;
      bar.classList.remove('dragging');
      /* Подавляем click, следующий за тягой: перехватываем его на
         фазе захвата и отменяем, чтобы чип не «нажался» случайно. */
      var suppress = function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        bar.removeEventListener('click', suppress, true);
      };
      bar.addEventListener('click', suppress, true);
      setTimeout(function() { bar.removeEventListener('click', suppress, true); }, 0);
    }

    /* На window — потому что отпустить кнопку можно вне строки (до захвата) */
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    /* Колесо мыши над строкой: вертикальная прокрутка переводится
       в горизонтальную и двигает только строку, не страницу. */
    bar.addEventListener('wheel', function(e) {
      if (bar.scrollWidth <= bar.clientWidth) return;
      var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      if (e.deltaMode === 1) delta *= 16; /* lines -> pixels */
      e.preventDefault();
      bar.scrollLeft += delta;
    }, { passive: false });

    return updateScrollable();
  }

  /* ---- Строка чипов: адаптивная раскладка ----
     Мало чипов  → растянуть на всю ширину равными промежутками.
     Много чипов → ступенчато ужимать отступы и паддинги чипов
     и только потом включать горизонтальную прокрутку. */
  /* Ступени «ужимания» строки: пустая строка (обычный вид) →
     compact (плотнее) → compact-x (максимально плотно). */
  var CHIP_FIT_STEPS = ['', 'compact', 'compact-x'];
  function layoutChipsBar(bar) {
    if (!bar || !bar.clientWidth) return; /* экран скрыт — раскладка выполнится при его показе */
    for (var i = 0; i < CHIP_FIT_STEPS.length; i++) {
      bar.classList.remove('spread', 'compact', 'compact-x');
      if (CHIP_FIT_STEPS[i]) bar.classList.add(CHIP_FIT_STEPS[i]);
      if (bar.scrollWidth <= bar.clientWidth + 1) { bar.classList.add('spread'); break; }
    }
    /* Синхронизируем .scrollable (курсор grab) с итоговой раскладкой */
    bar.classList.toggle('scrollable', bar.scrollWidth > bar.clientWidth + 1);
  }
  /* Раскладывает ВСЕ строки чипов на странице: на главном экране
     и на каждом экране кошелька. */
  function layoutChipsBars() {
    document.querySelectorAll('.chips-bar').forEach(layoutChipsBar);
  }

  /* ---- Навигация между экранами ----
     Каждый экран — блок .screen с id="screen-<имя>"; показ экрана —
     это класс active на нужном блоке (CSS плавно его проявляет).
     showScreen(screenId, pushHistory): идёт на экран screenId;
     pushHistory === false → не записывать переход в историю. */
  function showScreen(screenId, pushHistory) {
    closeMenu();
    /* Текущий экран кладём в стек истории — к нему вернёт кнопка
       «Назад». pushHistory === false используют goBack и стартовый
       показ, чтобы не создавать лишних записей. */
    if (pushHistory !== false && currentScreen !== screenId) {
      navHistory.push(currentScreen);
    }

    currentScreen = screenId;

    /* Убираем флаги со всех экранов и показываем целевой,
       сбросив его прокрутку наверх. */
    screens.forEach(function(s) {
      s.classList.remove('active', 'slide-left');
    });

    var target = document.getElementById('screen-' + screenId);
    if (target) {
      target.classList.add('active');
      target.scrollTop = 0;
    }

    /* Подсвечиваем чип, соответствующий открытому экрану */
    if (screenId === 'home') setActiveChip('all');
    else if (screenId === 'wallet-detail') setActiveChip('main');
    else if (screenId === 'wallet-detail-trading') setActiveChip('trading');
    else if (screenId === 'wallet-detail-savings') setActiveChip('savings');
    else if (screenId === 'wallet-detail-invest') setActiveChip('invest');
    else if (screenId === 'wallet-detail-business') setActiveChip('business');

    /* Плавающая кнопка «+» видна только на главном экране */
    if (fab) {
      fab.style.opacity = (screenId === 'home') ? '1' : '0';
      fab.style.pointerEvents = (screenId === 'home') ? 'auto' : 'none';
      fab.style.transform = (screenId === 'home') ? 'scale(1)' : 'scale(0.5)';
    }

    /* Экран только что стал видимым — пересчитываем его строку чипов */
    layoutChipsBars();
  }

  /* Кнопка «Назад»: снимает верхний экран со стека истории
     и показывает его; если история пуста — идём на главную. */
  function goBack() {
    closeMenu();
    if (navHistory.length > 0) {
      var prev = navHistory.pop();
      showScreen(prev, false);
    } else {
      showScreen('home', false);
    }
  }
  /* ---- Обработка кликов (делегирование событий) ----
     Один обработчик на весь документ определяет намерение по
     ближайшему подходящему предку (Element.closest()): кнопка «⋮»,
     пункт меню, шапка сворачиваемой секции, язык, чип, FAB,
     ячейка кошелька, кнопка «Назад», переход data-nav. */
  document.addEventListener('click', function(e) {

    /* Кнопка «⋮» — открыть/закрыть выпадающее меню (есть на каждом экране) */
    if (e.target.closest('.kebab-btn')) {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuOpen()) closeMenu(); else openMenu();
      return;
    }

    /* Пункт «Ночной/Дневной режим» в меню */
    if (e.target.closest('#menu-theme')) {
      e.preventDefault();
      toggleTheme();
      closeMenu();
      return;
    }

    /* Шапка сворачиваемой секции «Доход»/«История» (на любом экране
       кошелька): класс collapsed прячет тело секции (см. CSS). */
    var incHeader = e.target.closest('.income-header');
    if (incHeader) {
      e.preventDefault();
      var sec = incHeader.closest('.income-section');
      if (sec) sec.classList.toggle('collapsed');
      return;
    }

    /* Выбор языка на экране «Язык» */
    var langItem = e.target.closest('.lang-item');
    if (langItem) {
      e.preventDefault();
      setLanguage(langItem.getAttribute('data-lang'));
      return;
    }

    /* Клик мимо открытого меню — просто закрываем его */
    if (isMenuOpen() && !e.target.closest('#kebab-menu')) {
      closeMenu();
    }

    /* Универсальный переход: элемент с data-nav="экран" (пункты меню,
       кнопка «Отмена» и т.п.) открывает указанный экран */
    var target = e.target.closest('[data-nav]');
    if (target) {
      e.preventDefault();
      showScreen(target.getAttribute('data-nav'));
      return;
    }

    /* Кнопка «Назад» в шапке экрана */
    var backBtn = e.target.closest('[data-back]');
    if (backBtn) {
      e.preventDefault();
      goBack();
      return;
    }

    /* Клик по чипу: подсветить его и открыть экран кошелька;
       чип all возвращает на главный экран со списком кошельков */
    var chip = e.target.closest('[data-chip]');
    if (chip) {
      e.preventDefault();
      var chipId = chip.getAttribute('data-chip');
      setActiveChip(chipId);
      if (chipId === 'all') showScreen('home');
      else if (chipId === 'main') showScreen('wallet-detail');
      else if (chipId === 'trading') showScreen('wallet-detail-trading');
      else if (chipId === 'savings') showScreen('wallet-detail-savings');
      else if (chipId === 'invest') showScreen('wallet-detail-invest');
      else if (chipId === 'business') showScreen('wallet-detail-business');
      return;
    }

    /* Плавающая кнопка «+» — экран создания нового кошелька */
    var fabEl = e.target.closest('#fab-add');
    if (fabEl) {
      e.preventDefault();
      showScreen('add-wallet');
      return;
    }

    /* Клик по ячейке кошелька в списке — открыть его детальный экран */
    var walletCell = e.target.closest('[data-wallet]');
    if (walletCell) {
      e.preventDefault();
      var walletId = walletCell.getAttribute('data-wallet');
      if (walletId === 'main') showScreen('wallet-detail');
      else if (walletId === 'trading') showScreen('wallet-detail-trading');
      else if (walletId === 'savings') showScreen('wallet-detail-savings');
      else if (walletId === 'invest') showScreen('wallet-detail-invest');
      else if (walletId === 'business') showScreen('wallet-detail-business');
      return;
    }
  });

  /* ---- Часы в статус-баре ----
     Показывают текущее время ЧЧ:ММ; интервал 30 секунд, чтобы
     обновление не «опаздывало» на целую минуту. */
  function updateClock() {
    var now = new Date();
    var el = document.getElementById('status-time');
    if (el) {
      el.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
  }

  /* ---- Инициализация при загрузке ----
     1. applyLang — применить сохранённый/системный язык ко всей странице.
     2. updateClock — сразу нарисовать время и обновлять его каждые 30 с.
     3. showScreen(home, false) — открыть главный экран (без истории).
     4. Подготовить строки чипов: drag/wheel-прокрутка, адаптивная
        раскладка, пересчёт при изменении размера окна. */
  applyLang(currentLang);
  updateClock();
  setInterval(updateClock, 30000);

  showScreen('home', false);

  /* Включаем прокрутку строк чипов мышью/колесом, их адаптивную
     раскладку и пересчёт при изменении размера окна. */
  var chipsUpdaters = [];
  document.querySelectorAll('.chips-bar').forEach(function(bar) {
    enableChipsScroll(bar);
    chipsUpdaters.push(function() { layoutChipsBar(bar); });
  });
  window.addEventListener('resize', function() {
    chipsUpdaters.forEach(function(update) { update(); });
  });
  /* Ещё один пересчёт после полной загрузки (шрифты могли сдвинуть размеры) */
  window.addEventListener('load', layoutChipsBars);

  /* ---- Публичный API ----
     Единственное, что попадает в глобальную область видимости.
     Используется прямо из HTML: onchange="WalletApp.toggleTheme()",
     а также доступно из консоли разработчика для отладки:
     WalletApp.showScreen(settings), WalletApp.setLanguage(en) и т.д. */
  window.WalletApp = {
    showScreen: showScreen,
    goBack: goBack,
    toggleTheme: toggleTheme,
    setLanguage: setLanguage,
    getLanguage: function() { return currentLang; }
  };
})();
