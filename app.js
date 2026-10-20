(() => {
  'use strict';
  const SUPABASE_URL = 'https://pvqwpohypdioqkfysynz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg';
  const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  const state = { visitorRows: [], visitorPage: 0, currentPage: 'home', activeGame: 'Aviator', gameSection: 'overview', games: [], sports: [], posts: [], profile: {}, communityFilter: 'all', communityQuery: '', communitySort: 'newest', communityLiked: new Set(), communitySaved: new Set(), communityComments: {}, showGameHistory: false };
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
    $('authVisits')?.classList.toggle('hide', logged);
    $('auth')?.classList.toggle('hide', logged);
    $('app')?.classList.toggle('hide', !logged);
    $('logout')?.classList.toggle('hide', !logged);
    if (!logged) return;
    const meta = state.user.user_metadata || {};
    const displayName = meta.display_name || 'Membre StratX';
    say('welcomeName', displayName);
    say('profileDisplayName', displayName);
    say('profileemail', state.user.email || 'E-mail non disponible');
    say('profileEmailReadonly', state.user.email || '');
    say('profileid', state.user.id || '');
    say('avatarInitials', initials(displayName));
    say('memberSince', state.user.created_at ? `Membre depuis le ${new Date(state.user.created_at).toLocaleDateString('fr-FR')}` : 'Compte utilisateur');
    say('sessionInfo', state.user.last_sign_in_at ? `Dernière connexion : ${formatDate(state.user.last_sign_in_at)}` : 'Session connectée');
    say('profilePostCount', String(state.posts.filter(r => r.user_id === state.user.id).length));
    say('profileObservationCount', String(state.games.filter(r => r.user_id === state.user.id).length));
    say('profileBioPreview', meta.bio || 'Ajoutez une présentation pour compléter votre profil.');
    if ($('displayName') && !$('displayName').dataset.loaded) { $('displayName').value = meta.display_name || ''; $('profileBio').value = meta.bio || ''; $('displayName').dataset.loaded = 'yes'; }
  }
  const gameSlug = { aviator: 'Aviator', jetx: 'JetX', cosmox: 'CosmoX' };
  const gameRouteSections = new Set(['resultats', 'historique', 'statistiques']);
  function parseRoute() {
    const path = decodeURIComponent(window.location.pathname).replace(/\/+$/, '') || '/';
    const parts = path.split('/').filter(Boolean);
    const first = (parts[0] || '').toLowerCase();
    if (gameSlug[first]) {
      const section = (parts[1] || 'overview').toLowerCase();
      return { page: 'games', game: gameSlug[first], section: gameRouteSections.has(section) ? section : 'overview', path };
    }
    const fixed = {
      '/': { page: 'home' }, '/accueil': { page: 'home' }, '/connexion': { page: 'auth' },
      '/inscription': { page: 'auth', authMode: 'signup' }, '/mot-de-passe-oublie': { page: 'auth', authMode: 'reset' }, '/visiteurs': { page: 'visitors' },
      '/jeux': { page: 'games' }, '/communaute': { page: 'community' }, '/profil': { page: 'profile' }
    };
    return { ...(fixed[path] || fixed['/']), path };
  }
  function routeForCurrentPage(id) {
    if (id === 'games') return `/${state.activeGame.toLowerCase()}${state.gameSection && state.gameSection !== 'overview' ? '/' + state.gameSection : ''}`;
    return ({ home: '/accueil', auth: '/connexion', community: '/communaute', profile: '/profil' })[id] || '/accueil';
  }
  function syncRouteFromUrl() {
    const route = parseRoute();
    if (!state.user) {
      $('app')?.classList.add('hide'); $('logout')?.classList.add('hide');
      $('auth')?.classList.remove('hide');
      $('authVisits')?.classList.remove('hide');
      if (route.page === 'auth') { if (route.authMode === 'signup') toggleSignupFields(true); else toggleSignupFields(false); }
      if (route.page === 'visitors') trackPublicVisit();
      return;
    }
    $('auth')?.classList.add('hide'); $('authVisits')?.classList.add('hide'); $('app')?.classList.remove('hide'); $('logout')?.classList.remove('hide');
    if (route.page === 'auth') { history.replaceState({}, '', '/accueil'); return showPage('home', false); }
    if (route.game) {
      state.activeGame = route.game;
      state.gameSection = route.section || 'overview';
      state.showGameHistory = state.gameSection === 'historique';
      document.querySelectorAll('.game-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.game === route.game));
    }
    showPage(route.page, false);
    if (route.page === 'auth' && route.authMode === 'reset') toggleSignupFields(false);
  }
  function showPage(id, updateUrl = true) {
    if (id === 'sports') { setStatus('Module football verrouillé temporairement', false); return; }
    if (!$(`${id}`) || !$(`${id}`).classList.contains('page')) return;
    state.currentPage = id;
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('hide', el.id !== id));
    document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === id));
    if (id === 'games') renderGame();
    if (id === 'profile') authUI();
    if (updateUrl) history.pushState({}, '', routeForCurrentPage(id));
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
        queryTable('analyses', 'id,title,body,created_at,user_id,author_name'),
        queryTable('sports_analyses', 'id,competition,teams,notes,match_date,created_at,user_id'),
        queryTable('game_observations', 'id,game_name,multiplier,note,observed_at,created_at,user_id')
      ]);
      state.posts = posts; state.sports = sports; state.games = games; authUI();
      say('countPosts', posts.length); say('countSports', sports.length); say('countGames', games.length);
      say('sportsCount', `${sports.length} fiche${sports.length === 1 ? '' : 's'}`);
      renderList('sportslist', sports, r => ({ title: r.teams, body: `${r.competition || 'Compétition non précisée'}\n${r.notes || ''}`, date: r.match_date || r.created_at, eyebrow: 'FICHE FOOTBALL' }), 'Aucune rencontre enregistrée', 'Ajoutez une fiche de rencontre pour la retrouver ici.');
      renderCommunity();
      renderList('latest', [...posts.map(r => ({ title: r.title, body: r.body, created_at: r.created_at, kind: 'PUBLICATION' })), ...sports.map(r => ({ title: r.teams, body: r.competition, created_at: r.created_at, kind: 'FOOTBALL' })), ...games.map(r => ({ title: `${r.game_name}${r.multiplier == null ? '' : ` · ${Number(r.multiplier).toFixed(2)}x`}`, body: 'Observation historique enregistrée', created_at: r.created_at, kind: 'OBSERVATION' }))].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), r => ({ title: r.title, body: r.body, date: r.created_at, eyebrow: r.kind }), 'Votre espace est prêt', 'Vos publications et analyses apparaîtront ici.');
      renderGame(); setStatus('Connecté · synchronisé');
    } catch (error) { setStatus('Erreur de synchronisation', false); console.error('StratX refresh:', error); ['sportslist','posts','latest','gameslist'].forEach(id => { const el=$(id); if(el) el.textContent=friendlyError(error); }); }
  }
  const communityStoreKey = suffix => `stratx-community-${state.user?.id || 'guest'}-${suffix}`;
  function readCommunityStore(suffix, fallback) { try { const value = JSON.parse(localStorage.getItem(communityStoreKey(suffix)) || 'null'); return value ?? fallback; } catch { return fallback; } }
  function writeCommunityStore(suffix, value) { try { localStorage.setItem(communityStoreKey(suffix), JSON.stringify(value)); } catch {} }
  function communityToast(text) { const el=$('communityToast'); if(!el) return; el.textContent=text; el.classList.add('show'); window.clearTimeout(communityToast._timer); communityToast._timer=window.setTimeout(()=>el.classList.remove('show'),2600); }
  function renderCommunity() {
    const list=$('posts'); if(!list) return;
    state.communityLiked=new Set(readCommunityStore('liked',[])); state.communitySaved=new Set(readCommunityStore('saved',[])); state.communityComments=readCommunityStore('comments',{});
    const query=(state.communityQuery||'').trim().toLocaleLowerCase('fr');
    let rows=[...(state.posts||[])];
    if(state.communityFilter==='mine') rows=rows.filter(r=>r.user_id===state.user?.id);
    if(state.communityFilter==='saved') rows=rows.filter(r=>state.communitySaved.has(String(r.id)));
    if(state.communitySort==='liked') rows=rows.filter(r=>state.communityLiked.has(String(r.id)));
    if(query) rows=rows.filter(r=>`${r.title||''} ${r.body||''}`.toLocaleLowerCase('fr').includes(query));
    rows.sort((a,b)=>state.communitySort==='oldest'?new Date(a.created_at)-new Date(b.created_at):new Date(b.created_at)-new Date(a.created_at));
    say('communityPostCount', state.posts.length); say('communityMineCount', state.posts.filter(r=>r.user_id===state.user?.id).length); say('communitySavedCount', state.communitySaved.size); say('savedFilterCount', state.communitySaved.size);
    const name=state.user?.user_metadata?.display_name || 'Membre StratX'; say('communityComposerName',name); say('communityAvatar',initials(name));
    list.replaceChildren();
    if(!rows.length){const empty=document.createElement('div');empty.className='community-empty';const icon=document.createElement('span');icon.textContent=query?'⌕':'✦';const h=document.createElement('h3');h.textContent=query?'Aucun résultat':'Le fil attend votre première idée';const p=document.createElement('p');p.textContent=query?'Essayez un autre mot-clé ou changez le filtre.':state.communityFilter==='saved'?'Enregistrez une publication en favori pour la retrouver ici.':state.communityFilter==='mine'?'Vos publications apparaîtront ici après leur partage.':'Soyez le premier membre à lancer une discussion utile.';empty.append(icon,h,p);list.append(empty);return;}
    rows.forEach(r=>{
      const id=String(r.id), mine=r.user_id===state.user?.id, author=r.author_name || (mine?(state.user?.user_metadata?.display_name||'Vous'):'Membre StratX');
      const card=document.createElement('article');card.className='community-post-card';
      const top=document.createElement('div');top.className='post-author-row';const avatar=document.createElement('div');avatar.className='post-avatar';avatar.textContent=initials(author);const meta=document.createElement('div');meta.className='post-author-meta';const nm=document.createElement('b');nm.textContent=author;const dt=document.createElement('small');dt.textContent=`${mine?'Votre publication':'Membre StratX'} · ${formatDate(r.created_at)}`;meta.append(nm,dt);const pill=document.createElement('span');pill.className='post-type-pill';pill.textContent=mine?'VOTRE POST':'DISCUSSION';top.append(avatar,meta,pill);
      const title=document.createElement('h3');title.className='post-title';title.textContent=r.title||'Publication sans titre';const body=document.createElement('p');body.className='post-body';body.textContent=r.body||'';
      const action=document.createElement('div');action.className='post-actions';const like=document.createElement('button');like.type='button';like.className='post-action'+(state.communityLiked.has(id)?' selected':'');like.innerHTML=`<span>♡</span> ${state.communityLiked.has(id)?'Aimé':'J’aime'}`;like.addEventListener('click',()=>{const set=new Set(readCommunityStore('liked',[]));set.has(id)?set.delete(id):set.add(id);writeCommunityStore('liked',[...set]);renderCommunity();});const commentBtn=document.createElement('button');commentBtn.type='button';commentBtn.className='post-action';commentBtn.innerHTML=`<span>▤</span> Commenter`;const save=document.createElement('button');save.type='button';save.className='post-action post-save'+(state.communitySaved.has(id)?' selected':'');save.innerHTML=`<span>${state.communitySaved.has(id)?'★':'☆'}</span> ${state.communitySaved.has(id)?'Enregistré':'Enregistrer'}`;save.addEventListener('click',()=>{const set=new Set(readCommunityStore('saved',[]));set.has(id)?set.delete(id):set.add(id);writeCommunityStore('saved',[...set]);renderCommunity();communityToast(set.has(id)?'Publication ajoutée aux favoris.':'Publication retirée des favoris.');});action.append(like,commentBtn,save);
      if(mine || state.user?.app_metadata?.role==='admin') { const del=document.createElement('button'); del.type='button'; del.className='post-action post-delete'; del.textContent='Supprimer'; del.addEventListener('click',async()=>{if(!confirm('Supprimer définitivement cette publication ?'))return;try{const {error}=await db.from('analyses').delete().eq('id',r.id);if(error)throw error;communityToast('Publication supprimée.');await refresh();}catch(error){communityToast(friendlyError(error));}});action.append(del); }
      const commentArea=document.createElement('div');commentArea.className='post-comment-area';const commentsHead=document.createElement('div');commentsHead.className='comments-heading';commentsHead.textContent='Commentaires';commentArea.append(commentsHead);const commentList=document.createElement('div');commentList.className='comment-list';commentList.dataset.postId=id;commentArea.append(commentList);const form=document.createElement('form');form.className='comment-form';const input=document.createElement('input');input.maxLength=500;input.required=true;input.placeholder='Écrire un commentaire…';input.setAttribute('aria-label','Écrire un commentaire');const send=document.createElement('button');send.type='submit';send.textContent='Envoyer';form.append(input,send);form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value.trim();if(!text||!state.user)return;send.disabled=true;try{const {error}=await db.from('community_comments').insert({post_id:r.id,user_id:state.user.id,author_name:state.user.user_metadata?.display_name||'Membre StratX',body:text});if(error)throw error;input.value='';await loadComments(r.id,commentList);communityToast('Commentaire publié.');}catch(error){communityToast(friendlyError(error));}finally{send.disabled=false;}});commentBtn.addEventListener('click',()=>{commentArea.classList.toggle('expanded');if(commentArea.classList.contains('expanded')){input.focus();loadComments(r.id,commentList);}});loadComments(r.id,commentList);
      card.append(top,title,body,action,commentArea);list.append(card);
    });
  }
  async function loadComments(postId, container) {
    if(!db||!container)return;
    try {
      const {data,error}=await db.from('community_comments').select('id,user_id,author_name,body,created_at').eq('post_id',postId).order('created_at',{ascending:true}).limit(50);
      if(error)throw error; container.replaceChildren();
      const head=container.parentElement?.querySelector('.comments-heading'); if(head)head.textContent=`Discussion · ${(data||[]).length} commentaire${(data||[]).length===1?'':'s'}`;
      (data||[]).forEach(c=>{const row=document.createElement('div');row.className='local-comment';const ca=document.createElement('span');ca.className='comment-avatar';ca.textContent=initials(c.author_name);const wrap=document.createElement('div');wrap.className='comment-content';const cb=document.createElement('b');cb.textContent=c.author_name||'Membre StratX';const cp=document.createElement('p');cp.textContent=c.body;const dt=document.createElement('small');dt.textContent=formatDate(c.created_at);wrap.append(cb,cp,dt);row.append(ca,wrap);if(c.user_id===state.user?.id||state.user?.app_metadata?.role==='admin'||state.posts.some(p=>String(p.id)===String(postId)&&p.user_id===state.user?.id)){const del=document.createElement('button');del.type='button';del.className='comment-delete';del.textContent='Supprimer';del.addEventListener('click',async()=>{if(!confirm('Supprimer ce commentaire ?'))return;try{const {error}=await db.from('community_comments').delete().eq('id',c.id);if(error)throw error;await loadComments(postId,container);}catch(error){communityToast(friendlyError(error));}});row.append(del);}container.append(row);});
    } catch(error) { container.textContent='Impossible de charger les commentaires. Vérifiez que schema.sql a été exécuté.'; }
  }
  function renderGame() {
    const name = state.activeGame; const info = gameInfo[name]; if (!info) return;
    say('gamename', name); if ($('gamename')) $('gamename').value = name;
    say('gameBannerTitle', name); say('gameBannerDesc', info.desc); say('historyTitle', `Historique ${name}`);
    const logo = $('gameBannerLogo'); logo.className = `game-banner-logo ${info.cls}`; logo.textContent = info.logo;
    document.querySelectorAll('.game-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.game === name));
    const rows = state.games.filter(r => r.game_name === name).sort((a,b) => new Date(b.observed_at || b.created_at) - new Date(a.observed_at || a.created_at));
    const vals = rows.map(r => Number(r.multiplier)).filter(v => Number.isFinite(v) && v > 0);
    say('gameTotal', rows.length); say('gameAverage', vals.length ? `${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)}x` : '—'); say('gameMaximum', vals.length ? `${Math.max(...vals).toFixed(2)}x` : '—'); say('gameCountChip', `${rows.length} entrée${rows.length===1?'':'s'}`);
    const latest = rows[0];
    const result = $('analysisResult');
    if (result) { result.replaceChildren(); if (latest) { const label=document.createElement('div'); label.className='eyebrow'; label.textContent='DERNIÈRE OBSERVATION ENREGISTRÉE'; const value=document.createElement('h3'); value.className='analysis-result-value'; value.textContent=latest.multiplier == null ? 'Observation enregistrée' : `${Number(latest.multiplier).toFixed(2)}x`; const date=document.createElement('p'); date.className='subtle'; date.textContent=formatDate(latest.observed_at || latest.created_at); result.append(label,value,date); } else { const label=document.createElement('div'); label.className='eyebrow'; label.textContent='RÉSULTAT'; const value=document.createElement('h3'); value.textContent='Aucune observation enregistrée'; const date=document.createElement('p'); date.className='subtle'; date.textContent='Enregistrez une valeur observée pour l’afficher ici.'; result.append(label,value,date); } }
    const history = $('historyPanel'); if (history) history.classList.toggle('hide', !state.showGameHistory);
    const historyButton = $('toggleGameHistory'); if (historyButton) historyButton.textContent = state.showGameHistory ? 'Masquer l’historique précédent' : 'Afficher l’historique précédent';
    const section = gameRouteSections.has(state.gameSection) ? state.gameSection : 'overview';
    const statsPanel = document.querySelector('#games .game-stats');
    const resultsPanel = $('analysisResult')?.closest('.analysis-result-panel');
    const historyPanel = $('historyTitle')?.closest('.surface');
    const panels = { statistiques: statsPanel, resultats: resultsPanel, historique: historyPanel };
    Object.entries(panels).forEach(([key, panel]) => { if (panel) panel.classList.toggle('hide', section !== 'overview' && section !== key); });
    document.querySelectorAll('[data-game-section]').forEach(btn => {
      const active = btn.dataset.gameSection === section;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    if (section === 'historique') { state.showGameHistory = true; if (history) history.classList.remove('hide'); }
    renderList('gameslist', rows, r => ({ title: r.multiplier == null ? 'Observation sans valeur numérique' : `Valeur observée : ${Number(r.multiplier).toFixed(2)}x`, body: '', date: r.observed_at || r.created_at, eyebrow: name.toUpperCase() }), `Aucune observation ${name}`, `Les entrées que vous ajouterez à ${name} seront affichées ici.`);
  }
  function toggleSignupFields(show) {
    const wrap = $('signupNameWrap');
    if (wrap) wrap.classList.toggle('signup-mode', !!show);
    if ($('signupName')) $('signupName').required = !!show;
    const signupButton = $('signup');
    if (signupButton) signupButton.innerHTML = show ? 'Valider la création <span>→</span>' : 'Créer mon compte';
    if ($('password')) $('password').autocomplete = show ? 'new-password' : 'current-password';
    if (show) $('signupName')?.focus();
  }
  async function runAuth(action) {
    if (!db) { msg('authmsg', 'Le service Supabase ne se charge pas. Vérifiez votre connexion et les clés de configuration.', true); return; }
    const email = $('email')?.value.trim() || '';
    const password = $('password')?.value || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('authmsg', 'Saisissez une adresse e-mail valide.', true); $('email')?.focus(); return; }
    if (action !== 'reset' && password.length < 6) { msg('authmsg', 'Le mot de passe doit contenir au moins 6 caractères.', true); $('password')?.focus(); return; }
    if (action === 'signup') {
      const displayName = $('signupName')?.value.trim() || '';
      if (displayName.length < 2) { msg('authmsg', 'Saisissez le nom qui sera affiché dans StratX.', true); $('signupName')?.focus(); return; }
    }
    ['login','signup','resetPassword'].forEach(id => { const b = $(id); if (b) b.disabled = true; });
    try {
      if (action === 'login') {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.user = data.user || data.session?.user || null;
        authUI();
        if (state.user) { showPage('home'); await refresh(); }
        msg('authmsg', 'Connexion réussie. Bienvenue sur StratX.');
      } else if (action === 'signup') {
        const displayName = $('signupName').value.trim();
        const redirectUrl = window.location.origin + '/connexion';
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } }
        });
        if (error) throw error;
        if (data.session) {
          state.user = data.user || data.session.user; authUI(); showPage('home'); await refresh();
          msg('authmsg', 'Compte créé et connecté. Bienvenue sur StratX.');
        } else {
          msg('authmsg', 'Compte créé. Ouvrez l’e-mail de confirmation envoyé par Supabase, confirmez votre adresse, puis revenez ici pour vous connecter.');
        }
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/mot-de-passe-oublie' });
        if (error) throw error;
        msg('authmsg', 'Si cette adresse correspond à un compte, un e-mail de réinitialisation sera envoyé.');
      }
    } catch (error) { msg('authmsg', friendlyError(error), true); }
    finally { ['login','signup','resetPassword'].forEach(id => { const b = $(id); if (b) b.disabled = false; }); }
  }
  async function signOut() { if (!db) return; const { error } = await db.auth.signOut(); if (error) msg('profilemsg', friendlyError(error), true); }
  function bind() {
    $('openVisitors')?.addEventListener('click', async () => { $('auth')?.classList.remove('hide'); $('authVisits')?.classList.remove('hide'); history.pushState({}, '', '/visiteurs'); await trackPublicVisit(); $('authVisits')?.scrollIntoView({behavior:'smooth',block:'start'}); });
    $('backToLogin')?.addEventListener('click', () => { $('authVisits')?.classList.remove('hide'); $('auth')?.classList.remove('hide'); history.pushState({}, '', '/connexion'); window.scrollTo({top:0,behavior:'smooth'}); });
    $('visitPrev')?.addEventListener('click', () => { state.visitorPage=Math.max(0,state.visitorPage-1); renderVisitorPage(); });
    $('visitNext')?.addEventListener('click', () => { const max=Math.max(0,Math.ceil(state.visitorRows.length/25)-1); state.visitorPage=Math.min(max,state.visitorPage+1); renderVisitorPage(); });
    document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
    document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.goto)));
    document.querySelectorAll('.game-tab').forEach(btn => btn.addEventListener('click', () => { state.activeGame = btn.dataset.game; state.gameSection = 'overview'; state.showGameHistory = false; document.querySelectorAll('.game-tab').forEach(tab => tab.classList.toggle('active', tab === btn)); history.pushState({}, '', routeForCurrentPage('games')); renderGame(); }));
    document.querySelectorAll('[data-game-section]').forEach(btn => btn.addEventListener('click', () => { const next = btn.dataset.gameSection; if (!['overview', ...gameRouteSections].includes(next)) return; state.gameSection = next; state.showGameHistory = next === 'historique'; history.pushState({}, '', routeForCurrentPage('games')); renderGame(); }));
    $('toggleGameHistory')?.addEventListener('click', () => { state.showGameHistory = !state.showGameHistory; state.gameSection = state.showGameHistory ? 'historique' : 'overview'; history.pushState({}, '', routeForCurrentPage('games')); renderGame(); });
    $('login').addEventListener('click', () => { history.pushState({}, '', '/connexion'); toggleSignupFields(false); runAuth('login'); });
    $('signup').addEventListener('click', () => {
      if (!$('signupNameWrap')?.classList.contains('signup-mode')) {
        history.pushState({}, '', '/inscription');
        toggleSignupFields(true);
        msg('authmsg', 'Renseignez votre nom affiché, votre e-mail et un mot de passe, puis validez la création du compte.');
        return;
      }
      runAuth('signup');
    });
    $('resetPassword').addEventListener('click', () => { history.pushState({}, '', '/mot-de-passe-oublie'); toggleSignupFields(false); runAuth('reset'); });
    $('password').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); runAuth($('signupNameWrap')?.classList.contains('signup-mode') ? 'signup' : 'login'); }
    });
    $('togglePassword').addEventListener('click', () => { const p=$('password'); p.type = p.type === 'password' ? 'text' : 'password'; });
    $('logout').addEventListener('click', signOut); $('profileLogout').addEventListener('click', signOut); $('refresh').addEventListener('click', refresh);
    $('sportform')?.addEventListener('submit', async e => {
      e.preventDefault(); if (!state.user) return;
      const btn=e.submitter; if(btn) btn.disabled=true;
      const date = $('matchdate').value ? new Date($('matchdate').value).toISOString() : null;
      try { const { error } = await db.from('sports_analyses').insert({ user_id: state.user.id, competition: $('competition').value.trim(), teams: $('teams').value.trim(), notes: $('notes').value.trim(), match_date: date }); if(error) throw error; e.target.reset(); msg('sportmsg','Fiche de rencontre enregistrée.'); await refresh(); }
      catch(error) { msg('sportmsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('postform').addEventListener('submit', async e => {
      e.preventDefault(); if (!state.user) { msg('postmsg','Connectez-vous pour publier.',true); return; } const btn=e.submitter; if(btn) btn.disabled=true;
      const title=$('title').value.trim(), body=$('body').value.trim(); if(!title || !body){msg('postmsg','Le titre et le message sont obligatoires.',true);if(btn)btn.disabled=false;return;}
      try { const { error } = await db.from('analyses').insert({ user_id: state.user.id, title, body, author_name: state.user.user_metadata?.display_name || 'Membre StratX' }); if(error) throw error; e.target.reset(); say('bodyCount','0'); msg('postmsg','Votre publication est en ligne.'); await refresh(); communityToast('Publication partagée avec la communauté.'); $('communityComposer')?.scrollIntoView({behavior:'smooth',block:'start'}); }
      catch(error) { msg('postmsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('communitySearch')?.addEventListener('input', e=>{state.communityQuery=e.target.value;renderCommunity();});
    $('communitySort')?.addEventListener('change', e=>{state.communitySort=e.target.value;renderCommunity();});
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.communityFilter=btn.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===btn));renderCommunity();}));
    $('communityRefresh')?.addEventListener('click',refresh);
    $('jumpComposer')?.addEventListener('click',()=>$('communityComposer')?.scrollIntoView({behavior:'smooth',block:'start'}));
    $('body')?.addEventListener('input',e=>say('bodyCount',String(e.target.value.length)));
    $('profileform').addEventListener('submit', async e => {
      e.preventDefault(); if (!db || !state.user) return; const display_name=$('displayName').value.trim(); const bio=$('profileBio').value.trim(); const btn=e.submitter; if(btn) btn.disabled=true;
      try { const { data, error } = await db.auth.updateUser({ data: { display_name: display_name || 'Membre StratX', bio } }); if(error) throw error; state.user=data.user; $('displayName').dataset.loaded='yes'; authUI(); msg('profilemsg','Votre profil a été mis à jour.'); }
      catch(error) { msg('profilemsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
    });
    $('requestDeleteAccount')?.addEventListener('click', async()=>{if(!state.user||!db)return;if(!confirm('Envoyer une demande de suppression de compte ? Le compte ne sera pas supprimé automatiquement.'))return;const b=$('requestDeleteAccount');b.disabled=true;try{const {error}=await db.from('account_deletion_requests').insert({user_id:state.user.id,email:state.user.email,status:'pending'});if(error)throw error;msg('deleteAccountMsg','Demande enregistrée. Une validation e-mail et une suppression côté serveur restent nécessaires avant toute suppression définitive.');}catch(error){msg('deleteAccountMsg',friendlyError(error),true);}finally{b.disabled=false;}});
    $('copyId').addEventListener('click', async () => { const id=state.user?.id; if(!id) return; try { await navigator.clipboard.writeText(id); $('copyId').textContent='Copié ✓'; setTimeout(()=>$('copyId').textContent='Copier',1600); } catch { msg('profilemsg','Impossible de copier automatiquement. Sélectionnez l’identifiant pour le copier.'); } });
  }
  function initDate() { say('todayDate', new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'})); const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); const local=now.toISOString().slice(0,16); if($('observedAt')) $('observedAt').value=local; }

  async function getDeviceBrand() {
    const ua = navigator.userAgent || '';
    let platform = navigator.userAgentData?.platform || navigator.platform || '';
    let model = navigator.userAgentData?.model || '';
    try {
      if (navigator.userAgentData?.getHighEntropyValues) {
        const hints = await navigator.userAgentData.getHighEntropyValues(['model', 'platform']);
        model = hints.model || model; platform = hints.platform || platform;
      }
    } catch (_) { /* Certains navigateurs masquent volontairement le modèle exact. */ }
    const source = `${model} ${ua} ${platform}`;
    if (/iPhone/i.test(source)) return model ? `Apple · ${model}` : 'Apple · iPhone';
    if (/iPad/i.test(source)) return 'Apple · iPad';
    if (/iPod/i.test(source)) return 'Apple · iPod';
    if (/SM-[A-Z0-9]+|Samsung|SAMSUNG/i.test(source)) {
      const match = source.match(/SM-[A-Z0-9]+/i);
      return match ? `Samsung · ${match[0].toUpperCase()}` : 'Samsung Galaxy';
    }
    if (/Redmi/i.test(source)) { const m=source.match(/Redmi\s[^;,)]+/i); return m ? `Xiaomi · ${m[0].trim()}` : 'Xiaomi · Redmi'; }
    if (/POCO/i.test(source)) { const m=source.match(/POCO\s[^;,)]+/i); return m ? `Xiaomi · ${m[0].trim()}` : 'Xiaomi · POCO'; }
    if (/Xiaomi|Mi\s/i.test(source)) return 'Xiaomi · Mi';
    if (/HUAWEI/i.test(source)) { const m=source.match(/HUAWEI\s[^;,)]+/i); return m ? `Huawei · ${m[0].trim()}` : 'Huawei'; }
    if (/HONOR/i.test(source)) return 'HONOR';
    if (/TECNO/i.test(source)) { const m=source.match(/TECNO\s[^;,)]+/i); return m ? m[0].trim() : 'TECNO'; }
    if (/Infinix/i.test(source)) { const m=source.match(/Infinix\s[^;,)]+/i); return m ? m[0].trim() : 'Infinix'; }
    if (/OPPO/i.test(source)) { const m=source.match(/OPPO\s[^;,)]+/i); return m ? m[0].trim() : 'OPPO'; }
    if (/vivo/i.test(source)) { const m=source.match(/vivo\s[^;,)]+/i); return m ? m[0].trim() : 'vivo'; }
    if (/Pixel/i.test(source)) return 'Google Pixel';
    if (/Android/i.test(source)) return 'Android · modèle masqué par le navigateur';
    if (/Windows/i.test(source)) return 'PC Windows';
    if (/Macintosh|Mac OS/i.test(source)) return 'Apple · Mac';
    if (/Linux/i.test(source)) return 'Ordinateur Linux';
    return 'Appareil non identifié';
  }
  function getVisitorKey() {
    const keyName = 'stratx_visitor_key_v1';
    try {
      let key = localStorage.getItem(keyName);
      if (!key) {
        key = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r=Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); });
        localStorage.setItem(keyName, key);
      }
      return key;
    } catch (_) {
      // Without persistent browser storage, a durable one-visit guarantee is not possible.
      return null;
    }
  }
  function renderVisitorPage() {
    const body = $('recentVisits'); if (!body) return;
    const pageSize = 25, total = state.visitorRows.length;
    const pages = Math.max(1, Math.ceil(total/pageSize));
    state.visitorPage = Math.min(state.visitorPage, pages-1);
    const rows = state.visitorRows.slice(state.visitorPage*pageSize, (state.visitorPage+1)*pageSize);
    body.replaceChildren();
    if (!rows.length) { const tr=document.createElement('tr'), td=document.createElement('td'); td.colSpan=4; td.className='visit-status'; td.textContent='Mbola tsy misy mpitsidika voarakitra.'; tr.append(td); body.append(tr); }
    rows.forEach((visit, index) => {
      const tr=document.createElement('tr');
      const number=document.createElement('td'); number.textContent=String(state.visitorPage*pageSize+index+1).padStart(2,'0');
      const deviceCell=document.createElement('td'), device=document.createElement('div'); device.className='visit-person';
      const avatar=document.createElement('span'); avatar.className='visit-avatar'; avatar.textContent=/Apple/i.test(visit.device_label||'')?'':/Samsung/i.test(visit.device_label||'')?'S':/Xiaomi/i.test(visit.device_label||'')?'X':'D';
      const details=document.createElement('span'); details.className='visit-person-copy'; const name=document.createElement('b'); name.textContent=visit.device_label || 'Appareil non identifié'; const sub=document.createElement('small'); sub.textContent='Visiteur anonyme · identifiant privé'; details.append(name,sub); device.append(avatar,details); deviceCell.append(device);
      const dateCell=document.createElement('td'); const date=document.createElement('time'); date.className='recent-visit-date'; date.dateTime=visit.visited_at; date.textContent=formatDate(visit.visited_at); dateCell.append(date);
      const statusCell=document.createElement('td'); const status=document.createElement('span'); status.className='visit-status-pill'; status.innerHTML='<i></i> Unique'; statusCell.append(status);
      tr.append(number,deviceCell,dateCell,statusCell); body.append(tr);
    });
    say('visitPageInfo', total ? `Affichage ${state.visitorPage*pageSize+1}–${Math.min((state.visitorPage+1)*pageSize,total)} sur ${total} visiteurs` : '0 visiteur');
    if ($('visitPrev')) $('visitPrev').disabled=state.visitorPage===0;
    if ($('visitNext')) $('visitNext').disabled=state.visitorPage>=pages-1;
    say('visitCount', total.toLocaleString('fr-FR')); say('visitorButtonCount', `(${total})`);
  }
  async function trackPublicVisit() {
    const tableBody = $('recentVisits'); const notice = $('visitNotice');
    if (!db) { if (tableBody) { tableBody.replaceChildren(); const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.className='visit-status';td.textContent='Compteur indisponible : vérifiez Supabase.';tr.append(td);tableBody.append(tr);} return; }
    try {
      const visitorKey = getVisitorKey();
      if (visitorKey) {
        const { error: insertError } = await db.from('public_page_visits').upsert({ visitor_key: visitorKey, device_label: await getDeviceBrand() }, { onConflict: 'visitor_key', ignoreDuplicates: true });
        if (insertError) throw insertError;
      }
      // Fetch every row in bounded pages so the visitor list is complete without one oversized request.
      let all = [], from = 0, chunk = 500;
      while (true) {
        const { data, error } = await db.from('public_page_visits').select('visitor_key,device_label,visited_at').order('visited_at',{ascending:false}).range(from,from+chunk-1);
        if (error) throw error;
        all = all.concat(data || []); if (!data || data.length < chunk) break; from += chunk;
      }
      state.visitorRows = all; state.visitorPage = 0; renderVisitorPage();
      if (notice) notice.textContent = 'Ny marika dia vinavinaina avy amin’ny navigateur. Tsy aseho ny anarana, e-mail na IP.';
    } catch (error) {
      say('visitCount','—'); say('visitorButtonCount','');
      if (tableBody) { tableBody.replaceChildren(); const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.className='visit-status';td.textContent='Tsy mandeha ny compteur. Alefaso aloha ny SQL ao amin’ny schema.sql, dia avereno ny pejy.';tr.append(td);tableBody.append(tr); }
      if (notice) notice.textContent='Jereo ny configuration Supabase sy ny policies amin’ny public_page_visits.';
      console.warn('StratX visit counter:', error?.message || error);
    }
  }

  async function init() {
    bind(); initDate();
    trackPublicVisit();
    window.addEventListener('popstate', syncRouteFromUrl);
    if (!db) { setStatus('Supabase indisponible',false); msg('authmsg','Impossible de charger Supabase. Vérifiez la connexion Internet ou la configuration de la bibliothèque.',true); return; }
    try {
      const { data, error } = await db.auth.getSession(); if(error) throw error; state.user=data.session?.user || null; authUI();
      if(state.user) { setStatus('Connecté'); await refresh(); syncRouteFromUrl(); } else { setStatus('En attente de connexion'); syncRouteFromUrl(); }
      db.auth.onAuthStateChange((event, session) => { state.user=session?.user || null; if(!state.user && $('displayName')) delete $('displayName').dataset.loaded; authUI(); if(state.user) { setStatus('Connecté'); if(event==='SIGNED_IN') { history.replaceState({}, '', '/accueil'); showPage('home', false); } if(event==='SIGNED_IN' || event==='INITIAL_SESSION' || event==='USER_UPDATED') setTimeout(() => refresh(),0); } else { setStatus('En attente de connexion'); state.posts=[]; state.sports=[]; state.games=[]; } });
    } catch(error) { setStatus('Erreur de connexion',false); msg('authmsg',friendlyError(error),true); console.error('StratX auth init:',error); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
