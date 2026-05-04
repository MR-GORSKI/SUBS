# SUBS — Техническое задание для разработки

> **Контекст**: это front-end прототип трекера подписок. Реализован как single-page React-приложение через Babel-standalone (без сборки). Цель этого ТЗ — описать архитектуру, контракты и инварианты, чтобы при доработке в продакшен-версию (или любой переписке) не сломать UX и расчётную логику.

---

## 1. Стек и структура файлов

```
index.html             — единая entry-точка; внутри inline-роутер выбирает Desktop App vs MobileApp по matchMedia(<=768px)
styles.css             — все стили, CSS variables, theme/density modifiers
mobile.css             — стили мобилки (префикс .m-*)
auth.css               — стили auth + profile (десктоп + мобилка)
tweaks-panel.jsx       — стартовый компонент панели Tweaks (host protocol)
ios-frame.jsx          — iPhone bezel (только для design-canvas, в проде НЕ грузится)
design-canvas.jsx      — дизайн-превью (НЕ в проде)
utils.jsx              — pure функции: даты, деньги, расчёты, sample data
modals.jsx             — SubModal (add/edit), ConfirmModal (десктоп)
gantt.jsx              — Gantt, GanttRow, Tooltip (десктоп)
auth.jsx               — AuthSignIn / AuthSignUp / MobileAuth / DesktopProfile / MobileProfile (Google-only)
mobile.jsx             — MobileApp, MobileTimeline, MobileCard, MobileSheet, MobileSubForm
app.jsx                — десктопный App (экспортирует window.App, не авто-маунтится)
```

**Порядок загрузки скриптов в `index.html`** (они шарят глобальный scope через `window`):
1. React → ReactDOM → Babel
2. `tweaks-panel.jsx` — экспортирует `TweaksPanel`, `useTweaks`, `TweakSection`, `TweakRadio`, `TweakToggle`, и т.д.
3. `utils.jsx` — экспортирует все утилиты в `window` (см. список ниже)
4. `modals.jsx` → 5. `gantt.jsx` → 6. `auth.jsx` → 7. `app.jsx` → 8. `mobile.jsx`
9. Inline `<script type="text/babel">` определяет `MobileShell` (управляет subs/persistence/today для мобилки) и маунтит либо `<App />` либо `<MobileShell />`.

**Запрещено**:
- Использовать `type="module"` на скриптах — сломает Babel.
- Называть переменные `styles` (коллизия в global scope). Уже соблюдено: используются inline-стили.
- Менять порядок загрузки.

---

## 2. Модель данных

```ts
type Subscription = {
  id: string;            // 's' + timestamp или 's1'..'s4' для seed
  name: string;          // отображается в строке + тултипе
  price: number;         // в евро (число, не строка)
  period: 'week' | 'month' | 'year';
  start: string;         // ISO 'YYYY-MM-DD' — день первого списания
  color: string;         // строка oklch(...) из ACCENTS
  closed: string | null; // ISO дата закрытия, либо null
};
```

**Инварианты**:
- `start` — это **дата первого списания**. Все будущие списания вычисляются от неё (см. §4).
- `closed` хранится как ISO-строка, не Date. При парсинге всегда через `parseISO()`.
- Цвета подписок берутся **только из `ACCENTS`** (массив из 8 oklch-цветов). Не вводить произвольные цвета — они не вписываются в палитру.

---

## 3. Сегодняшняя дата

`today = new Date()`, нормализованная на полдень (12:00) — чтобы избежать DST-багов при сравнении дат. Хранится в обоих shell'ах:
- Desktop: внутри `App` через `useMemo`.
- Mobile: внутри `MobileShell` (inline в `index.html`) через `useMemo` и передаётся в `MobileApp` как prop.

---

## 4. Расчётная логика (utils.jsx)

Все функции — **чистые**, без побочных эффектов. Не менять сигнатуры.

| Функция | Контракт |
|---|---|
| `parseISO(s)` | "YYYY-MM-DD" → Date в локальной таймзоне (полночь) |
| `ymd(d)` | Date → "YYYY-MM-DD" |
| `addMonths(d, n)` | Сохраняет день месяца, **клемпит к концу месяца** (31 янв + 1мес = 28/29 фев). Не использовать `setMonth` напрямую. |
| `addDays(d, n)` | Прибавляет дни (мутирует копию). |
| `chargeDates(startISO, period, horizon)` | Возвращает массив всех Date списаний от start до horizon включительно. **Включает сам start** как charge #1. |
| `totalSpent(sub, today)` | Сумма всех состоявшихся списаний. Если `closed` < today, обрезает по closed. |
| `nextChargeAfter(sub, today)` | Возвращает первую дату списания > today, либо `null` если sub закрыта раньше. |
| `toMonthly / toYearly` | Нормализация цены на period. week → ×52/12, year → /12. |
| `buildMonthAxis(scaleMonths, today)` | Возвращает `{start, end, months[], past, future}`. Центрирует today: `past = floor(scale * 0.45)`. |
| `posWithin(date, axis)` | Date → доля [0,1] внутри axis. Клемпится. |

**Не трогать `chargeDates`** — она лежит в основе позиционирования тиков и подсчёта `totalSpent`. Любое изменение сместит маркеры на диаграмме.

---

## 5. Гант-диаграмма (gantt.jsx)

### Структура DOM
- `.gantt` — CSS grid `220px 1fr` (label-колонка + chart-колонка).
- Header строка: `.gantt__labels-head` + `.gantt__chart-head` с тиками месяцев + красным today-маркером.
- Каждый sub генерит **2 ячейки** (label + chart), каждая высотой 56px (нормальная плотность).

### Логика отрисовки полосы (`GanttRow`)
Полоса состоит из 2 сегментов, рендерящихся как **отдельные `.bar` div'ы**:

1. **Solid** (`solidStart` → `solidEnd`):
   - `solidStart = parseISO(sub.start)`
   - `solidEnd = closedAt && closedAt < today ? closedAt : today`
   - Рендерится только если `start <= today`.
   - У закрытых добавляется `border-right: 2px solid` для жёсткого обрыва.

2. **Pale** (`today` → `nextChargeAfter`):
   - Только для активных (`!sub.closed`).
   - Рендерится с opacity 0.22 + штриховка `repeating-linear-gradient(-45deg, ...)` opacity 0.45.
   - `pointer-events: none` — hover работает только на solid сегменте.

3. **Future-start** (sub стартует в будущем):
   - Рендерится только pale-штриховка от `start` до `next`. Solid не рисуется.

### Маркеры
- **Charge ticks**: ромбы (rotate 45°) на каждой прошедшей дате charge, пунктирные вертикали на будущих.
- **CLOSED marker**: вертикальная линия + плашка "CLOSED" на дате `closed`, рисуется только если closedAt в видимом окне axis.
- **Today line**: пунктир `oklch(0.62 0.22 28)` через всю строку, z-index 8.

### Tooltip
Появляется по `onMouseEnter` на solid-сегменте. Position fixed, клемпится к viewport. Содержит: цена/период, дата старта, next charge или дата закрытия, monthly/yearly equiv, charges count + total spent.

### Шкала
4 значения: 3 / 6 / 12 / 24 месяца. Меняется через `.scale-toggle` в toolbar или через Tweaks-панель. **Состояние scale живёт в App, не в Gantt** — его дублирует Tweaks-радио.

---

## 6. Состояние (app.jsx)

```js
const [subs, setSubs] = useState(SAMPLE_SUBS);
const [scale, setScale] = useState(12);
const [modal, setModal] = useState(null); // {kind, id?}
const [tweaks, setTweak] = useTweaks({theme, density, showKpis});
```

**Действия**:
- `openAdd()` → `modal = {kind:'add'}`
- `openEdit(id)` → `{kind:'edit', id}` — открывается также при клике по полосе.
- `onClose(id)` → `{kind:'close', id}` — confirm-модалка.
- `confirmClose()` — `setSubs` устанавливает `closed: ymd(today)`.
- `onResume(id)` — снимает `closed = null`. Sub продолжает биллинг от исходного `start`, **не от даты возобновления**. Это важно: даты последующих charges остаются на их прежних слотах календаря.
- `onDelete(id)` — полное удаление.

**Сортировка**: активные первыми, по `start` desc; закрытые в конце.

---

## 7. Стили и токены

CSS variables в `:root` (`styles.css`):
- Фон: `--bg`, `--bg-2`, `--paper`
- Текст: `--ink`, `--ink-2`, `--ink-3`
- Линии: `--line`, `--line-soft`, `--grid`
- Тени: `--shadow` (4px 4px 0 0 ink), `--shadow-sm` (2px 2px)
- Шрифты: `--mono`, `--display`

**Темы**: `.theme-dark` переопределяет переменные. `.density-tight/loose` меняет высоту строк и баров.

**Не вводить новые цвета вне ACCENTS и oklch-палитры**. Не использовать border-radius (брутализм). Не использовать gradients (кроме штриховки в pale-сегменте).

---

## 8. Tweaks (host protocol)

Хост (родительская страница) шлёт `__activate_edit_mode` / `__deactivate_edit_mode`. Панель экспортируется через `<TweaksPanel>` из `tweaks-panel.jsx`. **Не править этот файл вручную** — это starter component, контракт держится с хостом.

Тweakable defaults:
```js
/*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "normal",
  "showKpis": true
}/*EDITMODE-END*/
```
JSON между маркерами должен быть валидным (двойные кавычки). Один такой блок на весь проект.

---

## 9. Что нельзя ломать

- ✋ Контракт `Subscription` (поля и типы).
- ✋ Логику `chargeDates` и `nextChargeAfter` — на ней висит вся диаграмма + KPI.
- ✋ Двух-сегментный рендер полосы (solid + pale). Это ключевое UX-решение: видеть, **сколько осталось до следующего списания**.
- ✋ Поведение CLOSED: полоса обрывается на дате закрытия с маркером, дальше пусто. Не закрашивать будущие месяцы.
- ✋ Брутализм: 2px рамки, никаких скруглений, моноширинный текст для всех чисел/UI, sdvig-shadow на кнопках.
- ✋ Чёрные/белые base + ровно 8 акцентов в ACCENTS.
- ✋ `font-variant-numeric: tabular-nums` на цифрах KPI и тултипа — иначе цифры прыгают.

---

## 9b. Мобильная версия

Мобильный shell живёт в `index.html` (inline `MobileShell`) + `mobile.jsx`. Тот же data layer и расчёты, что и десктоп.

**Архитектурное правило**: всё в `utils.jsx` шарится между десктопом и мобилкой. **Не дублировать** функции дат/денег/расчётов в `mobile.jsx`. Если меняется контракт `Subscription` — это меняется в одном месте.

**Что разное в мобилке**:
- Гант не горизонтальный широкий, а сжатый: 110px колонка с именем + flex-1 chart, скейл 3M/6M/12M (без 24M).
- Месяцы в шапке таймлайна — одна буква (M/A/M…), достаточно для ориентации, остальное hover-free.
- Вместо `<SubModal>` — `<MobileSheet>` с slide-up анимацией.
- Список (`<MobileCard>`) — альтернативный вид с progress-баром текущего цикла (last charge → next charge), показывает «дней до списания».
- Tooltip отсутствует — детали открываются по тапу через edit-sheet.

**Что общее (не ломать)**:
- Цвета акцентов (8 oklch).
- Двух-сегментный progress-pattern (solid + штриховка).
- Поведение CLOSED — обрыв полосы.
- Все CSS variables из `styles.css` — мобильные стили читают `--ink`, `--paper` и т.д.

## 9.1 Auth & Profile (`auth.jsx` + `auth.css`)

**Экспортируемые компоненты:**
- `AuthSignIn({ onSignIn, onSignUp })` — десктопный sign in (двухколоночный poster + Google-кнопка).
- `AuthSignUp({ onSignUp, onSignIn })` — десктопный sign up.
- `MobileAuth({ mode, onSignIn, onSignUp, onBack })` — мобильный аналог (single-column).
- `DesktopProfile({ user, stats, onClose, onSignOut })` — full-screen overlay с настройками (Preferences / Notifications / Danger Zone). `user` = `{name, email, memberSince}`, `stats` = `{active, closed}`.
- `MobileProfile({ user, onClose, onSignOut, standalone })` — bottom sheet с теми же настройками. `standalone` — для design canvas (в продакшене не нужен).

**Auth-методы**: только Google (single CTA "Continue with Google"). Email/password сняты — Google сам решает recovery / 2FA. Кнопка ведёт на `onSignIn/onSignUp` коллбэк, который при интеграции с Supabase вызовет `supabase.auth.signInWithOAuth({provider:'google'})`.

**Routing в App / MobileApp**:
- Локальное `view` state: `'app' | 'signin' | 'signup' | 'profile'`.
- Default = `'app'` (для дев-режима без подключённого Supabase). При подключении auth — менять на `'signin'` пока сессии нет.
- Из `app` → `profile` через клик по `.topbar__avatar` (десктоп) / `.m-iconbtn` справа (мобилка).
- Из `profile` → `signin` через "Sign out".
- На десктопе `view` синхронизирован с Tweak `view`, чтобы можно было переключать состояния через панель Tweaks для демо.

**Поля профиля**:
- Имя/Email берутся из `user` prop (после интеграции — из Supabase session).
- Default currency: EUR / USD / RUB (+ GBP на десктопе) — segmented control.
- Language: EN / RU / DE (+ FR на десктопе) — segmented.
- Theme: light / dark (+ auto на десктопе).
- Charge reminders — iOS-стиль toggle.
- Warn N days before charge — stepper (1–14).
- Sign out — обычная кнопка.
- Delete account — danger-кнопка (mock, не подтверждает).

**Не ломать**:
- Auth/Profile повторно используют CSS-переменные из `styles.css`. При смене темы автоматически адаптируются.
- Sign-out должен ВСЕГДА вести на `signin` (а не `signup` или сразу `app`).

## 10. Известные ограничения / TODO

- [x] Персистентность: `localStorage` под ключом `subs:data:v1`. Будет заменено на Supabase.
- [x] `today` = `new Date()` (нормализована на полдень).
- [ ] **Supabase backend** — не подключён. Auth-кнопки сейчас просто переключают view. Таблица `subscriptions` + RLS + Google OAuth — следующий шаг.
- [ ] Нет мульти-валюты — везде зашит €. При расширении: добавить поле `currency` в Subscription, конвертацию в `fmtMoney`.
- [ ] Нет графика трат по месяцам (доп. виджет под KPI).
- [ ] Нет категорий и логотипов сервисов.
- [ ] Edit-flow клик-по-полосе работает, но клик по pale-сегменту — нет (`pointer-events: none`). Решается обёрткой обоих сегментов в один прозрачный hit-target поверх.
- [ ] Гант не скроллится горизонтально — все 24 месяца ужимаются в ширину контейнера. Для дальних диапазонов добавить min-width + overflow-x на `.gantt__chart-head` и каждом `.row-chart` синхронно.

---

## 11. Тестовые данные

```js
SAMPLE_SUBS = [
  { name: 'YouTube Premium', price: 10,  period: 'month', start: '2025-01-07', color: ACCENTS[0] },
  { name: 'ChatGPT Plus',    price: 25,  period: 'month', start: '2025-06-10', color: ACCENTS[3] },
  { name: 'Claude Pro',      price: 100, period: 'month', start: '2026-04-12', color: ACCENTS[5] },
  { name: 'Martini AI',      price: 50,  period: 'month', start: '2026-04-17', color: ACCENTS[6] },
];
```

Эти данные специально подобраны так, чтобы при `today = 04.05.2026` показать полный спектр кейсов: давнюю подписку, недавнюю, и две только что начатые. Когда `today` = реальная сегодняшняя дата, картина естественно сместится — sample-данные остаются полезны как первая загрузка, дальше пользователь добавляет своё. Не трогать без причины.

---

## 12. Чеклист для проверки после изменений

1. KPI: per month, per year, next charge, active/total, spent total — все цифры > 0.
2. У YouTube видны 16 ромбов-маркеров (по числу прошедших списаний).
3. Pale-секция у каждой активной подписки заканчивается на её следующей дате charge — у YouTube ~07 числа, у ChatGPT ~10, у Claude ~12, у Martini ~17.
4. Hover на solid-сегменте → тултип с актуальными цифрами.
5. Кнопка CLOSE на YouTube → confirm → полоса обрывается на 04.05, маркер CLOSED, pale-секция пропадает, KPI пересчитываются.
6. RESUME на закрытой → полоса возвращается, pale до 07.06.
7. + NEW → форма → Save → новая полоса появляется в списке сверху.
8. Переключение темы → все цвета инвертируются, акценты остаются читаемыми.
9. Tweak Density: tight/normal/loose меняет высоту строк синхронно с высотой баров.
10. Шкала 3M/6M/12M/24M — today всегда видим, ось перестраивается.
