// app.jsx — main shell with KPIs + state management

const { useState: useS, useMemo: useM, useEffect: useE } = React;

const STORAGE_KEY = 'subs:data:v1';

function loadSubs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Auth screens are presented inside the same .app container so the artifact stays
// the same shape. Just gives them centered, fixed-width framing.
function AuthGateWrapper({ children }) {
  return (
    <div className="auth-gate">
      <div className="auth-gate__frame">{children}</div>
    </div>
  );
}

function App() {
  const [subs, setSubs] = useS(() => loadSubs() ?? SAMPLE_SUBS);
  const [scale, setScale] = useS(12);
  const [modal, setModal] = useS(null); // {kind:'add'|'edit'|'close', id?}
  const [view, setView] = useS('app'); // 'app' | 'signin' | 'signup' | 'profile'
  const [tweaks, setTweak] = (window.useTweaks || (() => [{}, () => {}]))(/*EDITMODE-BEGIN*/{
    "theme": "light",
    "density": "normal",
    "showKpis": true,
    "view": "app"
  }/*EDITMODE-END*/);

  // Persist on every change (until Supabase is wired)
  useE(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(subs)); } catch {}
  }, [subs]);

  // Sync tweak-controlled view → state
  useE(() => { if (tweaks.view && tweaks.view !== view) setView(tweaks.view); }, [tweaks.view]);
  const goView = (v) => { setView(v); setTweak('view', v); };

  // Real today, normalized to noon to avoid DST edge-cases when comparing dates
  const today = useM(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const activeSubs = subs.filter(s => !s.closed);

  // KPIs
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + toMonthly(s.price, s.period), 0);
  const yearlyTotal  = activeSubs.reduce((sum, s) => sum + toYearly(s.price, s.period), 0);

  const upcoming = activeSubs
    .map(s => ({ sub: s, date: nextChargeAfter(s, today) }))
    .filter(x => x.date)
    .sort((a, b) => a.date - b.date)[0];

  const lifetime = subs.reduce((sum, s) => sum + totalSpent(s, today), 0);

  // Sort subs: active first, by start date desc; closed last
  const sortedSubs = useM(() => {
    return [...subs].sort((a, b) => {
      if (!!a.closed !== !!b.closed) return a.closed ? 1 : -1;
      return parseISO(b.start) - parseISO(a.start);
    });
  }, [subs]);

  // Handlers
  const openAdd = () => setModal({kind: 'add'});
  const openEdit = (id) => setModal({kind: 'edit', id});
  const closeModal = () => setModal(null);

  const onSave = (data) => {
    if (data.id) {
      setSubs(prev => prev.map(s => s.id === data.id ? {...s, ...data} : s));
    } else {
      const id = 's' + Date.now();
      setSubs(prev => [{...data, id}, ...prev]);
    }
    closeModal();
  };

  const onClose = (id) => setModal({kind: 'close', id});
  const confirmClose = () => {
    const id = modal.id;
    setSubs(prev => prev.map(s => s.id === id ? {...s, closed: ymd(today)} : s));
    closeModal();
  };

  const onResume = (id) => {
    setSubs(prev => prev.map(s => s.id === id ? {...s, closed: null} : s));
  };

  const onDelete = (id) => {
    setSubs(prev => prev.filter(s => s.id !== id));
    if (modal?.id === id) closeModal();
  };

  const editingSub = modal?.id ? subs.find(s => s.id === modal.id) : null;

  const themeClass = tweaks.theme === 'dark' ? 'theme-dark' : '';
  const densityClass = `density-${tweaks.density || 'normal'}`;

  useE(() => {
    document.body.className = `${themeClass} ${densityClass}`;
  }, [themeClass, densityClass]);

  // ── Auth views ───────────────────────────────────────────
  if (view === 'signin') {
    return <AuthGateWrapper><AuthSignIn onSignIn={() => goView('app')} onSignUp={() => goView('signup')} /></AuthGateWrapper>;
  }
  if (view === 'signup') {
    return <AuthGateWrapper><AuthSignUp onSignUp={() => goView('app')} onSignIn={() => goView('signin')} /></AuthGateWrapper>;
  }

  return (
    <div className="app">
      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand">
          <div className="brand__logo">SUBS<span style={{color:'oklch(0.62 0.22 28)'}}>×</span></div>
          <div className="brand__sub">SUBSCRIPTION TRACKER · v0.1</div>
        </div>
        <div className="topbar__right">
          <button className="btn btn--sm btn--ghost" onClick={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')}>
            {tweaks.theme === 'dark' ? '☀ LIGHT' : '☾ DARK'}
          </button>
          <button className="btn btn--sm btn--primary" onClick={openAdd}>+ NEW</button>
          <button
            className="topbar__avatar"
            onClick={() => goView('profile')}
            title="Profile & settings"
            aria-label="Profile"
          >A</button>
        </div>
      </div>

      {/* KPIs */}
      {tweaks.showKpis !== false && (
        <div className="kpis">
          <div className="kpi">
            <div className="kpi__label">PER MONTH <span className="kpi__tag">EUR</span></div>
            <div className="kpi__num">{fmtMoney(monthlyTotal)}</div>
            <div className="kpi__sub">{activeSubs.length} active subs</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">PER YEAR</div>
            <div className="kpi__num">{fmtMoney(yearlyTotal)}</div>
            <div className="kpi__sub">projected</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">NEXT CHARGE</div>
            {upcoming ? (
              <>
                <div className="kpi__num kpi__num--sm">{fmtMoney(upcoming.sub.price)}</div>
                <div className="kpi__sub">
                  <span style={{color:'var(--ink)', fontWeight:700}}>{upcoming.sub.name}</span>
                  {' · '}
                  {fmtDateShort(upcoming.date)}
                  {' · in '}{diffDays(today, upcoming.date)}d
                </div>
              </>
            ) : (
              <>
                <div className="kpi__num kpi__num--sm">—</div>
                <div className="kpi__sub">no upcoming</div>
              </>
            )}
          </div>
          <div className="kpi">
            <div className="kpi__label">ACTIVE</div>
            <div className="kpi__num">{activeSubs.length}<span style={{color:'var(--ink-3)', fontSize:'18px'}}>/{subs.length}</span></div>
            <div className="kpi__sub">{subs.length - activeSubs.length} closed</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">SPENT TOTAL</div>
            <div className="kpi__num">{fmtMoney(lifetime)}</div>
            <div className="kpi__sub">all time, all subs</div>
          </div>
        </div>
      )}

      {/* GANTT */}
      <Gantt
        subs={sortedSubs}
        today={today}
        scale={scale}
        onScaleChange={setScale}
        onClose={onClose}
        onResume={onResume}
        onDelete={onDelete}
        onEdit={openEdit}
      />

      <div className="foot-note">
        <span>HOVER A BAR FOR DETAILS · CLICK TO EDIT · TODAY = {fmtDate(today)}</span>
        <span>{subs.length} TOTAL · {activeSubs.length} ACTIVE</span>
      </div>

      {/* MODALS */}
      {modal?.kind === 'add' && (
        <SubModal onSave={onSave} onClose={closeModal} onDelete={onDelete} />
      )}
      {modal?.kind === 'edit' && editingSub && (
        <SubModal sub={editingSub} onSave={onSave} onClose={closeModal} onDelete={onDelete} />
      )}
      {modal?.kind === 'close' && (() => {
        const sub = subs.find(s => s.id === modal.id);
        if (!sub) return null;
        return (
          <ConfirmModal
            title="CLOSE SUBSCRIPTION"
            body={<>Stop tracking future charges for <strong>{sub.name}</strong>? It stays in the timeline up to today's date with a CLOSED marker. You can resume any time.</>}
            confirmLabel="CLOSE IT"
            onConfirm={confirmClose}
            onClose={closeModal}
          />
        );
      })()}

      {/* Profile overlay */}
      {view === 'profile' && (
        <div className="profile-overlay">
          <DesktopProfile
            onClose={() => goView('app')}
            onSignOut={() => goView('signin')}
          />
        </div>
      )}

      {/* Tweaks panel */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Appearance">
            <window.TweakRadio
              label="Theme"
              value={tweaks.theme}
              onChange={(v) => setTweak('theme', v)}
              options={[{value:'light', label:'Light'}, {value:'dark', label:'Dark'}]}
            />
            <window.TweakRadio
              label="Density"
              value={tweaks.density}
              onChange={(v) => setTweak('density', v)}
              options={[{value:'tight', label:'Tight'}, {value:'normal', label:'Normal'}, {value:'loose', label:'Loose'}]}
            />
            <window.TweakToggle
              label="Show KPI strip"
              value={tweaks.showKpis !== false}
              onChange={(v) => setTweak('showKpis', v)}
            />
          </window.TweakSection>
          <window.TweakSection title="Timeline scale">
            <window.TweakRadio
              label="Months"
              value={String(scale)}
              onChange={(v) => setScale(Number(v))}
              options={[{value:'3', label:'3M'}, {value:'6', label:'6M'}, {value:'12', label:'12M'}, {value:'24', label:'24M'}]}
            />
          </window.TweakSection>
          <window.TweakSection title="View / state">
            <window.TweakSelect
              label="Show screen"
              value={view}
              onChange={(v) => goView(v)}
              options={[
                {value:'app', label:'App (signed in)'},
                {value:'profile', label:'Profile & settings'},
                {value:'signin', label:'Sign in'},
                {value:'signup', label:'Sign up'},
              ]}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

window.App = App;
window.SUBS_STORAGE_KEY = STORAGE_KEY;
window.loadSubs = loadSubs;
