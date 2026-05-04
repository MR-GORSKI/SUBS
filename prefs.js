// prefs.js — user preferences (display currency, language).
// Stored in localStorage. Per-device (not synced via Supabase).

(function () {
  const KEY = 'subs:prefs:v1';
  const DEFAULTS = {
    displayCurrency: 'EUR',
    language: 'EN',
    googleCalendarEnabled: false,
    googleCalendarId: null,
    warnDays: 3,
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...(parsed || {}) };
    } catch { return { ...DEFAULTS }; }
  }

  function save(prefs) {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
  }

  // React hook
  function usePrefs() {
    const [prefs, setPrefs] = React.useState(load);

    React.useEffect(() => { save(prefs); }, [prefs]);

    // Sync across tabs
    React.useEffect(() => {
      const onStorage = (e) => { if (e.key === KEY) setPrefs(load()); };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setPref = React.useCallback((k, v) => {
      setPrefs(p => ({ ...p, [k]: v }));
    }, []);

    return [prefs, setPref];
  }

  window.prefs = { load, save, DEFAULTS, usePrefs };
})();
