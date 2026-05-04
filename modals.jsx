// modals.jsx — Add/Edit subscription, Confirm close

const { useState: useStateM, useEffect: useEffectM } = React;

function SubModal({ sub, onSave, onClose, onDelete }) {
  const isEdit = !!sub;
  const [name, setName] = useStateM(sub?.name || '');
  const [price, setPrice] = useStateM(sub?.price ?? '');
  const [period, setPeriod] = useStateM(sub?.period || 'month');
  const [start, setStart] = useStateM(sub?.start || ymd(new Date()));
  const [color, setColor] = useStateM(sub?.color || ACCENTS[Math.floor(Math.random() * ACCENTS.length)]);

  const canSave = name.trim() && price !== '' && Number(price) >= 0 && start;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      id: sub?.id,
      name: name.trim(),
      price: Number(price),
      period,
      start,
      color,
      closed: sub?.closed || null,
    });
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="modal" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div className="modal__title">{isEdit ? 'EDIT SUBSCRIPTION' : 'NEW SUBSCRIPTION'}</div>
          <button type="button" className="btn btn--xs" onClick={onClose}>ESC</button>
        </div>
        <div className="modal__body">
          <div className="field">
            <label className="field__label">Name</label>
            <input
              className="field__input"
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Netflix"
            />
          </div>

          <div className="field__row">
            <div className="field">
              <label className="field__label">Price (€)</label>
              <input
                className="field__input"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="field">
              <label className="field__label">Period</label>
              <div className="period-toggle">
                {['week','month','year'].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={period === p ? 'is-active' : ''}
                    onClick={() => setPeriod(p)}
                  >{p}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <label className="field__label">Start date</label>
            <input
              className="field__input"
              type="date"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label">Bar color</label>
            <div className="color-grid">
              {ACCENTS.map((c) => (
                <div
                  key={c}
                  className={`color-swatch ${color === c ? 'is-active' : ''}`}
                  style={{background: c}}
                  onClick={() => setColor(c)}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal__foot">
          {isEdit && (
            <button type="button" className="btn btn--sm" style={{marginRight:'auto'}} onClick={() => onDelete(sub.id)}>
              DELETE
            </button>
          )}
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>CANCEL</button>
          <button type="submit" className="btn btn--sm btn--primary" disabled={!canSave} style={!canSave?{opacity:0.4, cursor:'not-allowed'}:{}}>
            {isEdit ? 'SAVE' : 'ADD'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{maxWidth: 380}} onClick={e => e.stopPropagation()}>
        <div className="modal__head">
          <div className="modal__title">{title}</div>
        </div>
        <div className="modal__body">
          <div style={{fontSize: 13, lineHeight: 1.5}}>{body}</div>
        </div>
        <div className="modal__foot">
          <button className="btn btn--sm btn--ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn--sm btn--primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SubModal, ConfirmModal });
