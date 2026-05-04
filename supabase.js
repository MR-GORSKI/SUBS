// supabase.js — Supabase client + auth + subscriptions repo.
// The anon key is safe to expose; access is enforced server-side via RLS.

const SUPABASE_URL = 'https://cjsrqrxevoetsjxjzedb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqc3Jxcnhldm9ldHNqeGp6ZWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTA2MTcsImV4cCI6MjA5MzQ2NjYxN30.8jXRvDHaRMS8T-9O6PAnGAeRIJlUpVzZzPReWi3IhJM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Auth ─────────────────────────────────────────────────
// Scopes requested at sign-in.
// `calendar` (full) is needed because we both create a dedicated calendar
// (calendars.insert) and list calendars to find it (calendarList.list).
// The narrower `calendar.events` scope can't do either — only manipulate
// events on calendars that already exist and were created by other means.
// `access_type=offline` + `prompt=consent` ensures Google issues a refresh
// token so Supabase can transparently refresh provider_token after 1h.
const GOOGLE_SCOPES = 'email profile openid https://www.googleapis.com/auth/calendar';

async function signInWithGoogle() {
  // After Google flow, Supabase redirects back to current page; the JS client
  // catches the hash and creates a session, then onAuthStateChange fires.
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GOOGLE_SCOPES,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

async function signOut() {
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

// Convert auth.user → app-friendly profile
function userProfile(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || meta.email || '',
    name: meta.full_name || meta.name || (user.email || '').split('@')[0] || 'User',
    avatarUrl: meta.avatar_url || meta.picture || null,
    memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }).toUpperCase() : '—',
  };
}

// ── Subscriptions repo ───────────────────────────────────
function rowToSub(r) {
  return {
    id: r.id,
    name: r.name,
    price: Number(r.price),
    currency: r.currency || 'EUR',
    period: r.period,
    start: r.start,
    color: r.color,
    closed: r.closed,
    gcal_event_id: r.gcal_event_id || null,
    gcal_calendar_id: r.gcal_calendar_id || null,
  };
}

const subsRepo = {
  async list() {
    const { data, error } = await sb
      .from('subscriptions')
      .select('*')
      .order('start', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToSub);
  },

  async create(sub) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const row = {
      user_id: user.id,
      name: sub.name,
      price: sub.price,
      currency: sub.currency || 'EUR',
      period: sub.period,
      start: sub.start,
      color: sub.color,
      closed: sub.closed ?? null,
    };
    const { data, error } = await sb
      .from('subscriptions')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return rowToSub(data);
  },

  async update(id, patch) {
    const row = {};
    if ('name' in patch)             row.name = patch.name;
    if ('price' in patch)            row.price = patch.price;
    if ('currency' in patch)         row.currency = patch.currency;
    if ('period' in patch)           row.period = patch.period;
    if ('start' in patch)            row.start = patch.start;
    if ('color' in patch)            row.color = patch.color;
    if ('closed' in patch)           row.closed = patch.closed;
    if ('gcal_event_id' in patch)    row.gcal_event_id = patch.gcal_event_id;
    if ('gcal_calendar_id' in patch) row.gcal_calendar_id = patch.gcal_calendar_id;
    const { data, error } = await sb
      .from('subscriptions')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToSub(data);
  },

  async remove(id) {
    const { error } = await sb.from('subscriptions').delete().eq('id', id);
    if (error) throw error;
  },
};

// Returns the Google OAuth access token from the current session,
// optionally forcing a refresh first (useful after a 401 from a Google API).
async function getGoogleAccessToken({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    const { error } = await sb.auth.refreshSession();
    if (error) throw new Error('Session refresh failed: ' + error.message);
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Not signed in');
  if (!session.provider_token) throw new Error('NO_GOOGLE_TOKEN');
  return session.provider_token;
}

// Expose
Object.assign(window, {
  sb,
  signInWithGoogle,
  signOut,
  userProfile,
  subsRepo,
  getGoogleAccessToken,
});
