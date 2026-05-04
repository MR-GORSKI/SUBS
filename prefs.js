// prefs.js — user preferences, synced via Supabase auth.user.user_metadata.subs_prefs.
// localStorage acts as a fast first-paint cache only. Source of truth is the server.
//
// On change: write goes to Supabase (user_metadata.subs_prefs is shallow-merged
// alongside Google's profile fields). Other devices pick up the new values on
// next sign-in / session refresh — i.e. eventually consistent, not realtime.

(function () {
  const KEY = 'subs:prefs:v1';
  const DEFAULTS = {
    displayCurrency: 'EUR',
    language: 'EN',
    googleCalendarEnabled: false,
    googleCalendarId: null,
    warnDays: 3,
  };

  function loadLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch { return null; }
  }

  function saveLocal(prefs) {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
  }

  async function saveRemote(prefs) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return; // not signed in — local cache only
      // Supabase shallow-merges `data` into user_metadata, so passing
      // { subs_prefs: ... } leaves Google's profile fields (full_name, picture, etc.) intact.
      const { error } = await sb.auth.updateUser({ data: { subs_prefs: prefs } });
      if (error) throw error;
    } catch (e) {
      console.warn('prefs remote save failed:', e);
    }
  }

  // React hook
  function usePrefs() {
    // Initial: defaults overlaid with last-known local cache (instant first paint).
    const [prefs, setPrefs] = React.useState(() => ({ ...DEFAULTS, ...(loadLocal() || {}) }));

    // Latest-prefs ref so setPref can compute next value without depending on state.
    const prefsRef = React.useRef(prefs);
    React.useEffect(() => { prefsRef.current = prefs; }, [prefs]);

    // Hydrate from the server whenever auth state changes (sign-in, refresh, user_updated).
    React.useEffect(() => {
      let mounted = true;
      const applyFromSession = (session) => {
        if (!mounted) return;
        const remote = session?.user?.user_metadata?.subs_prefs;
        if (!remote) return;
        setPrefs(p => {
          const merged = { ...DEFAULTS, ...p, ...remote };
          // Skip re-render if nothing actually changed
          for (const k of Object.keys(merged)) {
            if (merged[k] !== p[k]) return merged;
          }
          return p;
        });
      };
      sb.auth.getSession().then(({ data }) => applyFromSession(data?.session));
      const { data: listener } = sb.auth.onAuthStateChange((_e, session) => applyFromSession(session));
      return () => { mounted = false; listener.subscription.unsubscribe(); };
    }, []);

    // Mirror to localStorage on every change (fast cache for next reload).
    React.useEffect(() => { saveLocal(prefs); }, [prefs]);

    // Cross-tab sync: another tab wrote to localStorage → pick it up.
    React.useEffect(() => {
      const onStorage = (e) => {
        if (e.key !== KEY) return;
        const fresh = loadLocal();
        if (fresh) setPrefs({ ...DEFAULTS, ...fresh });
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setPref = React.useCallback((k, v) => {
      const next = { ...prefsRef.current, [k]: v };
      setPrefs(next);
      saveRemote(next); // fire-and-forget; failures only log
    }, []);

    return [prefs, setPref];
  }

  window.prefs = { loadLocal, saveLocal, DEFAULTS, usePrefs };
})();
