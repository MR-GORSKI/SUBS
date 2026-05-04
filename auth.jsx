// auth.jsx — Login & Profile screens for SUBS
// Google-only auth. Email/password fields removed.

const { useState } = React;

// ── Google glyph SVG (official 4-color G) ─────────────────
function GoogleGlyph({ size = 20 }) {
  return (
    <svg className="auth__google-icon" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.4 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

// ── Decorative gantt-bars poster ──────────────────────────
function PosterFigure() {
  const rows = [
    { label: 'YouTube', accent: 'oklch(0.62 0.22 28)', start: 0, end: 0.78 },
    { label: 'ChatGPT', accent: 'oklch(0.65 0.16 145)', start: 0.12, end: 0.88 },
    { label: 'Claude', accent: 'oklch(0.6 0.18 250)', start: 0.32, end: 0.62 },
    { label: 'Martini', accent: 'oklch(0.55 0.2 295)', start: 0.45, end: 0.7 },
    { label: 'Spotify', accent: 'oklch(0.7 0.18 145)', start: 0.05, end: 0.95 },
    { label: 'Notion', accent: 'oklch(0.78 0.16 85)', start: 0.6, end: 0.85 },
  ];
  return (
    <div className="auth__bars">
      {rows.map((r, i) => (
        <div className="auth__bar-row" key={i}>
          <span>{r.label}</span>
          <div className="auth__bar-track">
            <div className="auth__bar-fill" style={{ left: `${r.start*100}%`, right: `${100 - r.end*100}%`, '--accent': r.accent }} />
            <div className="auth__bar-fade" style={{ left: `${r.end*100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Desktop: Sign In ──────────────────────────────────────
function AuthSignIn({ onSignIn, onSignUp } = {}) {
  return (
    <div className="auth">
      <aside className="auth__poster">
        <div className="auth__brand">SUBS<span className="auth__brand-x">×</span></div>
        <div className="auth__poster-figure"><PosterFigure /></div>
        <div className="auth__poster-foot">
          <span>v1.0 · brutalist edition</span>
          <strong>track. cancel. save.</strong>
        </div>
      </aside>
      <section className="auth__panel">
        <div className="auth__crumbs">
          <span>SIGN IN</span>
          <span>NEW HERE? <button onClick={onSignUp}>Create account</button></span>
        </div>
        <form className="auth__form" onSubmit={(e) => { e.preventDefault(); onSignIn?.(); }}>
          <div>
            <h1 className="auth__heading">Welcome back.</h1>
            <p className="auth__sub" style={{ marginTop: 8 }}>Sign in to keep tabs on every recurring charge.</p>
          </div>
          <button type="button" className="auth__google" onClick={onSignIn}>
            <GoogleGlyph />
            Continue with Google
          </button>
          <p className="auth__legal">
            By continuing you agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>. We never share your data with third parties.
          </p>
        </form>
      </section>
    </div>
  );
}

// ── Desktop: Sign Up ──────────────────────────────────────
function AuthSignUp({ onSignUp, onSignIn } = {}) {
  return (
    <div className="auth">
      <aside className="auth__poster">
        <div className="auth__brand">SUBS<span className="auth__brand-x">×</span></div>
        <div className="auth__poster-figure"><PosterFigure /></div>
        <div className="auth__poster-foot">
          <span>FREE · no credit card</span>
          <strong>4 average subs cancelled / user</strong>
        </div>
      </aside>
      <section className="auth__panel">
        <div className="auth__crumbs">
          <span>SIGN UP</span>
          <span>HAVE AN ACCOUNT? <button onClick={onSignIn}>Sign in</button></span>
        </div>
        <form className="auth__form" onSubmit={(e) => { e.preventDefault(); onSignUp?.(); }}>
          <div>
            <h1 className="auth__heading">Take control.</h1>
            <p className="auth__sub" style={{ marginTop: 8 }}>One screen. Every subscription. Stop the slow drip.</p>
          </div>
          <button type="button" className="auth__google" onClick={onSignUp}>
            <GoogleGlyph />
            Sign up with Google
          </button>
          <p className="auth__legal">
            By signing up you agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </form>
      </section>
    </div>
  );
}

// ── Mobile: Sign In / Up shell ────────────────────────────
function MobileAuth({ mode = 'signin', onSignIn, onSignUp, onBack } = {}) {
  const isSignIn = mode === 'signin';
  const heading = isSignIn ? 'Welcome back.' : 'Take control.';
  const sub = isSignIn
    ? 'Sign in to keep tabs on every recurring charge.'
    : 'One screen. Every subscription.';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignIn) onSignIn?.();
    else onSignUp?.();
  };

  return (
    <div className="m-auth">
      <div className="m-auth__top">
        {!isSignIn && <div className="m-auth__back" onClick={onBack} role="button" style={{cursor:'pointer'}}>← BACK</div>}
        <div className="m-auth__brand">SUBS<span className="m-auth__brand-x">×</span></div>
        <h1 className="m-auth__heading">{heading}</h1>
        <p className="m-auth__sub">{sub}</p>
      </div>
      <form className="m-auth__form" onSubmit={handleSubmit}>
        <button type="button" className="auth__google" style={{ width: '100%' }}
          onClick={isSignIn ? onSignIn : onSignUp}>
          <GoogleGlyph />
          {isSignIn ? 'Continue with Google' : 'Sign up with Google'}
        </button>
        <p className="auth__legal" style={{ marginTop: 8 }}>
          By continuing you agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
        </p>
      </form>
      <div className="m-auth__foot">
        {isSignIn && <>New here? <button onClick={onSignUp} style={{background:'none',border:'none',color:'inherit',font:'inherit',cursor:'pointer',textDecoration:'underline',textUnderlineOffset:'3px',fontWeight:500}}>Create account</button></>}
        {!isSignIn && <>Have an account? <button onClick={onSignIn} style={{background:'none',border:'none',color:'inherit',font:'inherit',cursor:'pointer',textDecoration:'underline',textUnderlineOffset:'3px',fontWeight:500}}>Sign in</button></>}
      </div>
    </div>
  );
}

// ── Mobile profile sheet ──────────────────────────────────
function MobileProfile({ user, prefs, setPref, onClose, onSignOut, standalone = false } = {}) {
  const [notifications, setNotifications] = useState(true);
  const [warnDays, setWarnDays] = useState(3);

  const currency = prefs?.displayCurrency || 'EUR';
  const lang = prefs?.language || 'EN';
  const t = (k) => i18n.t(k, lang);

  const name = user?.name || 'Guest';
  const email = user?.email || '—';
  const initial = (user?.name || user?.email || 'G').slice(0,1).toUpperCase();

  const sheet = (
    <div className="m-profile">
      <div className="m-profile__sheet">
        <div className="m-profile__head">
          <div className="m-profile__title">PROFILE</div>
          <button className="m-profile__close" onClick={onClose}>×</button>
        </div>

        <div className="m-profile__user">
          <div className="m-profile__avatar">{initial}</div>
          <div>
            <div className="m-profile__name">{name}</div>
            <div className="m-profile__email">{email}</div>
          </div>
        </div>

        <div className="m-profile__group">
          <div className="m-profile__group-label">{t('PREFERENCES')}</div>
          <div className="m-profile__row">
            <div className="m-profile__row-label">{t('Default currency')}</div>
            <div className="m-seg">
              {CURRENCIES.map(c => (
                <div key={c} className={`m-seg__opt ${currency===c?'m-seg__opt--on':''}`} onClick={() => setPref?.('displayCurrency', c)}>{c}</div>
              ))}
            </div>
          </div>
          <div className="m-profile__row">
            <div className="m-profile__row-label">{t('Language')}</div>
            <div className="m-seg">
              {i18n.LANGUAGES.map(c => (
                <div key={c} className={`m-seg__opt ${lang===c?'m-seg__opt--on':''}`} onClick={() => setPref?.('language', c)}>{c}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="m-profile__group">
          <div className="m-profile__group-label">{t('NOTIFICATIONS')}</div>
          <div className="m-profile__row">
            <div>
              <div className="m-profile__row-label">{t('Charge reminders')}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{t('Push when a sub is about to renew')}</div>
            </div>
            <div className={`m-toggle ${notifications?'m-toggle--on':''}`} onClick={() => setNotifications(!notifications)}>
              <div className="m-toggle__dot" />
            </div>
          </div>
          <div className="m-profile__row">
            <div>
              <div className="m-profile__row-label">{t('Warn me')}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{t('Days before charge')}</div>
            </div>
            <div className="m-step">
              <div className="m-step__btn" onClick={() => setWarnDays(Math.max(1, warnDays-1))}>−</div>
              <div className="m-step__val">{warnDays}D</div>
              <div className="m-step__btn" onClick={() => setWarnDays(Math.min(14, warnDays+1))}>+</div>
            </div>
          </div>
        </div>

        <div className="m-profile__group">
          <div className="m-profile__group-label">{t('ACCOUNT')}</div>
          <button className="m-profile__row" onClick={onSignOut}>
            <div className="m-profile__row-label">{t('Sign out')}</div>
            <div className="m-profile__row-value">→</div>
          </button>
          <button className="m-profile__row m-profile__row--danger">
            <div className="m-profile__row-label">{t('Delete account')}</div>
            <div className="m-profile__row-value">→</div>
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', textAlign: 'center', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          v1.0 · subs © 2026
        </div>
      </div>
    </div>
  );

  if (!standalone) return sheet;

  return (
    <div className="m-app" style={{ position: 'relative' }}>
      <div className="m-head">
        <div className="m-brand">SUBS<span style={{ color: 'var(--hot)' }}>×</span></div>
        <button className="m-iconbtn" aria-label="Profile">{initial}</button>
      </div>
      <div style={{ padding: '12px 16px', flex: 1, opacity: 0.5, pointerEvents: 'none' }}>
        <div style={{ height: 60, border: '2px solid var(--ink)', background: 'var(--paper)', marginBottom: 10 }} />
        <div style={{ height: 60, border: '2px solid var(--ink)', background: 'var(--paper)', marginBottom: 10 }} />
        <div style={{ height: 60, border: '2px solid var(--ink)', background: 'var(--paper)' }} />
      </div>
      {sheet}
    </div>
  );
}

// ── Desktop profile panel ─────────────────────────────────
function DesktopProfile({ user, stats, prefs, setPref, onClose, onSignOut } = {}) {
  const [notifications, setNotifications] = useState(true);
  const [warnDays, setWarnDays] = useState(3);

  const currency = prefs?.displayCurrency || 'EUR';
  const lang = prefs?.language || 'EN';
  const t = (k) => i18n.t(k, lang);

  const name = user?.name || 'Guest';
  const email = user?.email || '—';
  const initial = (user?.name || user?.email || 'G').slice(0,1).toUpperCase();
  const memberSince = user?.memberSince || '—';
  const active = stats?.active ?? 0;
  const closed = stats?.closed ?? 0;

  return (
    <div className="profile-panel">
      <div className="profile-panel__head">
        <h1 className="profile-panel__title">{t('Profile & Settings')}</h1>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div className="profile-panel__crumb">SUBS / SETTINGS</div>
          {onClose && <button className="profile-panel__close" onClick={onClose} title="Back to app">×</button>}
        </div>
      </div>

      <div className="profile-panel__grid">
        <div className="profile-panel__user">
          <div className="profile-panel__avatar">{initial}</div>
          <div>
            <div className="profile-panel__user-name">{name}</div>
            <div className="profile-panel__user-email">{email}</div>
          </div>
          <div className="profile-panel__user-meta">
            {t('MEMBER SINCE')} · {memberSince}<br/>
            {active} {t('ACTIVE')} · {closed} {t('CLOSED')}
          </div>
          <button className="profile-panel__signout-btn" onClick={onSignOut}>{t('SIGN OUT →')}</button>
        </div>

        <div className="profile-panel__sections">
          <div className="profile-panel__section">
            <div className="profile-panel__section-head">{t('PREFERENCES')}</div>
            <div className="profile-panel__row">
              <div>
                <div className="profile-panel__row-label">{t('Default currency')}</div>
                <div className="profile-panel__row-help">{t('Used for new subscriptions and totals')}</div>
              </div>
              <div className="m-seg">
                {CURRENCIES.map(c => (
                  <div key={c} className={`m-seg__opt ${currency===c?'m-seg__opt--on':''}`} onClick={() => setPref?.('displayCurrency', c)}>{c}</div>
                ))}
              </div>
            </div>
            <div className="profile-panel__row">
              <div>
                <div className="profile-panel__row-label">{t('Language')}</div>
                <div className="profile-panel__row-help">{t('Interface language')}</div>
              </div>
              <div className="m-seg">
                {i18n.LANGUAGES.map(c => (
                  <div key={c} className={`m-seg__opt ${lang===c?'m-seg__opt--on':''}`} onClick={() => setPref?.('language', c)}>{c}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="profile-panel__section">
            <div className="profile-panel__section-head">{t('NOTIFICATIONS')}</div>
            <div className="profile-panel__row">
              <div>
                <div className="profile-panel__row-label">{t('Charge reminders')}</div>
                <div className="profile-panel__row-help">{t('Get notified before a subscription renews')}</div>
              </div>
              <div className={`m-toggle ${notifications?'m-toggle--on':''}`} onClick={() => setNotifications(!notifications)}>
                <div className="m-toggle__dot" />
              </div>
            </div>
            <div className="profile-panel__row">
              <div>
                <div className="profile-panel__row-label">{t('Warn me before charge')}</div>
                <div className="profile-panel__row-help">{t('Days in advance for renewal alerts')}</div>
              </div>
              <div className="m-step">
                <div className="m-step__btn" onClick={() => setWarnDays(Math.max(1, warnDays-1))}>−</div>
                <div className="m-step__val">{warnDays}D</div>
                <div className="m-step__btn" onClick={() => setWarnDays(Math.min(14, warnDays+1))}>+</div>
              </div>
            </div>
          </div>

          <div className="profile-panel__section">
            <div className="profile-panel__section-head">{t('DANGER ZONE')}</div>
            <div className="profile-panel__row profile-panel__row--danger">
              <div>
                <div className="profile-panel__row-label">{t('Delete account')}</div>
                <div className="profile-panel__row-help">{t('Permanently remove your account and all subscription data. This cannot be undone.')}</div>
              </div>
              <button className="profile-panel__danger-btn">{t('DELETE →')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AuthSignIn, AuthSignUp,
  MobileAuth, MobileProfile, DesktopProfile,
});
