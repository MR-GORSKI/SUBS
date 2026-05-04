// gcal.js — Google Calendar API client.
// Uses the Google access token from the Supabase session (provider_token),
// and refreshes it via Supabase when a Calendar request returns 401.
// All calls are best-effort — caller should swallow errors so the local
// data path keeps working even if Calendar sync hiccups.

(function () {
  const CALENDAR_NAME = 'SUBS — Subscriptions';
  const CALENDAR_DESC = 'Subscription billing reminders. Managed by SUBS — https://mr-gorski.github.io/SUBS/';
  const API = 'https://www.googleapis.com/calendar/v3';

  async function gcalFetch(path, init = {}, retryOnUnauth = true) {
    const token = await getGoogleAccessToken();
    const res = await fetch(API + path, {
      ...init,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (res.status === 401 && retryOnUnauth) {
      // Token might be stale — force a session refresh via Supabase, then retry once.
      try { await getGoogleAccessToken({ forceRefresh: true }); }
      catch (e) { throw new Error('CALENDAR_AUTH_REQUIRED'); }
      return gcalFetch(path, init, false);
    }
    if (res.status === 403 && retryOnUnauth) {
      // Likely missing scope — user signed in before we requested calendar.events.
      let body = null;
      try { body = await res.json(); } catch {}
      const msg = body?.error?.message || '';
      if (/insufficient|scope|permission/i.test(msg)) {
        throw new Error('CALENDAR_SCOPE_MISSING');
      }
      throw new Error('Calendar API 403: ' + msg);
    }
    if (!res.ok) {
      let errMsg = 'Calendar API ' + res.status;
      try { const e = await res.json(); errMsg += ': ' + (e?.error?.message || JSON.stringify(e)); } catch {}
      const err = new Error(errMsg);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ── Calendar discovery / creation ─────────────────────
  async function listCalendars() {
    const data = await gcalFetch('/users/me/calendarList?minAccessRole=owner&maxResults=250');
    return data.items || [];
  }

  async function findSubsCalendarId() {
    const cals = await listCalendars();
    const found = cals.find(c => c.summary === CALENDAR_NAME);
    return found?.id || null;
  }

  async function createSubsCalendar() {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
    const data = await gcalFetch('/calendars', {
      method: 'POST',
      body: JSON.stringify({
        summary: CALENDAR_NAME,
        description: CALENDAR_DESC,
        timeZone: tz,
      }),
    });
    return data.id;
  }

  async function ensureSubsCalendar() {
    const found = await findSubsCalendarId();
    if (found) return found;
    return await createSubsCalendar();
  }

  // ── Event mapping ─────────────────────────────────────
  function pad2(n) { return String(n).padStart(2, '0'); }

  function buildRRule(period, startISO, closedISO) {
    const [, , d] = startISO.split('-').map(Number);
    let rrule;
    if (period === 'year' || period === 'yearly') {
      rrule = 'RRULE:FREQ=YEARLY';
    } else if (period === 'week' || period === 'weekly') {
      rrule = 'RRULE:FREQ=WEEKLY';
    } else {
      rrule = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${d}`;
    }
    if (closedISO) {
      const [cy, cm, cd] = closedISO.split('-').map(Number);
      // UNTIL must be UTC; use end-of-day so the closed date itself isn't excluded.
      rrule += `;UNTIL=${cy}${pad2(cm)}${pad2(cd)}T235959Z`;
    }
    return rrule;
  }

  function eventBody(sub, warnDays = 3) {
    const sym = (window.CURRENCY_SYMBOLS || {})[sub.currency] || sub.currency || '€';
    const summary = `💳 ${sub.name} · ${sym}${sub.price}`;
    const startDate = sub.start;
    // All-day events: end.date = start + 1 day
    const startD = new Date(sub.start + 'T00:00:00Z');
    const endD = new Date(startD.getTime() + 24 * 60 * 60 * 1000);
    const endDate = endD.toISOString().slice(0, 10);
    const rrule = buildRRule(sub.period, sub.start, sub.closed);

    return {
      summary,
      description: 'Tracked by SUBS · https://mr-gorski.github.io/SUBS/',
      start: { date: startDate },
      end: { date: endDate },
      recurrence: [rrule],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: Math.max(0, warnDays) * 24 * 60 },
        ],
      },
      transparency: 'transparent', // doesn't block "busy" time on the calendar
    };
  }

  // ── Event CRUD ────────────────────────────────────────
  async function createEvent(calendarId, sub, warnDays) {
    const data = await gcalFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: 'POST', body: JSON.stringify(eventBody(sub, warnDays)) }
    );
    return data.id;
  }

  async function updateEvent(calendarId, eventId, sub, warnDays) {
    return await gcalFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'PUT', body: JSON.stringify(eventBody(sub, warnDays)) }
    );
  }

  async function deleteEvent(calendarId, eventId) {
    try {
      await gcalFetch(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: 'DELETE' }
      );
    } catch (e) {
      if (e.status === 404 || e.status === 410) return; // already gone — fine
      throw e;
    }
  }

  // Optional: delete the SUBS calendar entirely (called on toggle OFF if user wants clean slate).
  async function deleteSubsCalendar(calendarId) {
    try {
      await gcalFetch(`/calendars/${encodeURIComponent(calendarId)}`, { method: 'DELETE' });
    } catch (e) {
      if (e.status === 404 || e.status === 410) return;
      throw e;
    }
  }

  window.gcal = {
    CALENDAR_NAME,
    ensureSubsCalendar,
    findSubsCalendarId,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteSubsCalendar,
  };
})();
