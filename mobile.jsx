// mobile.jsx — mobile version of SUBS
// Vertical timeline of subscription cards, bottom sheet for add/edit.

const { useState: useSM, useMemo: useMM, useEffect: useEM, useRef: useRM } = React;

function MobileApp({ subs, addSub, updateSub, deleteSub, today, user, onSignOut, prefs, setPref, fxRates }) {
  const [scale, setScale] = useSM(6); // months
  const [modal, setModal] = useSM(null); // {kind:'add'|'edit'|'close'|'details', id?}
  const [tab, setTab] = useSM('timeline'); // 'timeline' | 'list'
  const [view, setView] = useSM('app'); // 'app' | 'profile'

  const lang = prefs?.language || 'EN';
  const tr = (k) => i18n.t(k, lang);
  const displayCcy = prefs?.displayCurrency || 'EUR';
  const conv = (amount, from) => fx.convert(amount, from, fxRates);

  const activeSubs = subs.filter(s => !s.closed);
  const monthlyTotal = activeSubs.reduce((sum, s) =>
    sum + conv(toMonthly(s.price, s.period), s.currency || 'EUR'), 0);
  const yearlyTotal  = activeSubs.reduce((sum, s) =>
    sum + conv(toYearly(s.price, s.period), s.currency || 'EUR'), 0);
  const upcoming = activeSubs
    .map(s => ({ sub: s, date: nextChargeAfter(s, today) }))
    .filter(x => x.date)
    .sort((a, b) => a.date - b.date)[0];
  const lifetime = subs.reduce((sum, s) =>
    sum + conv(totalSpent(s, today), s.currency || 'EUR'), 0);

  const sortedSubs = useMM(() => {
    return [...subs].sort((a, b) => {
      if (!!a.closed !== !!b.closed) return a.closed ? 1 : -1;
      return parseISO(b.start) - parseISO(a.start);
    });
  }, [subs]);

  const onSave = (data) => {
    if (data.id) {
      const { id, ...patch } = data;
      updateSub(id, patch);
    } else {
      addSub(data);
    }
    setModal(null);
  };
  const confirmClose = () => {
    updateSub(modal.id, { closed: ymd(today) });
    setModal(null);
  };
  const onResume = (id) => updateSub(id, { closed: null });
  const onDelete = (id) => {
    deleteSub(id);
    if (modal?.id === id) setModal(null);
  };

  const editingSub = modal?.id ? subs.find(s => s.id === modal.id) : null;
  const avatarChar = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <div className="m-app">
      {/* Header */}
      <div className="m-head">
        <div className="m-brand">SUBS<span style={{color:'oklch(0.62 0.22 28)'}}>×</span></div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button className="m-iconbtn" onClick={() => setModal({kind:'add'})}>+</button>
          <button
            className="m-iconbtn"
            style={user?.avatarUrl ? {
              backgroundImage: `url(${user.avatarUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'transparent',
              fontSize: 14,
            } : {background:'oklch(0.62 0.22 28)', color:'var(--paper)', fontSize:14}}
            onClick={() => setView('profile')}
            aria-label="Profile"
            title={user?.email || 'Profile'}
          >{avatarChar}</button>
        </div>
      </div>

      {/* KPI carousel */}
      <div className="m-kpis">
        <div className="m-kpi">
          <div className="m-kpi__label">{tr('PER MONTH')}</div>
          <div className="m-kpi__num">{fmtMoney(monthlyTotal, displayCcy)}</div>
          <div className="m-kpi__sub">{activeSubs.length} {tr('active')}</div>
        </div>
        <div className="m-kpi">
          <div className="m-kpi__label">{tr('PER YEAR')}</div>
          <div className="m-kpi__num">{fmtMoney(yearlyTotal, displayCcy)}</div>
          <div className="m-kpi__sub">{tr('projected')}</div>
        </div>
        <div className="m-kpi">
          <div className="m-kpi__label">{tr('NEXT')}</div>
          {upcoming ? (
            <>
              <div className="m-kpi__num m-kpi__num--sm">{fmtMoney(upcoming.sub.price, upcoming.sub.currency || 'EUR')}</div>
              <div className="m-kpi__sub">{upcoming.sub.name.split(' ')[0]} · in {diffDays(today, upcoming.date)}d</div>
            </>
          ) : (
            <>
              <div className="m-kpi__num m-kpi__num--sm">—</div>
              <div className="m-kpi__sub">—</div>
            </>
          )}
        </div>
        <div className="m-kpi">
          <div className="m-kpi__label">{tr('LIFETIME')}</div>
          <div className="m-kpi__num">{fmtMoney(lifetime, displayCcy)}</div>
          <div className="m-kpi__sub">{tr('all time')}</div>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="m-tabs">
        <button className={tab === 'timeline' ? 'is-active' : ''} onClick={() => setTab('timeline')}>{tr('TIMELINE')}</button>
        <button className={tab === 'list' ? 'is-active' : ''} onClick={() => setTab('list')}>{tr('LIST')}</button>
      </div>

      {/* Body */}
      {tab === 'timeline' && (
        <MobileTimeline
          subs={sortedSubs}
          today={today}
          scale={scale}
          onScaleChange={setScale}
          onTap={(id) => setModal({kind:'details', id})}
        />
      )}
      {tab === 'list' && (
        <div className="m-list">
          {sortedSubs.map(sub => (
            <MobileCard
              key={sub.id}
              sub={sub}
              today={today}
              onEdit={() => setModal({kind:'details', id: sub.id})}
              onClose={() => setModal({kind:'close', id: sub.id})}
              onResume={() => onResume(sub.id)}
            />
          ))}
        </div>
      )}

      {/* Bottom sheets */}
      {modal?.kind === 'add' && (
        <MobileSheet title={tr('NEW SUBSCRIPTION')} onClose={() => setModal(null)}>
          <MobileSubForm onSave={onSave} onCancel={() => setModal(null)} defaultCurrency={displayCcy} tr={tr} />
        </MobileSheet>
      )}
      {modal?.kind === 'details' && editingSub && (
        <MobileSheet title={tr('DETAILS')} onClose={() => setModal(null)}>
          <MobileDetails
            sub={editingSub}
            today={today}
            tr={tr}
            onEdit={() => setModal({kind:'edit', id: editingSub.id})}
            onClose={() => setModal({kind:'close', id: editingSub.id})}
            onResume={() => { onResume(editingSub.id); setModal(null); }}
          />
        </MobileSheet>
      )}
      {modal?.kind === 'edit' && editingSub && (
        <MobileSheet title={tr('EDIT')} onClose={() => setModal({kind:'details', id: editingSub.id})}>
          <MobileSubForm
            sub={editingSub}
            defaultCurrency={displayCcy}
            tr={tr}
            onSave={(data) => { onSave(data); }}
            onCancel={() => setModal({kind:'details', id: editingSub.id})}
            onDelete={() => onDelete(editingSub.id)}
          />
        </MobileSheet>
      )}
      {modal?.kind === 'close' && (() => {
        const sub = subs.find(s => s.id === modal.id);
        if (!sub) return null;
        return (
          <MobileSheet title={tr('CLOSE?')} onClose={() => setModal(null)}>
            <div style={{padding: '8px 0 16px', fontSize: 13, lineHeight: 1.5}}>
              Stop tracking <strong>{sub.name}</strong>? Timeline keeps the bar up to today with a CLOSED marker.
            </div>
            <div style={{display:'flex', gap: 10}}>
              <button className="m-btn m-btn--ghost" style={{flex:1}} onClick={() => setModal(null)}>{tr('CANCEL')}</button>
              <button className="m-btn m-btn--primary" style={{flex:1}} onClick={confirmClose}>{tr('CLOSE IT')}</button>
            </div>
          </MobileSheet>
        );
      })()}

      {/* Profile sheet */}
      {view === 'profile' && (
        <MobileProfile
          user={user}
          prefs={prefs}
          setPref={setPref}
          onClose={() => setView('app')}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}

// ── Vertical timeline ──────────────────────────────
function MobileTimeline({ subs, today, scale, onScaleChange, onTap }) {
  const axis = useMM(() => buildMonthAxis(scale, today), [scale, today]);

  return (
    <div className="m-timeline">
      <div className="m-scale-toggle">
        {[3, 6, 12].map(v => (
          <button key={v} className={scale === v ? 'is-active' : ''} onClick={() => onScaleChange(v)}>{v}M</button>
        ))}
      </div>

      <div className="m-timeline__head">
        <div className="m-timeline__sublabel">SUB</div>
        <div className="m-timeline__chartlabel">
          {axis.months.map((m, i) => {
            const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
            return (
              <div key={i} className={`m-month-tick ${isCurrent ? 'is-current' : ''}`}>
                {MONTH_NAMES[m.getMonth()]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="m-timeline__body">
        {subs.map(sub => (
          <MobileTimelineRow key={sub.id} sub={sub} axis={axis} today={today} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}

function MobileTimelineRow({ sub, axis, today, onTap }) {
  const start = parseISO(sub.start);
  const closedAt = sub.closed ? parseISO(sub.closed) : null;
  const next = nextChargeAfter(sub, today);

  const solidStart = start;
  const solidEnd = closedAt && closedAt < today ? closedAt : today;
  const showSolid = solidStart <= today;

  const isActive = !sub.closed;
  const showPale = isActive && next && next > today;

  const solidLeftPct = posWithin(solidStart, axis) * 100;
  const solidRightPct = posWithin(solidEnd, axis) * 100;
  const paleLeftPct = posWithin(today, axis) * 100;
  const paleRightPct = next ? posWithin(next, axis) * 100 : 0;

  const futureStart = start > today;
  const futureLeftPct = futureStart ? posWithin(start, axis) * 100 : 0;
  const futureRightPct = futureStart && next ? posWithin(next, axis) * 100 : 0;

  const closedPct = closedAt ? posWithin(closedAt, axis) * 100 : null;
  const closedVisible = closedAt && closedAt >= axis.start && closedAt <= axis.end;

  return (
    <div className={`m-timeline__row ${sub.closed ? 'is-closed' : ''}`} onClick={() => onTap(sub.id)}>
      <div className="m-timeline__sub">
        <div className="m-timeline__swatch" style={{background: sub.color}}></div>
        <div className="m-timeline__name">{sub.name}</div>
        <div className="m-timeline__price">{fmtMoney(sub.price, sub.currency || 'EUR')}</div>
      </div>
      <div className="m-timeline__chart">
        <div className="m-timeline__cols">
          {axis.months.map((m, i) => {
            const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
            return <div key={i} className={isCurrent ? 'is-current' : ''}></div>;
          })}
        </div>

        {showSolid && !futureStart && (
          <div className="m-bar" style={{
            left: `${Math.max(0, solidLeftPct)}%`,
            width: `${Math.min(100, solidRightPct) - Math.max(0, solidLeftPct)}%`,
            background: sub.color,
            borderRight: sub.closed ? '2px solid var(--ink)' : 'none',
          }}></div>
        )}
        {showPale && (
          <div className="m-bar m-bar--pale" style={{
            left: `${Math.max(0, paleLeftPct)}%`,
            width: `${Math.min(100, paleRightPct) - Math.max(0, paleLeftPct)}%`,
          }}>
            <div style={{position:'absolute', inset:0, background: sub.color, opacity: 0.22}}></div>
            <div style={{position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(-45deg, transparent 0 3px, ${sub.color} 3px 4px)`, opacity:0.5}}></div>
          </div>
        )}
        {futureStart && !sub.closed && next && (
          <div className="m-bar m-bar--pale" style={{
            left: `${futureLeftPct}%`,
            width: `${futureRightPct - futureLeftPct}%`,
          }}>
            <div style={{position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(-45deg, transparent 0 3px, ${sub.color} 3px 4px)`, opacity:0.5}}></div>
          </div>
        )}
        {closedVisible && (
          <div style={{
            position:'absolute', top:-2, bottom:-2, left: `${closedPct}%`,
            borderLeft: '2px solid var(--ink)', zIndex: 3,
          }}></div>
        )}
        <div className="m-today-line" style={{left: `${posWithin(today, axis) * 100}%`}}></div>
      </div>
    </div>
  );
}

// ── List card ──────────────────────────────────────
function MobileCard({ sub, today, onEdit, onClose, onResume }) {
  const next = nextChargeAfter(sub, today);
  const start = parseISO(sub.start);
  const closedAt = sub.closed ? parseISO(sub.closed) : null;
  const spent = totalSpent(sub, today);

  // Cycle progress (today - last charge) / (next - last charge)
  let progress = 0;
  let daysLeft = null;
  let lastCharge = null;
  if (next && !sub.closed) {
    // Walk back one period from next
    if (sub.period === 'year') lastCharge = addMonths(next, -12);
    else if (sub.period === 'week') lastCharge = addDays(next, -7);
    else lastCharge = addMonths(next, -1);
    const total = next - lastCharge;
    const elapsed = today - lastCharge;
    progress = Math.max(0, Math.min(1, elapsed / total));
    daysLeft = diffDays(today, next);
  }

  return (
    <div className={`m-card ${sub.closed ? 'is-closed' : ''}`}>
      <div className="m-card__head">
        <div className="m-card__swatch" style={{background: sub.color}}></div>
        <div className="m-card__main">
          <div className="m-card__name">{sub.name}</div>
          <div className="m-card__meta">
            {fmtMoney(sub.price, sub.currency || 'EUR')}/{sub.period === 'month' ? 'mo' : sub.period === 'year' ? 'yr' : 'wk'}
            {' · since '}{fmtDate(start)}
          </div>
        </div>
        <button className="m-iconbtn m-iconbtn--sm" onClick={onEdit}>›</button>
      </div>

      {!sub.closed && next && (
        <>
          <div className="m-card__progress">
            <div className="m-card__progress-fill" style={{width: `${progress * 100}%`, background: sub.color}}></div>
            <div className="m-card__progress-pale" style={{
              left: `${progress * 100}%`,
              width: `${(1 - progress) * 100}%`,
              backgroundImage:`repeating-linear-gradient(-45deg, transparent 0 3px, ${sub.color} 3px 4px)`,
            }}></div>
          </div>
          <div className="m-card__progress-meta">
            <span>NEXT · {fmtDateShort(next)}</span>
            <span>{daysLeft}d LEFT</span>
          </div>
        </>
      )}

      {sub.closed && (
        <div className="m-card__closed">
          CLOSED · {fmtDate(closedAt)} · {fmtMoney(spent, sub.currency || 'EUR')} spent
        </div>
      )}

      <div className="m-card__actions">
        {!sub.closed ? (
          <button className="m-btn m-btn--sm m-btn--ghost" onClick={onClose}>CLOSE</button>
        ) : (
          <button className="m-btn m-btn--sm m-btn--ghost" onClick={onResume}>RESUME</button>
        )}
        <span className="m-card__lifetime">{fmtMoney(spent, sub.currency || 'EUR')} lifetime</span>
      </div>
    </div>
  );
}

// ── Bottom sheet ───────────────────────────────────
function MobileSheet({ title, children, onClose }) {
  return (
    <div className="m-sheet-bg" onClick={onClose}>
      <div className="m-sheet" onClick={e => e.stopPropagation()}>
        <div className="m-sheet__head">
          <div className="m-sheet__title">{title}</div>
          <button className="m-iconbtn m-iconbtn--sm" onClick={onClose}>×</button>
        </div>
        <div className="m-sheet__body">{children}</div>
      </div>
    </div>
  );
}

// ── Form (mobile-tuned) ────────────────────────────
function MobileSubForm({ sub, onSave, onCancel, onDelete, defaultCurrency = 'EUR', tr = (k) => k }) {
  const isEdit = !!sub;
  const [name, setName] = useSM(sub?.name || '');
  const [price, setPrice] = useSM(sub?.price ?? '');
  const [currency, setCurrency] = useSM(sub?.currency || defaultCurrency);
  const [period, setPeriod] = useSM(sub?.period || 'month');
  const [start, setStart] = useSM(sub?.start || ymd(new Date()));
  const [color, setColor] = useSM(sub?.color || ACCENTS[Math.floor(Math.random() * ACCENTS.length)]);

  const canSave = name.trim() && price !== '' && Number(price) >= 0 && start;

  const submit = () => {
    if (!canSave) return;
    onSave({ id: sub?.id, name: name.trim(), price: Number(price), currency, period, start, color, closed: sub?.closed || null });
  };

  return (
    <div style={{display:'flex', flexDirection:'column', gap: 14}}>
      <div className="m-field">
        <label>{tr('Name').toUpperCase()}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix" autoFocus={!isEdit}/>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 90px', gap: 10}}>
        <div className="m-field">
          <label>{tr('Price').toUpperCase()} {currencySymbol(currency)}</label>
          <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"/>
        </div>
        <div className="m-field">
          <label>{tr('Currency').toUpperCase()}</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="m-field">
        <label>{tr('Period').toUpperCase()}</label>
        <div className="m-period">
          {['week','month','year'].map(p => (
            <button key={p} className={period === p ? 'is-active' : ''} onClick={() => setPeriod(p)}>{p[0].toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="m-field">
        <label>{tr('Start date').toUpperCase()}</label>
        <input type="date" value={start} onChange={e => setStart(e.target.value)}/>
      </div>
      <div className="m-field">
        <label>{tr('Bar color').toUpperCase()}</label>
        <div className="m-colorgrid">
          {ACCENTS.map(c => (
            <div key={c} className={`m-colorswatch ${color === c ? 'is-active' : ''}`} style={{background: c}} onClick={() => setColor(c)}></div>
          ))}
        </div>
      </div>

      <div style={{display:'flex', gap: 10, marginTop: 6}}>
        {isEdit && onDelete && (
          <button className="m-btn m-btn--sm m-btn--ghost" onClick={onDelete} style={{marginRight:'auto'}}>{tr('DELETE').slice(0,3)}</button>
        )}
        <button className="m-btn m-btn--ghost" onClick={onCancel} style={{flex: isEdit ? 0 : 1}}>{tr('CANCEL')}</button>
        <button className="m-btn m-btn--primary" onClick={submit} disabled={!canSave} style={{flex: 1, opacity: canSave ? 1 : 0.4}}>
          {isEdit ? tr('SAVE') : tr('ADD')}
        </button>
      </div>
    </div>
  );
}

// ── Details sheet (tap-to-view + edit) ─────────────
function MobileDetails({ sub, today, onEdit, onClose, onResume }) {
  const start = parseISO(sub.start);
  const closedAt = sub.closed ? parseISO(sub.closed) : null;
  const next = nextChargeAfter(sub, today);
  const monthly = toMonthly(sub.price, sub.period);
  const yearly = toYearly(sub.price, sub.period);
  const spent = totalSpent(sub, today);
  const charges = chargeDates(sub.start, sub.period, sub.closed ? parseISO(sub.closed) : today).length;
  const daysLeft = next ? diffDays(today, next) : null;

  // Cycle progress
  let progress = 0, lastCharge = null;
  if (next && !sub.closed) {
    if (sub.period === 'year') lastCharge = addMonths(next, -12);
    else if (sub.period === 'week') lastCharge = addDays(next, -7);
    else lastCharge = addMonths(next, -1);
    progress = Math.max(0, Math.min(1, (today - lastCharge) / (next - lastCharge)));
  }

  return (
    <div className="m-details">
      <div className="m-details__head">
        <div className="m-details__swatch" style={{background: sub.color}}></div>
        <div style={{flex:1, minWidth:0}}>
          <div className="m-details__name">{sub.name}</div>
          <div className="m-details__price">
            {fmtMoney(sub.price, sub.currency || 'EUR')}<span className="m-details__per">/{sub.period === 'month' ? 'mo' : sub.period === 'year' ? 'yr' : 'wk'}</span>
          </div>
        </div>
        {sub.closed && <span className="m-details__pill">CLOSED</span>}
      </div>

      {!sub.closed && next && (
        <div className="m-details__progress-wrap">
          <div className="m-details__progress">
            <div style={{width: `${progress * 100}%`, background: sub.color, height:'100%', position:'relative', zIndex:2}}></div>
            <div style={{
              position:'absolute', top:0, bottom:0,
              left:`${progress * 100}%`, width:`${(1-progress)*100}%`,
              backgroundImage:`repeating-linear-gradient(-45deg, transparent 0 4px, ${sub.color} 4px 5px)`,
              opacity:0.6,
            }}></div>
          </div>
          <div className="m-details__progress-meta">
            <span>{fmtDateShort(lastCharge)}</span>
            <span>{daysLeft}d LEFT</span>
            <span>{fmtDateShort(next)}</span>
          </div>
        </div>
      )}

      <div className="m-details__rows">
        <div className="m-details__row">
          <span className="m-details__k">Started</span>
          <span className="m-details__v">{fmtDate(start)}</span>
        </div>
        {sub.closed ? (
          <div className="m-details__row">
            <span className="m-details__k">Closed</span>
            <span className="m-details__v">{fmtDate(closedAt)}</span>
          </div>
        ) : (
          <div className="m-details__row">
            <span className="m-details__k">Next charge</span>
            <span className="m-details__v">{next ? fmtDate(next) : '—'}</span>
          </div>
        )}
        <div className="m-details__row">
          <span className="m-details__k">Monthly equiv</span>
          <span className="m-details__v">{fmtMoney(monthly, sub.currency || 'EUR')}</span>
        </div>
        <div className="m-details__row">
          <span className="m-details__k">Yearly equiv</span>
          <span className="m-details__v">{fmtMoney(yearly, sub.currency || 'EUR')}</span>
        </div>
        <div className="m-details__row">
          <span className="m-details__k">Charges so far</span>
          <span className="m-details__v">{charges}</span>
        </div>
        <div className="m-details__row m-details__row--strong">
          <span className="m-details__k">Spent total</span>
          <span className="m-details__v">{fmtMoney(spent, sub.currency || 'EUR')}</span>
        </div>
      </div>

      <div className="m-details__actions">
        {!sub.closed ? (
          <button className="m-btn m-btn--ghost" style={{flex:1}} onClick={onClose}>CLOSE</button>
        ) : (
          <button className="m-btn m-btn--ghost" style={{flex:1}} onClick={onResume}>RESUME</button>
        )}
        <button className="m-btn m-btn--primary" style={{flex:1}} onClick={onEdit}>EDIT</button>
      </div>
    </div>
  );
}

Object.assign(window, { MobileApp });