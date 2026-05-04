// gantt.jsx — gantt chart with progress bars

const { useState, useMemo, useRef, useEffect } = React;

function Gantt({ subs, today, scale, onScaleChange, onClose, onResume, onDelete, onEdit }) {
  const [tooltip, setTooltip] = useState(null);

  const axis = useMemo(() => buildMonthAxis(scale, today), [scale, today]);

  const handleBarHover = (sub, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      sub,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };
  const handleBarLeave = () => setTooltip(null);

  return (
    <div className="gantt-wrap">
      <div className="gantt-toolbar">
        <div className="gantt-toolbar__left">
          <h2>Timeline</h2>
          <div className="legend">
            <span className="legend__swatch"><i></i> ACTIVE</span>
            <span className="legend__swatch"><i className="pale"></i> AHEAD</span>
            <span className="legend__swatch" style={{color:'oklch(0.62 0.22 28)'}}><i style={{background:'oklch(0.62 0.22 28)'}}></i> TODAY</span>
          </div>
        </div>
        <div className="scale-toggle" role="tablist">
          {[
            {label:'3M', val:3},
            {label:'6M', val:6},
            {label:'12M', val:12},
            {label:'24M', val:24},
          ].map(opt => (
            <button
              key={opt.val}
              className={scale === opt.val ? 'is-active' : ''}
              onClick={() => onScaleChange(opt.val)}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="gantt">
        {/* Header row — labels column header */}
        <div className="gantt__labels-head">SUBSCRIPTION</div>

        {/* Header row — month ticks */}
        <div className="gantt__chart-head">
          <div style={{display:'flex', height:'100%', width:'100%'}}>
            {axis.months.map((m, i) => {
              const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
              const showYear = i === 0 || m.getMonth() === 0;
              return (
                <div key={i} className={`month-tick ${isCurrent ? 'is-current' : ''}`}>
                  <span className="month-tick__name">{MONTH_NAMES[m.getMonth()]}</span>
                  {showYear && <span className="month-tick__year">{m.getFullYear()}</span>}
                </div>
              );
            })}
          </div>
          {/* Today line label only — line itself drawn per row */}
          <div className="today-line" style={{left: `${posWithin(today, axis) * 100}%`, top: 'auto', bottom: 0, height: '14px', borderLeft: 'none'}}>
            <span className="today-line__label">TODAY · {fmtDateShort(today)}</span>
          </div>
        </div>

        {/* Body */}
        {subs.length === 0 && (
          <>
            <div className="row-label" style={{borderBottom:'none'}}></div>
            <div className="row-chart" style={{borderBottom:'none'}}>
              <div className="empty">NO SUBSCRIPTIONS YET — CLICK [+ NEW] TO ADD ONE</div>
            </div>
          </>
        )}

        {subs.map(sub => (
          <GanttRow
            key={sub.id}
            sub={sub}
            axis={axis}
            today={today}
            onHover={handleBarHover}
            onLeave={handleBarLeave}
            onClose={onClose}
            onResume={onResume}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>

      {tooltip && <Tooltip {...tooltip} today={today} />}
    </div>
  );
}

function GanttRow({ sub, axis, today, onHover, onLeave, onClose, onResume, onDelete, onEdit }) {
  const start = parseISO(sub.start);
  const closedAt = sub.closed ? parseISO(sub.closed) : null;

  // Determine bar end
  // If closed: bar runs start → closedAt (or until next charge if user closed mid-cycle? — keep simple: bar ends at closedAt)
  // If active: bar runs start → next charge date (the "ahead" pale section ends at next charge)
  const next = nextChargeAfter(sub, today);

  // Solid section ends at min(today, closedAt or end of life)
  const solidEnd = closedAt && closedAt < today ? closedAt : today;
  const solidStart = start;

  // Pale section: from today → next charge (only if active and today >= start)
  const paleStart = today;
  const paleEnd = next;

  // Render only if bar overlaps axis
  const barRangeStart = start;
  const barRangeEnd = closedAt && closedAt < (next || today) ? closedAt : (next || today);

  const sx = posWithin(barRangeStart, axis);
  const ex = posWithin(barRangeEnd, axis);
  const visible = ex > 0 && sx < 1;

  // Solid portion within bar
  const solidLeftPct = posWithin(solidStart, axis) * 100;
  const solidRightPct = posWithin(solidEnd, axis) * 100;
  const showSolid = solidStart <= today && start <= today && solidRightPct > solidLeftPct;

  // Pale portion (only for active subs)
  const isActive = !sub.closed;
  const paleLeftPct = isActive && paleEnd ? posWithin(paleStart, axis) * 100 : 0;
  const paleRightPct = isActive && paleEnd ? posWithin(paleEnd, axis) * 100 : 0;
  const showPale = isActive && paleEnd && paleEnd > today && paleRightPct > paleLeftPct;

  // If start is in the future (active, no charge yet), only pale section
  const futureStart = start > today;
  const futureLeftPct = futureStart ? posWithin(start, axis) * 100 : 0;
  const futureRightPct = futureStart && next ? posWithin(next, axis) * 100 : 0;

  // Charge ticks within axis
  const ticks = useMemo(() => {
    const horizonEnd = closedAt && closedAt < axis.end ? closedAt : axis.end;
    const all = chargeDates(sub.start, sub.period, horizonEnd);
    return all
      .filter(d => d >= axis.start && d <= axis.end)
      .map(d => ({
        date: d,
        pct: posWithin(d, axis) * 100,
        future: d > today,
      }));
  }, [sub, axis, today, closedAt]);

  // Closed marker
  const closedPct = closedAt ? posWithin(closedAt, axis) * 100 : null;
  const closedVisible = closedAt && closedAt >= axis.start && closedAt <= axis.end;

  return (
    <>
      <div className={`row-label ${sub.closed ? 'is-closed' : ''}`}>
        <div className="row-label__swatch" style={{background: sub.color}}></div>
        <div className="row-label__main">
          <div className="row-label__name">{sub.name}</div>
          <div className="row-label__meta">
            <span>{fmtMoney(sub.price, sub.currency || 'EUR')}/{sub.period === 'month' ? 'mo' : sub.period === 'year' ? 'yr' : 'wk'}</span>
            <span>·</span>
            <span>{fmtDate(start)}</span>
          </div>
        </div>
        <div className="row-label__actions">
          {!sub.closed ? (
            <button className="btn btn--xs" onClick={() => onClose(sub.id)}>CLOSE</button>
          ) : (
            <button className="btn btn--xs" onClick={() => onResume(sub.id)}>RESUME</button>
          )}
          <button className="btn btn--xs" onClick={() => onDelete(sub.id)}>DEL</button>
        </div>
      </div>

      <div className="row-chart">
        {/* Column grid */}
        <div className="row-chart__cols">
          {axis.months.map((m, i) => {
            const isCurrent = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
            return <div key={i} className={isCurrent ? 'is-current' : ''}></div>;
          })}
        </div>

        {/* Bar */}
        {visible && (
          <div
            className="bar"
            style={{
              left: `${Math.max(0, sx) * 100}%`,
              width: `${(Math.min(1, ex) - Math.max(0, sx)) * 100}%`,
              '--bar-color': sub.color,
            }}
            onMouseEnter={(e) => onHover(sub, e)}
            onMouseLeave={onLeave}
            onClick={() => onEdit(sub.id)}
          >
            {/* Render solid + pale as siblings positioned absolutely within row, but bar handles total width */}
          </div>
        )}

        {/* Solid segment (start → today/closed) */}
        {showSolid && !futureStart && (
          <div
            className="bar"
            style={{
              left: `${Math.max(0, solidLeftPct)}%`,
              width: `${Math.min(100, solidRightPct) - Math.max(0, solidLeftPct)}%`,
              '--bar-color': sub.color,
              background: sub.color,
              borderRight: sub.closed ? '2px solid var(--ink)' : 'none',
            }}
            onMouseEnter={(e) => onHover(sub, e)}
            onMouseLeave={onLeave}
            onClick={() => onEdit(sub.id)}
          ></div>
        )}

        {/* Pale (progress) segment: today → next charge */}
        {showPale && (
          <div
            className="bar"
            style={{
              left: `${Math.max(0, paleLeftPct)}%`,
              width: `${Math.min(100, paleRightPct) - Math.max(0, paleLeftPct)}%`,
              '--bar-color': sub.color,
              background: 'transparent',
              borderLeft: 'none',
              pointerEvents: 'none',
            }}
          >
            <div style={{
              position:'absolute', inset:0,
              background: sub.color, opacity: 0.22,
            }}></div>
            <div style={{
              position:'absolute', inset:0,
              backgroundImage: `repeating-linear-gradient(-45deg, transparent 0 4px, ${sub.color} 4px 5px)`,
              opacity: 0.45,
            }}></div>
          </div>
        )}

        {/* Future-start segment (start in future, pale only) */}
        {futureStart && !sub.closed && next && (
          <div
            className="bar"
            style={{
              left: `${Math.max(0, futureLeftPct)}%`,
              width: `${Math.min(100, futureRightPct) - Math.max(0, futureLeftPct)}%`,
              '--bar-color': sub.color,
              background: 'transparent',
            }}
            onMouseEnter={(e) => onHover(sub, e)}
            onMouseLeave={onLeave}
          >
            <div style={{
              position:'absolute', inset:0,
              backgroundImage: `repeating-linear-gradient(-45deg, transparent 0 4px, ${sub.color} 4px 5px)`,
              opacity: 0.5,
            }}></div>
          </div>
        )}

        {/* Hide the placeholder full bar — we replaced it with solid + pale */}
        <style>{`.row-chart > .bar:first-of-type { display: none; }`}</style>

        {/* Charge ticks */}
        {ticks.map((t, i) => (
          <div
            key={i}
            className={`charge-tick ${t.future ? 'future' : ''}`}
            style={{
              left: `${t.pct}%`,
              top: 'calc(50% - 18px)',
              height: '36px',
              borderLeft: t.future ? `1px dashed ${sub.color}` : `2px solid var(--ink)`,
              opacity: t.future ? 0.6 : 1,
            }}
          >
            {!t.future && (
              <div style={{
                position:'absolute', top:'-4px', left:'-3px',
                width:'7px', height:'7px',
                background: 'var(--ink)',
                transform:'rotate(45deg)',
              }}></div>
            )}
          </div>
        ))}

        {/* Closed marker */}
        {closedVisible && (
          <div
            className="bar__closed-marker"
            style={{ left: `${closedPct}%` }}
          >
            <span style={{
              position:'absolute', left:'5px', top:'50%', transform:'translateY(-50%)',
              fontSize:'9px', letterSpacing:'0.16em', background:'var(--ink)', color:'var(--paper)',
              padding:'1px 5px', whiteSpace:'nowrap', fontWeight:700,
            }}>CLOSED</span>
          </div>
        )}

        {/* Today vertical line */}
        <div className="today-line" style={{left: `${posWithin(today, axis) * 100}%`}}></div>
      </div>
    </>
  );
}

function Tooltip({ sub, x, y, today }) {
  const start = parseISO(sub.start);
  const next = nextChargeAfter(sub, today);
  const monthly = toMonthly(sub.price, sub.period);
  const yearly = toYearly(sub.price, sub.period);
  const spent = totalSpent(sub, today);
  const charges = chargeDates(sub.start, sub.period, sub.closed ? parseISO(sub.closed) : today).length;
  const daysLeft = next ? diffDays(today, next) : null;

  // Position above bar; clamp to viewport
  const tooltipW = 240;
  const left = Math.max(12, Math.min(window.innerWidth - tooltipW - 12, x - tooltipW / 2));
  const top = Math.max(12, y - 160);

  return (
    <div className="tooltip" style={{left, top, width: tooltipW}}>
      <div className="tooltip__title">
        <span>{sub.name}</span>
        <span style={{
          width:10, height:10, background: sub.color, border:'1px solid var(--paper)', display:'inline-block', flexShrink:0
        }}></span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__k">Price</span>
        <span className="tooltip__v">{fmtMoney(sub.price, sub.currency || 'EUR')} / {sub.period}</span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__k">Started</span>
        <span className="tooltip__v">{fmtDate(start)}</span>
      </div>
      {sub.closed ? (
        <div className="tooltip__row">
          <span className="tooltip__k">Closed</span>
          <span className="tooltip__v">{fmtDate(parseISO(sub.closed))}</span>
        </div>
      ) : (
        <div className="tooltip__row">
          <span className="tooltip__k">Next charge</span>
          <span className="tooltip__v">{next ? `${fmtDate(next)} · in ${daysLeft}d` : '—'}</span>
        </div>
      )}
      <div className="tooltip__row">
        <span className="tooltip__k">Monthly equiv</span>
        <span className="tooltip__v">{fmtMoney(monthly, sub.currency || 'EUR')}</span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__k">Yearly equiv</span>
        <span className="tooltip__v">{fmtMoney(yearly, sub.currency || 'EUR')}</span>
      </div>
      <div className="tooltip__row">
        <span className="tooltip__k">Charges so far</span>
        <span className="tooltip__v">{charges} · {fmtMoney(spent, sub.currency || 'EUR')}</span>
      </div>
    </div>
  );
}

Object.assign(window, { Gantt });
