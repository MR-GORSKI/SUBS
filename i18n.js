// i18n.js — minimal translation lookup. EN + RU only.
// Usage: t('PER MONTH', lang) → 'PER MONTH' or 'В МЕСЯЦ'.
// Unknown keys fall back to the key itself (assumed English).

(function () {
  const dict = {
    // KPI labels
    'PER MONTH':         { RU: 'В МЕСЯЦ' },
    'PER YEAR':          { RU: 'В ГОД' },
    'NEXT CHARGE':       { RU: 'СЛЕД. СПИСАНИЕ' },
    'NEXT':              { RU: 'СЛЕД.' },
    'ACTIVE':            { RU: 'АКТИВНЫЕ' },
    'SPENT TOTAL':       { RU: 'ВСЕГО ПОТРАЧЕНО' },
    'LIFETIME':          { RU: 'ВСЕГО' },
    'projected':         { RU: 'прогноз' },
    'no upcoming':       { RU: 'нет ближайших' },
    'all time, all subs':{ RU: 'за всё время' },
    'all time':          { RU: 'за всё время' },
    'closed':            { RU: 'закрыто' },
    'active':            { RU: 'активно' },
    'active subs':       { RU: 'активных' },

    // Topbar / actions
    '+ NEW':             { RU: '+ НОВАЯ' },
    'SUBSCRIPTION TRACKER · v0.1': { RU: 'ТРЕКЕР ПОДПИСОК · v0.1' },

    // Modal
    'NEW SUBSCRIPTION':  { RU: 'НОВАЯ ПОДПИСКА' },
    'EDIT SUBSCRIPTION': { RU: 'РЕДАКТИРОВАТЬ' },
    'EDIT':              { RU: 'РЕДАКТИРОВАТЬ' },
    'Name':              { RU: 'Название' },
    'Price':             { RU: 'Цена' },
    'Currency':          { RU: 'Валюта' },
    'Period':            { RU: 'Период' },
    'Start date':        { RU: 'Дата начала' },
    'Bar color':         { RU: 'Цвет полосы' },
    'week':              { RU: 'нед.' },
    'month':             { RU: 'мес.' },
    'year':              { RU: 'год' },
    'CANCEL':            { RU: 'ОТМЕНА' },
    'SAVE':              { RU: 'СОХРАНИТЬ' },
    'ADD':               { RU: 'ДОБАВИТЬ' },
    'DELETE':            { RU: 'УДАЛИТЬ' },
    'CLOSE IT':          { RU: 'ЗАКРЫТЬ' },
    'CLOSE SUBSCRIPTION':{ RU: 'ЗАКРЫТЬ ПОДПИСКУ' },

    // Mobile tabs / details
    'TIMELINE':          { RU: 'ТАЙМЛАЙН' },
    'LIST':              { RU: 'СПИСОК' },
    'DETAILS':           { RU: 'ДЕТАЛИ' },
    'CLOSE?':            { RU: 'ЗАКРЫТЬ?' },
    'RESUME':            { RU: 'ВОЗОБНОВИТЬ' },
    'CLOSE':             { RU: 'ЗАКРЫТЬ' },
    'NEW':               { RU: 'НОВАЯ' },

    // Profile
    'Profile & Settings':       { RU: 'Профиль и настройки' },
    'PROFILE':                  { RU: 'ПРОФИЛЬ' },
    'PREFERENCES':              { RU: 'НАСТРОЙКИ' },
    'NOTIFICATIONS':            { RU: 'УВЕДОМЛЕНИЯ' },
    'ACCOUNT':                  { RU: 'АККАУНТ' },
    'DANGER ZONE':              { RU: 'ОПАСНАЯ ЗОНА' },
    'Default currency':         { RU: 'Валюта итогов' },
    'Used for new subscriptions and totals': { RU: 'Используется для общих сумм' },
    'Language':                 { RU: 'Язык' },
    'Interface language':       { RU: 'Язык интерфейса' },
    'Charge reminders':         { RU: 'Напоминания о списаниях' },
    'Get notified before a subscription renews': { RU: 'Уведомлять перед списанием' },
    'Push when a sub is about to renew': { RU: 'Уведомление перед списанием' },
    'Warn me before charge':    { RU: 'Предупреждать за' },
    'Days in advance for renewal alerts': { RU: 'Дней до списания' },
    'Warn me':                  { RU: 'Предупредить за' },
    'Days before charge':       { RU: 'Дней до списания' },
    'Sign out':                 { RU: 'Выйти' },
    'SIGN OUT →':               { RU: 'ВЫЙТИ →' },
    'Delete account':           { RU: 'Удалить аккаунт' },
    'Permanently remove your account and all subscription data. This cannot be undone.': {
      RU: 'Полное удаление аккаунта и всех данных. Отменить нельзя.',
    },
    'DELETE →':                 { RU: 'УДАЛИТЬ →' },
    'MEMBER SINCE':             { RU: 'С НАМИ С' },
    'CLOSED':                   { RU: 'ЗАКРЫТЫХ' },

    // Auth
    'Welcome back.':                              { RU: 'С возвращением.' },
    'Sign in to keep tabs on every recurring charge.': { RU: 'Войдите, чтобы следить за всеми подписками.' },
    'Continue with Google':                       { RU: 'Войти через Google' },
    'Sign up with Google':                        { RU: 'Регистрация через Google' },
    'Take control.':                              { RU: 'Возьмите всё под контроль.' },
    'One screen. Every subscription. Stop the slow drip.': { RU: 'Один экран. Все подписки. Стоп медленному оттоку.' },
    'One screen. Every subscription.':            { RU: 'Один экран. Все подписки.' },
    'SIGN IN':                                    { RU: 'ВХОД' },
    'SIGN UP':                                    { RU: 'РЕГИСТРАЦИЯ' },
    'NEW HERE?':                                  { RU: 'ВПЕРВЫЕ ЗДЕСЬ?' },
    'HAVE AN ACCOUNT?':                           { RU: 'УЖЕ ЕСТЬ АККАУНТ?' },
    'Create account':                             { RU: 'Создать' },
    'Sign in':                                    { RU: 'Войти' },
    'New here?':                                  { RU: 'Впервые?' },
    'Have an account?':                           { RU: 'Есть аккаунт?' },
    'FREE · no credit card':                      { RU: 'БЕСПЛАТНО · без карты' },
    '4 average subs cancelled / user':            { RU: '4 подписки в среднем отменяет юзер' },
    'v1.0 · brutalist edition':                   { RU: 'v1.0 · brutalist' },
    'track. cancel. save.':                       { RU: 'отслеживай. отменяй. экономь.' },

    // Footer
    'HOVER A BAR FOR DETAILS · CLICK TO EDIT · TODAY':
      { RU: 'НАВЕДИ НА ПОЛОСУ · КЛИК ЧТОБЫ РЕДАКТИРОВАТЬ · СЕГОДНЯ' },
    'TOTAL':           { RU: 'ВСЕГО' },
  };

  function t(key, lang) {
    if (lang === 'EN' || !lang) return key;
    const entry = dict[key];
    if (entry && entry[lang]) return entry[lang];
    return key;
  }

  window.i18n = { t, LANGUAGES: ['EN', 'RU'] };
})();
