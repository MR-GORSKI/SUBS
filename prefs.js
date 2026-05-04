// prefs.js — user preferences, persisted in Supabase `public.user_settings.prefs` (JSONB).
// localStorage acts as a fast first-paint cache only. Source of truth is the table.
//
// Why not auth.user_metadata? Supabase refreshes user_metadata from the OAuth
// provider on every sign-in, wiping any custom keys. A dedicated table sidesteps that.

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

  async function loadRemote() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      const { data, error } = await sb
        .from('user_settings')
        .select('prefs')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.prefs || null;
    } catch (e) {
      console.warn('prefs remote load failed:', e);
      return null;
    }
  }

  async function saveRemote(prefs) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return; // not signed in — local cache only
      const { error } = await sb
        .from('user_settings')
        .upsert(
          { user_id: session.user.id, prefs, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    } catch (e) {
      console.warn('prefs remote save failed:', e);
    }
  }

  // React hook
  function usePrefs() {
    const [prefs, setPrefs] = React.useState(() => ({ ...DEFAULTS, ...(loadLocal() || {}) }));

    const prefsRef = React.useRef(prefs);
    React.useEffect(() => { prefsRef.current = prefs; }, [prefs]);

    // Hydrate from remote whenever auth becomes available.
    React.useEffect(() => {
      let mounted = true;
      const hydrate = async () => {
        const remote = await loadRemote();
        if (!mounted || !remote) return;
        setPrefs(p => {
          const merged = { ...DEFAULTS, ...p, ...remote };
          for (const k of Object.keys(merged)) {
            if (merged[k] !== p[k]) return merged;
          }
          return p;
        });
      };
      sb.auth.getSession().then(({ data }) => { if (data?.session) hydrate(); });
      const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
        // Only re-hydrate when there's a real auth transition, not on every event.
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          hydrate();
        }
      });
      return () => { mounted = false; listener.subscription.unsubscribe(); };
    }, []);

    // Mirror to localStorage on every change (fast first-paint next reload).
    React.useEffect(() => { saveLocal(prefs); }, [prefs]);

    // Cross-tab sync via storage events.
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
      saveRemote(next); // fire-and-forget
    }, []);

    return [prefs, setPref];
  }

  window.prefs = { loadLocal, saveLocal, DEFAULTS, usePrefs };
})();
