(() => {
  'use strict';
  const SUPABASE_URL = 'https://pvqwpohypdioqkfysynz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg';
  const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  const state = { user: null, currentPage: 'home', activeGame: 'Aviator', games: [], sports: [], posts: [], profile: {} };
  const gameInfo = {
    Aviator: { desc: 'Consignez les observations passées du jeu Aviator et consultez un résumé descriptif.', logo: '✈', cls: 'aviator-logo' },
    JetX: { desc: 'Un espace dédié pour garder un historique personnel des observations JetX.', logo: 'JX', cls: 'jetx-logo' },
    CosmoX: { desc: 'Centralisez les entrées historiques CosmoX dans un espace séparé.', logo: '✦', cls: 'cosmox-logo' }
  };
  const say = (id, value) => { const el = $(id); if (el) el.textContent = value ?? ''; };
  const msg = (id, value, isError = false) => { const el = $(id); if (!el) return; el.textContent = value || ''; el.style.color = isError ? '#ff9b91' : ''; };
  const escapeText = value => String(value ?? '');
  const initials = name => (String(name || 'StratX').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || 'SX');
  const formatDate = value => { if (!value) return 'Date non précisée'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); };
  const friendlyError = error => {
    const raw = error?.message || 'Une erreur inattendue est survenue.';
    if (/Invalid login credentials/i.test(raw)) return 'E-mail ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(raw)) return 'Confirmez votre adresse e-mail avant de vous connecter.';
    if (/User already registered/i.test(raw)) return 'Cette adresse e-mail possède déjà un compte. Essayez de vous connecter.';
    if (/Password should be at least/i.test(raw)) return 'Le mot de passe doit contenir au moins 6 caractères.';
    if (/Failed to fetch|NetworkError/i.test(raw)) return 'Connexion impossible. Vérifiez votre réseau et les paramètres Supabase.';
    if (/row-level security|permission denied/i.test(raw)) return 'Accès refusé par les règles Supabase. Vérifiez le fichier schema.sql.';
    if (/relation .* does not exist/i.test(raw)) return 'Une table manque dans Supabase. Exécutez le fichier schema.sql mis à jour.';
    return raw;
  };
  function setStatus(text, good = true) { say('status', text); const dot = document.querySelector('.status-dot'); if (dot) dot.style.background = good ? '#74d5ad' : '#ff8278'; }
  function authUI() {
    const logged = !!state.user;
    $('auth')?.classList.toggle('hide', logged);
    $('app')?.classList.toggle('hide', !logged);
    $('logout')?.classList.toggle('hide', !logged);
    if (!logged) return;
    const meta = state.user.user_metadata || {};
    const displayName = meta.display_name || state.user.email?.split('@')[0] || 'Analyste';
    say('welcomeName', displayName);
    say('profileDisplayName', displayName);
    say('profileemail', state.user.email || 'E-mail non disponible');
    say('profileEmailReadonly', state.user.email || '');
    say('profileid', state.user.id || '');
    say('avatarInitials', initials(displayName));
    say('memberSince', state.user.created_at ? `Membre depuis le ${new Date(state.user.created_at).toLocaleDateString('fr-FR')}` : 'Compte utilisateur');
    say('sessionInfo', state.user.last_sign_in_at ? `Dernière connexion : ${formatDate(state.user.last_sign_in_at)}` : 'Session connectée');
    if ($('displayName') && !$('displayName').dataset.loaded) { $('displayName').value = meta.display_name || ''; $('profileBio').value = meta.bio || ''; $('displayName').dataset.loaded = 'yes'; }
  }
  function showPage(id) {
    if (!$(`${id}`) || !$(`${id}`).classList.contains('page')) return;
    state.currentPage = id;
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('hide', el.id !== id));
    document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === id));
    if (id === 'games') renderGame();
    if (id === 'profile') authUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function createRecord(title, body, date, eyebrow) {
    const card = document.createElement('article'); card.className = 'item';
    if (eyebrow) { const tag = document.createElement('small'); tag.textContent = eyebrow; card.append(tag); }
    const h = document.createElement('h3'); h.textContent = escapeText(title); card.append(h);
    const d = document.createElement('small'); d.textContent = formatDate(date); card.append(d);
    if (body) { const p = document.createElement('p'); p.textContent = escapeText(body); card.append(p); }
    return card;
  }
  function renderList(id, rows, mapper, emptyTitle, emptyBody) {
    const el = $(id); if (!el) return; el.replaceChildren();
    if (!rows?.length) { const wrap = document.createElement('div'); wrap.className = 'empty-state'; const ico = document.createElement('span'); ico.className = 'empty-icon'; ico.textContent = '▤'; const b = document.createElement('b'); b.textContent = emptyTitle || 'Aucune donnée pour le moment'; const p = document.createElement('p'); p.textContent = emptyBody || 'Les éléments enregistrés apparaîtront ici.'; wrap.append(ico, b, p); el.append(wrap); return; }
    rows.forEach(row => { const data = mapper(row); el.append(createRecord(data.title, data.body, data.date, data.eyebrow)); });
  }
  async function queryTable(table, fields, order = 'created_at', limit = 100) {
    const { data, error } = await db.from(table).select(fields).order(order, { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }
  async function refresh() {
    if (!db || !state.user) return;
    say('refresh', '↻ Actualiser');
    try {
      const [posts, sports, games] = await Promise.all([
        queryTable('analyses', 'id,title,body,created_at,user_id'),
        queryTable('sports_analyses', 'id,competition,teams,notes,match_date,created_at,user_id'),
        queryTable('game_observations', 'id,game_name,multiplier,note,observed_at,created_at,user_id')
      ]);
      state.posts = posts; state.sports = sports; state.games = games;
      say('countPosts', posts.length); say('countSports', sports.length); say('countGames', games.length);
      say('sportsCount', `${sports.length} fiche${sports.length === 1 ? '' : 's'}`);
      renderList('sportslist', sports, r => ({ title: r.teams, body: `${r.competition || 'Compétition non précisée'}\n${r.notes || ''}`, date: r.match_date || r.created_at, eyebrow: 'FICHE FOOTBALL' }), 'Aucune rencontre enregistrée', 'Ajoutez une fiche de rencontre pour la retrouver ici.');
      renderList('posts', posts, r => ({ title: r.title, body: r.body, date: r.created_at, eyebrow: 'PUBLICATION COMMUNAUTAIRE' }), 'Aucune publication', 'Soyez le premier à partager une analyse.');
      renderList('latest', [...posts.map(r => ({ title: r.title, body: r.body, created_at: r.created_at, kind: 'PUBLICATION' })), ...sports.map(r => ({ title: r.teams, body: r.competition, created_at: r.created_at, kind: 'FOOTBALL' })), ...games.map(r => ({ title: `${r.game_name}${r.multiplier == null ? '' : ` · ${Number(r.multiplier).toFixed(2)}x`}`, body: r.note || 'Observation historique', created_at: r.created_at, kind: 'OBSERVATION' }))].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), r => ({ title: r.title, body: r.body, date: r.created_at, eyebrow: r.kind }), 'Votre espace est prêt', 'Vos publications et analyses apparaîtront ici.');
      renderGame(); setStatus('Connecté · synchronisé');
    } catch (error) { setStatus('Erreur de synchronisation', false); console.error('StratX refresh:', error); ['sportslist','posts','latest','gameslist'].forEach(id => { const el=$(id); if(el) el.textContent=friendlyError(error); }); }
  }
  function renderGame() {
    const name = state.activeGame; const info = gameInfo[name]; if (!info) return;
    say('gamename', name); $('gamename').value = name;
    say('gameBannerTitle', name); say('gameBannerDesc', info.desc); say('historyTitle', `Historique ${name}`);
    const logo = $('gameBannerLogo'); logo.className = `game-banner-logo ${info.cls}`; logo.textContent = info.logo;
    document.querySelectorAll('.game-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.game === name));
    const rows = state.games.filter(r => r.game_name === name).sort((a,b) => new Date(b.observed_at || b.created_at) - new Date(a.observed_at || a.created_at));
    const vals = rows.map(r => Number(r.multiplier)).filter(v => Number.isFinite(v) && v > 0);
    say('gameTotal', rows.length); say('gameAverage', vals.length ? `${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)}x` : '—'); say('gameMaximum', vals.length ? `${Math.max(...vals).toFixed(2)}x` : '—'); say('gameCountChip', `${rows.length} entrée${rows.length===1?'':'s'}`);
    renderList('gameslist', rows, r => ({ title: r.multiplier == null ? 'Observation sans valeur numérique' : `Valeur observée : ${Number(r.multiplier).toFixed(2)}x`, body: r.note || 'Aucune note ajoutée.', date: r.observed_at || r.created_at, eyebrow: name.toUpperCase() }), `Aucune observation ${name}`, `Les entrées que vous ajouterez à ${name} seront affichées ici.`);
  }
  async function runAuth(action) {
    if (!db) { msg('authmsg', 'Le service Supabase ne se charge pas. Vérifiez votre connexion et les clés de configuration.', true); return; }
    const email = $('email').value.trim(); const password = $('password').value;
    if (!email || !email.includes('@')) { msg('authmsg', 'Saisissez une adresse e-mail valide.', true); $('email').focus(); return; }
    if (action !== 'reset' && password.length < 6) { msg('authmsg', 'Le mot de passe doit contenir au moins 6 caractères.', true); $('password').focus(); return; }
    ['login','signup','resetPassword'].forEach(id => { const b=$(id); if(b) b.disabled = true; });
    try {
      if (action === 'login') {
        const { error } = await db.auth.signInWithPassword({ email, password }); if (error) throw error; msg('authmsg', 'Connexion réussie.');
      } else if (action === 'signup') {
        const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name: email.split('@')[0] } } }); if (error) throw error;
        msg('authmsg', data.session ? 'Compte créé et connecté.' : 'Compte créé. Consultez votre e-mail pour confirmer votre adresse avant la connexion.');
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] }); if (error) throw error;
        msg('authmsg', 'Si cette adresse correspond à un compte, un e-mail de réinitialisation sera envoyé.');
      }
    } catch (error) { msg('authmsg', friendlyError(error), true); }
    finally { ['login','signup','resetPassword'].forEach(id => { const b=$(id); if(b) b.disabled = false; }); }
  }
  async function signOut() { if (!db) return; const { error } = await db.auth.signOut(); if (error) msg('profilemsg', friendlyError(error), true); }
  function bind() {
    document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
    document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.goto)));
    document.querySelectorAll('.game-tab').forEach(btn => btn.addEventListener('click', () => { state.activeGame = btn.dataset.game; renderGame(); }));
    $('login').addEventListener('click', () => runAuth('login'));
    $('signup').addEventListener('click', () => runAuth('signup'));
    $('resetPassword').addEventListener('click', () => runAuth('reset'));
    $('password').addEventListener('keydown', e => { if (e.key === 'Enter') runAuth('login'); });
    $('togglePassword').addEventListener('click', () => { const p=$('password'); p.type = p.type === 'password' ? 'text' : 'password'; });
    $('logout').addEventListener('click', signOut); $('profileLogout').addEventListener('click', signOut); $('refresh').addEventListener('click', refresh);
    $('sportform').addEventListener('submit', async e => {
      e.preventDefault(); if (!state.user) return;
      const btn=e.submitter; if(btn) btn.disabled=true;
      const date = $('matchdate').value ? new Date($('matchdate').value).toISOString() : null;
      try { const { error } = await db.from('sports_analyses').insert({ user_id: state.user.id, competition: $('competition').value.trim(), teams: $('teams').value.trim(), notes: $('notes').value.trim(), match_date: date }); if(error) throw error; e.target.reset(); msg('sportmsg','Fiche de rencontre enregistrée.'); await refresh(); }
      catch(error) { msg('sportmsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('gameform').addEventListener('submit', async e => {
      e.preventDefault(); if (!state.user) return;
      const raw=$('multiplier').value; const observed = $('observedAt').value ? new Date($('observedAt').value).toISOString() : new Date().toISOString(); const btn=e.submitter; if(btn) btn.disabled=true;
      try { const { error } = await db.from('game_observations').insert({ user_id: state.user.id, game_name: state.activeGame, multiplier: raw === '' ? null : Number(raw), note: $('gamenote').value.trim() || null, observed_at: observed }); if(error) throw error; e.target.reset(); $('gamename').value=state.activeGame; msg('gamemsg',`Observation ${state.activeGame} enregistrée.`); await refresh(); }
      catch(error) { msg('gamemsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('postform').addEventListener('submit', async e => {
      e.preventDefault(); if (!state.user) return; const btn=e.submitter; if(btn) btn.disabled=true;
      try { const { error } = await db.from('analyses').insert({ user_id: state.user.id, title: $('title').value.trim(), body: $('body').value.trim() }); if(error) throw error; e.target.reset(); msg('postmsg','Publication enregistrée.'); await refresh(); }
      catch(error) { msg('postmsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('profileform').addEventListener('submit', async e => {
      e.preventDefault(); if (!db || !state.user) return; const display_name=$('displayName').value.trim(); const bio=$('profileBio').value.trim(); const btn=e.submitter; if(btn) btn.disabled=true;
      try { const { data, error } = await db.auth.updateUser({ data: { display_name: display_name || state.user.email?.split('@')[0] || 'Analyste', bio } }); if(error) throw error; state.user=data.user; $('displayName').dataset.loaded='yes'; authUI(); msg('profilemsg','Votre profil a été mis à jour.'); }
      catch(error) { msg('profilemsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('copyId').addEventListener('click', async () => { const id=state.user?.id; if(!id) return; try { await navigator.clipboard.writeText(id); $('copyId').textContent='Copié ✓'; setTimeout(()=>$('copyId').textContent='Copier',1600); } catch { msg('profilemsg','Impossible de copier automatiquement. Sélectionnez l’identifiant pour le copier.'); } });
  }
  function initDate() { say('todayDate', new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'})); const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); const local=now.toISOString().slice(0,16); if($('observedAt')) $('observedAt').value=local; }
  async function init() {
    bind(); initDate();
    if (!db) { setStatus('Supabase indisponible',false); msg('authmsg','Impossible de charger Supabase. Vérifiez la connexion Internet ou la configuration de la bibliothèque.',true); return; }
    try {
      const { data, error } = await db.auth.getSession(); if(error) throw error; state.user=data.session?.user || null; authUI();
      if(state.user) { setStatus('Connecté'); await refresh(); } else setStatus('En attente de connexion');
      db.auth.onAuthStateChange((_event, session) => { state.user=session?.user || null; if(!state.user && $('displayName')) delete $('displayName').dataset.loaded; authUI(); if(state.user) { setStatus('Connecté'); setTimeout(() => refresh(),0); } else { setStatus('En attente de connexion'); state.posts=[]; state.sports=[]; state.games=[]; } });
    } catch(error) { setStatus('Erreur de connexion',false); msg('authmsg',friendlyError(error),true); console.error('StratX auth init:',error); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
