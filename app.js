(() => {
  'use strict';
  const SUPABASE_URL = 'https://pvqwpohypdioqkfysynz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg';
  const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  const state = { user: null, currentPage: 'home', activeGame: 'Aviator', gameSection: 'overview', games: [], posts: [], profile: {}, communityFilter: 'all', communityQuery: '', communitySort: 'newest', communityLiked: new Set(), communitySaved: new Set(), communityComments: {}, showGameHistory: false, premiumAccess: false, premiumAccessLoading: false };
  const gameInfo = {
    Aviator: { desc: 'Consignez les observations passées du jeu Aviator et consultez un résumé descriptif.', logo: '✈', cls: 'aviator-logo' },
    JetX: { desc: 'Un espace dédié pour garder un historique personnel des observations JetX.', logo: 'JX', cls: 'jetx-logo' },
    CosmoX: { desc: 'Centralisez les entrées historiques CosmoX dans un espace séparé.', logo: '✦', cls: 'cosmox-logo' }
  };
  const deterministicRandom = seedText => {
    let seed = 2166136261;
    for (let i = 0; i < seedText.length; i++) { seed ^= seedText.charCodeAt(i); seed = Math.imul(seed, 16777619); }
    return () => { seed += 0x6D2B79F5; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
    $('premiumShortcut')?.classList.toggle('hide', !logged);
    $('subscriptionShortcut')?.classList.toggle('hide', !logged);
    $('adminShortcut')?.classList.toggle('hide', !logged || state.user?.app_metadata?.role !== 'admin');
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
  let authMode = 'login';
  let signupStep = 1;
  let resetSent = false;
  // Recovery links lock the interface until a new password is saved.
  let recoveryMode = false;
  let recoverySaving = false;
  function lockRecoveryInterface(message) {
    if (!recoveryMode) return;
    $('auth')?.classList.remove('hide');
    $('app')?.classList.add('hide');
    $('logout')?.classList.add('hide');
    setAuthFlow('updatePassword');
    if (message) msg('authmsg', message);
    if (window.location.pathname !== '/mot-de-passe-oublie') history.replaceState({}, '', '/mot-de-passe-oublie');
  }
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
      '/inscription': { page: 'auth', authMode: 'signup' }, '/mot-de-passe-oublie': { page: 'auth', authMode: 'reset' },
      '/jeux': { page: 'games' }, '/communaute': { page: 'community' }, '/profil': { page: 'profile' }, '/premium': { page: 'premium' }, '/abonnement': { page: 'subscription' }, '/admin': { page: 'adminDashboard' }, '/notifications': { page: 'notifications' }, '/a-propos': { page: 'about' }
    };
    return { ...(fixed[path] || fixed['/']), path };
  }
  function routeForCurrentPage(id) {
    if (id === 'games') return `/${state.activeGame.toLowerCase()}${state.gameSection && state.gameSection !== 'overview' ? '/' + state.gameSection : ''}`;
    return ({ home: '/accueil', auth: '/connexion', community: '/communaute', profile: '/profil', premium: '/premium', subscription: '/abonnement', adminDashboard: '/admin', notifications: '/notifications', about: '/a-propos' })[id] || '/accueil';
  }
  function syncRouteFromUrl() {
    const route = parseRoute();
    if (recoveryMode) { lockRecoveryInterface('Créez et confirmez votre nouveau mot de passe pour continuer.'); return; }
    if (!state.user) {
      $('auth')?.classList.remove('hide'); $('app')?.classList.add('hide'); $('logout')?.classList.add('hide');
      if (route.page === 'auth') { if (route.authMode === 'signup') setAuthFlow('signup', 1); else if (route.authMode === 'reset') setAuthFlow('reset'); else setAuthFlow('login'); }
      return;
    }
    $('auth')?.classList.add('hide'); $('app')?.classList.remove('hide'); $('logout')?.classList.remove('hide');
    if (route.page === 'auth') { history.replaceState({}, '', '/accueil'); return showPage('home', false); }
    if (route.game) {
      state.activeGame = route.game;
      state.gameSection = route.section || 'overview';
      state.showGameHistory = state.gameSection === 'historique';
      document.querySelectorAll('.game-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.game === route.game));
    }
    showPage(route.page, false);
    if (route.page === 'auth' && route.authMode === 'reset') setAuthFlow('reset');
  }
  function showPage(id, updateUrl = true) {
    if (recoveryMode) { lockRecoveryInterface('La réinitialisation est obligatoire avant de pouvoir accéder à StratX.'); return; }
    if (!$(`${id}`) || !$(`${id}`).classList.contains('page')) return;
    state.currentPage = id;
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('hide', el.id !== id));
    document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === id));
    if (id === 'games') renderGame();
    if (id === 'profile') authUI();
    if (id === 'premium' || id === 'subscription') loadPremiumAccess();
    if (id === 'adminDashboard') { if (!isPremiumAdmin()) { showPage('home', updateUrl); return; } $('premiumAdminDashboard')?.classList.remove('hide'); $('premiumAdminPanel')?.classList.remove('hide'); loadPremiumPaymentRequests(); }
    if (id === 'notifications') loadNotifications();
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
      const [posts, games] = await Promise.all([
        queryTable('analyses', 'id,title,body,created_at,user_id,author_name'),
        queryTable('game_observations', 'id,game_name,multiplier,note,observed_at,created_at,user_id')
      ]);
      state.posts = posts; state.games = games; authUI();
      say('countPosts', posts.length); say('countGames', games.length);
      renderCommunity();
      renderGame(); setStatus('Connecté · synchronisé');
    } catch (error) { setStatus('Erreur de synchronisation', false); console.error('StratX refresh:', error); ['posts','gameslist'].forEach(id => { const el=$(id); if(el) el.textContent=friendlyError(error); }); }
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
    say('gamename', name); $('gamename').value = name;
    say('gameBannerTitle', name); say('gameBannerDesc', info.desc); say('historyTitle', `Historique ${name}`);
    const logo = $('gameBannerLogo'); if (logo) { logo.className = `game-banner-logo ${info.cls}`; logo.textContent = info.logo; }
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
    const addPanel = $('gameform')?.closest('.surface');
    const resultsPanel = $('analysisResult')?.closest('.analysis-result-panel');
    const historyPanel = $('historyTitle')?.closest('.surface');
    const panels = { statistiques: statsPanel, ajouter: addPanel, resultats: resultsPanel, historique: historyPanel };
    Object.entries(panels).forEach(([key, panel]) => { if (panel) panel.classList.toggle('hide', section !== 'overview' && section !== key); });
    document.querySelectorAll('[data-game-section]').forEach(btn => {
      const active = btn.dataset.gameSection === section;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    if (section === 'historique') { state.showGameHistory = true; if (history) history.classList.remove('hide'); }
    renderList('gameslist', rows, r => ({ title: r.multiplier == null ? 'Observation sans valeur numérique' : `Valeur observée : ${Number(r.multiplier).toFixed(2)}x`, body: '', date: r.observed_at || r.created_at, eyebrow: name.toUpperCase() }), `Aucune observation ${name}`, `Les entrées que vous ajouterez à ${name} seront affichées ici.`);
  }
  function setAuthFlow(mode, step = 1) {
    authMode = mode; signupStep = step; resetSent = false;
    const signup = mode === 'signup', reset = mode === 'reset', update = mode === 'updatePassword';
    $('signupNameWrap')?.classList.toggle('hide', !signup || step !== 1);
    // The stylesheet keeps this block hidden unless signup-mode is present.
    $('signupNameWrap')?.classList.toggle('signup-mode', signup && step === 1);
    $('emailField')?.classList.toggle('hide', update || (signup && step !== 1));
    $('passwordField')?.classList.toggle('hide', reset || (signup && step !== 2));
    $('confirmPasswordField')?.classList.toggle('hide', !(signup && step === 2) && !update);
    $('confirmPassword')?.toggleAttribute('required', (signup && step === 2) || update);
    $('authSteps')?.classList.toggle('hide', !signup);
    $('authStepOne')?.classList.toggle('active', step === 1);
    $('authStepTwo')?.classList.toggle('active', step === 2);
    $('backAuthStep')?.classList.toggle('hide', !(signup && step === 2));
    $('backToLogin')?.classList.toggle('hide', mode === 'login' || update || recoveryMode);
    $('updatePassword')?.classList.toggle('hide', !update);
    $('login').classList.toggle('hide', signup || reset || update);
    $('signup').classList.toggle('hide', reset || update);
    $('resetPassword').classList.toggle('hide', signup || update);
    $('signupName').required = signup && step === 1;
    $('email').required = !signup || step === 1;
    $('password').required = !reset && (!signup || step === 2 || update);
    $('password').autocomplete = (signup || update) ? 'new-password' : 'current-password';
    if (update && $('confirmPassword')) { $('confirmPassword').autocomplete = 'new-password'; $('confirmPassword').placeholder = 'Retapez le nouveau mot de passe'; }
    $('signup').innerHTML = signup ? (step === 1 ? 'Continuer <span>→</span>' : 'Créer mon compte <span>→</span>') : 'Créer mon compte';
    $('resetPassword').textContent = reset ? (resetSent ? 'Renvoyer le lien' : 'Envoyer le lien de réinitialisation') : 'Mot de passe oublié ?';
    $('authIntro').textContent = signup ? (step === 1 ? 'Étape 1 sur 2 — renseignez votre identité et votre e-mail.' : 'Étape 2 sur 2 — choisissez un mot de passe sécurisé.') : reset ? 'Étape 1 : renseignez votre e-mail. Étape 2 : ouvrez le lien reçu pour choisir un nouveau mot de passe.' : update ? 'Dernière étape : choisissez un nouveau mot de passe sécurisé.' : 'Connectez-vous pour accéder à votre tableau de bord.';
    if (signup && step === 1) $('signupName')?.focus();
    else if ((signup && step === 2) || update) $('password')?.focus();
  }
  async function runAuth(action) {
    if (!db) { msg('authmsg', 'Le service Supabase ne se charge pas. Vérifiez votre connexion et les clés de configuration.', true); return; }
    const email = $('email')?.value.trim() || '';
    const password = $('password')?.value || '';
    if (action !== 'updatePassword' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) { msg('authmsg', 'Saisissez une adresse e-mail valide.', true); $('email')?.focus(); return; }
    if (action !== 'reset' && password.length < 8) { msg('authmsg', 'Choisissez un mot de passe d’au moins 8 caractères.', true); $('password')?.focus(); return; }
    if (action === 'updatePassword' && password !== ($('confirmPassword')?.value || '')) { msg('authmsg', 'Les deux mots de passe ne correspondent pas.', true); $('confirmPassword')?.focus(); return; }
    if (action === 'updatePassword' && recoverySaving) return;
    if (action === 'signup') {
      if (password !== ($('confirmPassword')?.value || '')) { msg('authmsg', 'Les deux mots de passe ne correspondent pas.', true); $('confirmPassword')?.focus(); return; }
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
        const redirectUrl = new URL('/connexion', window.location.origin).href;
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { display_name: displayName, full_name: displayName, phone: ($('signupPhone')?.value || '').trim() || null } }
        });
        if (error) throw error;
        if (data.session) {
          state.user = data.user || data.session.user; authUI(); showPage('home'); await refresh();
          msg('authmsg', 'Compte créé et connecté. Bienvenue sur StratX.');
        } else {
          msg('authmsg', 'Compte enregistré ! Ouvrez le message de confirmation envoyé par Supabase (vérifiez aussi les spams), cliquez sur le lien, puis revenez vous connecter. Si aucun e-mail n’arrive, vérifiez la configuration Email / SMTP de Supabase.');
        }
      } else if (action === 'updatePassword') {
        if (!recoveryMode) throw new Error('Ouvrez d’abord le lien de réinitialisation reçu par e-mail.');
        recoverySaving = true;
        $('updatePassword').disabled = true;
        const { data, error } = await db.auth.updateUser({ password });
        if (error) throw error;
        // Supabase revokes refresh sessions for other devices while keeping this recovery session.
        const { error: revokeError } = await db.auth.signOut({ scope: 'others' });
        if (revokeError) throw new Error('Le mot de passe a été modifié, mais Supabase n’a pas confirmé la fermeture des autres sessions. Réessayez ou contactez le support.');
        recoveryMode = false;
        recoverySaving = false;
        state.user = data?.user || state.user;
        history.replaceState({}, '', '/accueil');
        authUI();
        $('auth')?.classList.add('hide'); $('app')?.classList.remove('hide'); $('logout')?.classList.remove('hide');
        showPage('home', false);
        await refresh();
        msg('authmsg', 'Mot de passe modifié. Les autres sessions ont été déconnectées et vous pouvez maintenant utiliser StratX.');
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/mot-de-passe-oublie' });
        if (error) throw error;
        resetSent = true; $('resetPassword').textContent = 'Renvoyer le lien'; msg('authmsg', 'Étape 2 : consultez votre boîte e-mail et ouvrez le lien sécurisé de Supabase. Vérifiez aussi les courriers indésirables.');
      }
    } catch (error) { msg('authmsg', friendlyError(error), true); if (recoveryMode) lockRecoveryInterface('La réinitialisation n’est pas terminée. Corrigez le problème puis réessayez.'); }
    finally { recoverySaving = false; ['login','signup','resetPassword','updatePassword'].forEach(id => { const b = $(id); if (b) b.disabled = false; }); }
  }
  async function signOut() { if (!db) return; const { error } = await db.auth.signOut(); if (error) msg('profilemsg', friendlyError(error), true); }
  function bind() {
    document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
    document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.goto)));
    document.querySelectorAll('.game-tab').forEach(btn => btn.addEventListener('click', () => { state.activeGame = btn.dataset.game; state.gameSection = 'overview'; state.showGameHistory = false; document.querySelectorAll('.game-tab').forEach(tab => tab.classList.toggle('active', tab === btn)); history.pushState({}, '', routeForCurrentPage('games')); renderGame(); }));
    document.querySelectorAll('[data-game-section]').forEach(btn => btn.addEventListener('click', () => { const next = btn.dataset.gameSection; if (!['overview', ...gameRouteSections].includes(next)) return; state.gameSection = next; state.showGameHistory = next === 'historique'; history.pushState({}, '', routeForCurrentPage('games')); renderGame(); }));
    $('toggleGameHistory')?.addEventListener('click', () => { state.showGameHistory = !state.showGameHistory; state.gameSection = state.showGameHistory ? 'historique' : 'overview'; history.pushState({}, '', routeForCurrentPage('games')); renderGame(); });
    $('login').addEventListener('click', () => { history.pushState({}, '', '/connexion'); setAuthFlow('login'); runAuth('login'); });
    $('signup').addEventListener('click', () => {
      if (authMode !== 'signup') { history.pushState({}, '', '/inscription'); setAuthFlow('signup', 1); msg('authmsg', 'Étape 1 : saisissez votre nom affiché et votre adresse e-mail.'); return; }
      if (signupStep === 1) {
        const name = $('signupName').value.trim(), email = $('email').value.trim();
        if (name.length < 2) { msg('authmsg', 'Saisissez un nom affiché valide.', true); $('signupName').focus(); return; }
        const phone = $('signupPhone')?.value.trim() || '';
        if (phone && !/^[+0-9() .-]{7,24}$/.test(phone)) { msg('authmsg', 'Vérifiez le numéro de téléphone ou laissez ce champ vide.', true); $('signupPhone').focus(); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('authmsg', 'Saisissez une adresse e-mail valide.', true); $('email').focus(); return; }
        setAuthFlow('signup', 2); msg('authmsg', 'Étape 2 : créez un mot de passe d’au moins 6 caractères.'); return;
      }
      runAuth('signup');
    });
    $('resetPassword').addEventListener('click', () => {
      if (authMode !== 'reset') { history.pushState({}, '', '/mot-de-passe-oublie'); setAuthFlow('reset'); msg('authmsg', 'Étape 1 : saisissez l’adresse e-mail de votre compte.'); return; }
      runAuth('reset');
    });
    $('backAuthStep')?.addEventListener('click', () => { setAuthFlow('signup', 1); msg('authmsg', 'Modifiez vos informations si nécessaire.'); });
    $('backToLogin')?.addEventListener('click', () => { history.pushState({}, '', '/connexion'); setAuthFlow('login'); msg('authmsg', 'Vous pouvez maintenant vous connecter.'); });
    $('updatePassword')?.addEventListener('click', () => runAuth('updatePassword'));
    $('confirmPassword')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runAuth('signup'); } });
    $('password').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runAuth(authMode === 'updatePassword' ? 'updatePassword' : authMode === 'signup' ? 'signup' : 'login'); } });
    $('confirmPassword')?.addEventListener('keydown', e => { if (e.key === 'Enter' && authMode === 'updatePassword') { e.preventDefault(); runAuth('updatePassword'); } });
    $('togglePassword').addEventListener('click', () => { const p=$('password'); p.type = p.type === 'password' ? 'text' : 'password'; });
    $('logout').addEventListener('click', signOut); $('profileLogout').addEventListener('click', signOut); $('refresh').addEventListener('click', refresh);
    $('gameform').addEventListener('submit', async e => {
      e.preventDefault(); if (!state.user) return;
      const raw=$('multiplier').value; const observed = $('observedAt').value ? new Date($('observedAt').value).toISOString() : new Date().toISOString(); const btn=e.submitter; if(btn) btn.disabled=true;
      try { const { error } = await db.from('game_observations').insert({ user_id: state.user.id, game_name: state.activeGame, multiplier: raw === '' ? null : Number(raw), note: null, observed_at: observed }); if(error) throw error; e.target.reset(); $('gamename').value=state.activeGame; msg('gamemsg',`Observation ${state.activeGame} enregistrée.`); await refresh(); }
      catch(error) { msg('gamemsg',friendlyError(error),true); } finally { if(btn) btn.disabled=false; }
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
  const isPremiumAdmin = () => state.user?.app_metadata?.role === 'admin';
  async function loadPremiumPaymentRequests() {
    const panel = $('premiumAdminPanel'); const list = $('premiumAdminRequests');
    if (!panel || !list || !isPremiumAdmin()) return;
    panel.classList.remove('hide');
    $('premiumAdminDashboard')?.classList.remove('hide');
    list.textContent = 'Chargement des demandes…';
    try {
      const [pendingResult, activeResult, expiredResult] = await Promise.all([
        db.from('premium_payment_requests').select('id,user_id,payment_method,transaction_ref,amount_ariary,note,status,created_at,duration_days,plan_code').eq('status','pending').order('created_at',{ascending:true}),
        db.from('premium_subscriptions').select('user_id',{count:'exact',head:true}).eq('status','active').gt('expires_at',new Date().toISOString()),
        db.from('premium_subscriptions').select('user_id',{count:'exact',head:true}).or(`status.eq.expired,expires_at.lte.${new Date().toISOString()}`)
      ]);
      const data = pendingResult.data;
      const error = pendingResult.error || activeResult.error || expiredResult.error;
      if ($('premiumPendingCount')) $('premiumPendingCount').textContent = pendingResult.count ?? data?.length ?? '—';
      if ($('premiumActiveCount')) $('premiumActiveCount').textContent = activeResult.count ?? '—';
      if ($('premiumExpiredCount')) $('premiumExpiredCount').textContent = expiredResult.count ?? '—';
      if (error) throw error;
      list.replaceChildren();
      if (!data?.length) { list.textContent = 'Aucune demande en attente.'; return; }
      data.forEach(req => {
        const card = document.createElement('article'); card.className = 'premium-admin-request';
        const details = document.createElement('div');
        const title = document.createElement('h4'); title.textContent = `${req.payment_method} · ${Number(req.amount_ariary).toLocaleString('fr-FR')} Ar`;
        const plan = document.createElement('p'); plan.textContent = `Formule demandée : ${Number(req.duration_days || 30)} jours (${req.plan_code || 'monthly'})`; 
        const body = document.createElement('p'); body.textContent = `Réf. : ${req.transaction_ref} · User ID : ${req.user_id}`;
        const note = document.createElement('small'); note.textContent = req.note || 'Aucune note';
        const date = document.createElement('small'); date.textContent = `Envoyée le ${formatDate(req.created_at)}`;
        details.append(title,plan,body,note,date);
        const actions = document.createElement('div'); actions.className='premium-admin-actions';
        const approve = document.createElement('button'); approve.type='button'; approve.className='btn btn-primary'; approve.textContent=`Paiement vérifié · Activer ${Number(req.duration_days || 30)} jours`;
        approve.addEventListener('click',()=>reviewPremiumRequest(req,'approved'));
        const reject = document.createElement('button'); reject.type='button'; reject.className='btn btn-outline'; reject.textContent='Refuser'; reject.addEventListener('click',()=>reviewPremiumRequest(req,'rejected'));
        actions.append(approve,reject); card.append(details,actions); list.append(card);
      });
    } catch (error) { list.textContent = `Impossible de charger les demandes : ${friendlyError(error)}`; }
  }
  async function reviewPremiumRequest(req, decision) {
    if (!isPremiumAdmin() || !db) return;
    const statusMsg = $('premiumAdminMessage');
    if (decision === 'approved' && !confirm(`Confirmez-vous avoir vérifié le paiement ${req.transaction_ref} de ${Number(req.amount_ariary).toLocaleString('fr-FR')} Ar ? Cela activera ${Number(req.duration_days || 30)} jours de Premium.`)) return;
    try {
      const { error } = await db.rpc('stratx_review_premium_request', { p_request_id: Number(req.id), p_decision: decision });
      if (error) throw error;
      if (statusMsg) statusMsg.textContent = decision === 'approved' ? `Paiement validé : accès Premium activé pour ${Number(req.duration_days || 30)} jours. Une notification a été créée pour le membre.` : 'Demande refusée. Une notification a été créée pour le membre.';
      await loadPremiumPaymentRequests();
      if (req.user_id === state.user.id) await loadPremiumAccess();
    } catch (error) { if(statusMsg) statusMsg.textContent = `Erreur : ${friendlyError(error)}. Vérifiez que premium_access.sql a été réexécuté.`; }
  }
  async function loadMyPremiumRequests() {
    if (!db || !state.user) return;
    try {
      const { data, error } = await db.from('premium_payment_requests').select('payment_method,transaction_ref,amount_ariary,status,created_at,admin_note').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(5);
      if (error) throw error;
      const msgEl = $('premiumRequestMessage');
      if (data?.length && msgEl) msgEl.textContent = 'Dernière demande : ' + data.map(r => `${r.status} (${r.transaction_ref})`).join(' · ');
    } catch (error) { console.warn('Premium request history:', error); }
  }

  async function loadPremiumAccess() {
    const panel = $('premiumCalculator');
    const gate = $('premiumAccessGate');
    const lock = $('premiumLocked');
    const message = $('premiumLockMessage');
    const run = $('premiumRun');
    if (!panel || !gate || !lock) return false;
    state.premiumAccess = false;
    state.premiumAccessLoading = true;
    panel.classList.add('hide');
    gate.classList.remove('hide');
    if (run) run.disabled = true;
    if (message) message.textContent = 'Vérification sécurisée de votre statut Premium…';
    if (!db || !state.user) {
      if (message) message.textContent = 'Connectez-vous à votre compte, puis vérifiez si votre accès Premium est actif.';
      state.premiumAccessLoading = false;
      return false;
    }
    try {
      // Admin is identified only by trusted Supabase app_metadata, never editable user_metadata.
      if (isPremiumAdmin()) {
        $('premiumOfferCard')?.classList.add('hide');
        $('premiumRequestForm')?.classList.add('hide');
        $('premiumMemberDashboard')?.classList.add('hide');
        state.premiumAccess = true;
        panel.classList.remove('hide', 'premium-locked');
        gate.classList.add('hide');
        if (message) message.textContent = 'Accès administrateur illimité activé.';
        if (run) run.disabled = false;
        const adminDashboard = $('premiumAdminDashboard');
        if (adminDashboard) adminDashboard.classList.remove('hide');
      } else {
      $('premiumOfferCard')?.classList.remove('hide');
      $('premiumRequestForm')?.classList.remove('hide');
      $('premiumMemberDashboard')?.classList.remove('hide');
      // Regular access is granted only by a server-managed subscription row.
      const { data, error } = await db.from('premium_subscriptions').select('status,expires_at').eq('user_id', state.user.id).maybeSingle();
      if (error) throw error;
      const expires = data?.expires_at ? new Date(data.expires_at).getTime() : null;
      state.premiumAccess = !!data && data.status === 'active' && Number.isFinite(expires) && expires > Date.now();
      const memberDash = $('premiumMemberDashboard'); if (memberDash) memberDash.classList.remove('hide');
      const remaining = state.premiumAccess ? Math.max(0, Math.ceil((expires-Date.now())/(24*60*60*1000))) : 0;
      say('memberPremiumState', state.premiumAccess ? 'ACTIF' : (data?.status === 'active' ? 'EXPIRÉ' : 'INACTIF'));
      say('memberPremiumDays', String(remaining));
      say('memberPremiumExpiry', expires ? new Date(expires).toLocaleDateString('fr-FR') : '—');
      say('memberPremiumBadge', state.premiumAccess ? 'MEMBRE ACTIF' : 'ACCÈS REQUIS');
      say('memberPremiumStatus', state.premiumAccess ? 'Votre abonnement est actif. Le calculateur Premium est accessible.' : 'Aucun abonnement actif. Envoyez une demande après votre paiement.');
      await loadMyPremiumRequests();
      if (state.premiumAccess) {
        panel.classList.remove('hide', 'premium-locked');
        gate.classList.add('hide');
        if (message) message.textContent = 'Accès confirmé. Votre espace Premium est déverrouillé.';
        if (run) run.disabled = false;
      } else {
        panel.classList.add('hide');
        gate.classList.remove('hide');
        if (message) message.textContent = data?.status === 'active' ? 'Votre accès Premium a expiré. Contactez le responsable pour le renouveler.' : 'Votre compte ne possède pas encore d’accès Premium actif. Le calculateur Premium n’est pas affiché.';
        if (run) run.disabled = true;
      }
      }
    } catch (error) {
      state.premiumAccess = false;
      panel.classList.add('hide');
      gate.classList.remove('hide');
      if (message) message.textContent = 'Impossible de valider l’accès Premium. Le calculateur reste masqué. Vérifiez que la table premium_subscriptions est installée dans Supabase.';
      if (run) run.disabled = true;
      console.warn('StratX Premium access check:', error);
    } finally {
      state.premiumAccessLoading = false;
    }
    await loadMyPremiumRequests();
    await loadPremiumPaymentRequests();
    return state.premiumAccess;
  }

  function bindCalculator() {
    const button = $('runCalc'); if (!button) return;
    const panel = $('calculatorSurface');
    document.querySelectorAll('[data-mode]').forEach(card => card.addEventListener('click', () => {
      const mode = card.dataset.mode;
      $('calcGame').value = mode;
      $('gamename').value = mode;
      if (panel) panel.classList.remove('hide');
      document.querySelectorAll('[data-mode]').forEach(item => { const active = item === card; item.classList.toggle('active', active); item.setAttribute('aria-pressed', active ? 'true' : 'false'); });
      if (panel) { panel.classList.remove('mode-aviator','mode-jetx','mode-cosmox','mode-premium'); panel.classList.add(`mode-${mode.toLowerCase()}`); }
      const heading = document.querySelector('.calculator-surface .surface-head h3'); if (heading) heading.textContent = `${mode} · Calculateur`; 
      const results = $('calcResults'); if (results) results.innerHTML = '<p class="subtle">Saisissez l’heure et le coefficient observé, puis lancez le calcul.</p>';
    }));
    const addSeconds = (clock, seconds) => { const parts = clock.split(':').map(Number); let total=(parts[0]||0)*3600+(parts[1]||0)*60+(parts[2]||0)+seconds; total=((total%86400)+86400)%86400; return [Math.floor(total/3600),Math.floor(total%3600/60),total%60].map(n=>String(n).padStart(2,'0')).join(':'); };
    button.addEventListener('click', () => {
      const game=$('calcGame').value, clock=$('calcTime').value, coeff=Number($('calcCoeff').value), out=$('calcResults');
      if (!clock) { out.innerHTML='<p class="message">Saisissez ou dictez l’heure de départ.</p>'; $('calcTime').focus(); return; }
      if (!document.querySelector(`[data-mode="${game}"]`)?.classList.contains('active')) { out.innerHTML='<p class="message">Sélectionnez d’abord Aviator, CosmoX ou JetX.</p>'; return; }
      if (!Number.isFinite(coeff) || coeff < 1) { out.innerHTML='<p class="message">Saisissez un coefficient valide supérieur ou égal à 1.00x.</p>'; return; }
      const rng = deterministicRandom(`${game}|${clock}|${coeff.toFixed(2)}`);
      let rules=[];
      if(game==='Aviator') { if(coeff>=2 && coeff<5) rules=[{m:2,s:Math.floor(10+rng()*51),a:2.5,b:4.99},{m:4,s:Math.floor(5+rng()*56),a:2.5,b:4.99}]; else if(coeff>=5 && coeff<=50) rules=[{m:3,s:Math.floor(5+rng()*56),a:3,b:9.99},{m:4,s:Math.floor(10+rng()*50),a:2.5,b:5},{m:5,s:Math.floor(5+rng()*56),a:5,b:15}]; }
      if(game==='JetX') { const m=coeff<2?1:coeff<3?2:coeff<4?3:coeff<5?4:3; const range=coeff<2?[1.2,2.1]:coeff<3?[1.7,2.9]:coeff<4?[2.2,3.5]:coeff<5?[3.1,4.9]:[2.5,10]; rules=[{m,s:Math.floor(rng()*60),a:range[0],b:range[1]}]; }
      if(game==='CosmoX') { if(coeff>=3 && coeff<5) rules=[{m:1,s:57,a:2.5,b:5}]; else if(coeff>=5 && coeff<=10) rules=[{m:1,s:48,a:3.5,b:8},{m:3,s:5,a:3.5,b:20}]; }
      if(!rules.length) { out.innerHTML='<p class="message">Aucun scénario défini pour ce coefficient dans ce mode.</p>'; return; }
      out.innerHTML=rules.map(r=>{const value=r.a+rng()*(r.b-r.a);const result={time:addSeconds(clock,r.m*60+r.s),coefficient:value.toFixed(2)};const indices=()=>Math.floor(35+rng()*46);return `<article class="calc-row calc-row-${game.toLowerCase()}"><div class="calc-result-main"><small class="eyebrow">SCÉNARIO SIMULÉ · ${game.toUpperCase()}</small><h3>${result.time} <span>·</span> ${result.coefficient}x</h3><p>Heure estimée dans ce scénario illustratif</p></div><div class="calc-metrics"><span><small>Stabilité*</small><b>${indices()}%</b></span><span><small>Risque*</small><b>${indices()}%</b></span><span><small>Indice*</small><b>${indices()}%</b></span></div></article>`}).join('')+'<p class="subtle">* Indicateurs illustratifs, non validés statistiquement. Même jeu, heure et coefficient = mêmes résultats affichés. Cette stabilité technique ne prédit pas le résultat réel du jeu.</p>';
    });
  }
    const premiumButton = $('premiumRun');
    if (premiumButton) premiumButton.addEventListener('click', async () => {
      if (state.premiumAccessLoading || !state.premiumAccess) { await loadPremiumAccess(); if (!state.premiumAccess) { const lockMessage=$('premiumLockMessage'); if (lockMessage) lockMessage.textContent='Accès refusé : activez votre abonnement Premium avant tout calcul.'; return; } }
      const clock=$('premiumTime').value, coeff=Number($('premiumCoeff').value), out=$('premiumResults');
      if (!clock) { out.innerHTML='<p class="message">Saisissez ou dictez l’heure de départ.</p>'; $('premiumTime').focus(); return; }
      if (!Number.isFinite(coeff) || coeff < 1) { out.innerHTML='<p class="message">Saisissez un coefficient valide supérieur ou égal à 1.00x.</p>'; return; }
      const rng=deterministicRandom(`Premium|${clock}|${coeff.toFixed(2)}`);
      let rule=null;
      if(coeff>=1 && coeff<5) rule={m:2,s:Math.floor(rng()*60),a:1.2,b:4.99};
      else if(coeff>=5 && coeff<10) rule={m:4,s:8,a:4,b:20};
      else if(coeff>=10 && coeff<=50) rule={m:8,s:38,a:3,b:15};
      else if(coeff>50) rule={m:[3,5,7,9][Math.floor(rng()*4)],s:22,a:4.5,b:40};
      if(!rule){out.innerHTML='<p class="message">Saisissez un coefficient valide supérieur ou égal à 1.00x.</p>';return;}
      const total=(Number(clock.slice(0,2)||0)*3600+Number(clock.slice(3,5)||0)*60+Number(clock.slice(6,8)||0)+rule.m*60+rule.s)%86400;
      const time=[Math.floor(total/3600),Math.floor(total%3600/60),total%60].map(n=>String(n).padStart(2,'0')).join(':');
      const value=(rule.a+rng()*(rule.b-rule.a)).toFixed(2);
      out.innerHTML=`<article class="calc-row calc-row-premium"><div class="calc-result-main"><small class="eyebrow">SCÉNARIO THÉORIQUE · PREMIUM</small><h3>${time} <span>·</span> ${value}x</h3><p>Exemple généré par le modèle local, pas une prédiction d’un tour réel.</p></div><div class="calc-metrics"><span><small>Données live</small><b>Non</b></span><span><small>Validation historique</small><b>Non</b></span><span><small>Garantie</small><b>Aucune</b></span></div></article><p class="subtle">Transparence : ce calculateur ne reçoit pas les données internes des jeux et n’a pas été validé pour prédire les coefficients futurs. Le résultat ne constitue pas un conseil de mise ni une garantie de gain.</p>`;
    });

  // Multilingual voice entry. Actual language support depends on the browser speech service.
  const normalizeSpeech = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/-/g, ' ').replace(/[^\p{L}\p{N}.,\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const speechWords = {
    zero:0, oh:0, nought:0, nil:0, un:1, une:1, one:1, uno:1, uma:1, um:1, ein:1, eins:1, uno:1, una:1,
    deux:2, two:2, dos:2, duas:2, dois:2, zwei:2, due:2,
    trois:3, three:3, tres:3, três:3, drei:3, tre:3,
    quatre:4, four:4, cuatro:4, quattro:4, vier:4,
    cinq:5, five:5, cinco:5, fünf:5, cinque:5,
    six:6, seis:6, sechs:6, sei:6,
    sept:7, seven:7, siete:7, sete:7, sieben:7, sette:7,
    huit:8, eight:8, ocho:8, oito:8, acht:8, otto:8,
    neuf:9, nine:9, nueve:9, nove:9, neun:9,
    dix:10, ten:10, diez:10, dez:10, zehn:10, dieci:10,
    onze:11, eleven:11, once:11, undici:11, elf:11,
    douze:12, twelve:12, doce:12, zwölf:12, dodici:12,
    treize:13, thirteen:13, trece:13, dreizehn:13, tredici:13,
    quatorze:14, fourteen:14, catorce:14, vierzehn:14, quattordici:14,
    quinze:15, fifteen:15, quince:15, fünfzehn:15, quindici:15,
    seize:16, sixteen:16, dieciseis:16, dezesseis:16, sechzehn:16, sedici:16,
    dixsept:17, seventeen:17, diecisiete:17, dezessete:17, siebzehn:17, diciassette:17,
    dixhuit:18, eighteen:18, dieciocho:18, dezoito:18, achtzehn:18, diciotto:18,
    dixneuf:19, nineteen:19, diecinueve:19, dezenove:19, neunzehn:19, diciannove:19,
    vingt:20, twenty:20, veinte:20, vinte:20, zwanzig:20, venti:20,
    trente:30, thirty:30, treinta:30, trinta:30, dreissig:30, dreißig:30, trenta:30,
    quarante:40, forty:40, cuarenta:40, quarenta:40, vierzig:40, quaranta:40,
    cinquante:50, fifty:50, cincuenta:50, cinquenta:50, fünfzig:50, cinquanta:50,
    soixante:60, sixty:60, sesenta:60, sessenta:60, sechzig:60, sessanta:60,
    soixantedix:70, seventy:70, setenta:70, siebzig:70, settanta:70,
    quatrevingt:80, eighty:80, ochenta:80, oitenta:80, achtzig:80, ottanta:80,
    quatrevingtdix:90, ninety:90, noventa:90, neunzig:90, novanta:90,
    cent:100, hundred:100, cien:100, cento:100, hundert:100
  };
  const parseSpokenNumber = raw => {
    const clean = normalizeSpeech(raw).replace(/\b(and|et|y|e|und)\b/g, ' ').trim();
    const digit = clean.match(/^\d+(?:[.,]\d+)?$/);
    if (digit) return Number(digit[0].replace(',', '.'));
    // Common Malagasy forms for clock values.
    const mg = clean.replace(/\biraika ambin ny folo\b/g,'11').replace(/\broa ambin ny folo\b/g,'12').replace(/\btelo ambin ny folo\b/g,'13').replace(/\befatra ambin ny folo\b/g,'14').replace(/\bdimy ambin ny folo\b/g,'15').replace(/\benina ambin ny folo\b/g,'16').replace(/\bfito ambin ny folo\b/g,'17').replace(/\bvalo ambin ny folo\b/g,'18').replace(/\bsivy ambin ny folo\b/g,'19').replace(/\broa polo\b/g,'20').replace(/\btelo polo\b/g,'30').replace(/\befatra polo\b/g,'40').replace(/\bdimy polo\b/g,'50').replace(/\benina polo\b/g,'60');
    if (mg !== clean && /^\d+$/.test(mg)) return Number(mg);
    if (/^\d+(?:\s+\d+)+$/.test(clean)) return Number(clean.split(/\s+/).join(''));
    let total = 0, current = 0, found = false;
    for (const token0 of clean.split(/\s+/)) {
      const token = token0.replace(/[^a-z0-9]/g,'');
      if (!token) continue;
      if (/^\d+$/.test(token)) { current += Number(token); found = true; continue; }
      if (Object.prototype.hasOwnProperty.call(speechWords, token)) {
        const n = speechWords[token]; found = true;
        if (n >= 100) { current = (current || 1) * n; total += current; current = 0; }
        else if (n >= 20) current += n;
        else current += n;
      }
    }
    return found ? total + current : NaN;
  };
  const parseDecimalSpeech = raw => {
    const clean = normalizeSpeech(raw);
    const numeric = clean.match(/(\d+)\s*[,.]\s*(\d+)/);
    if (numeric) return Number(numeric[1] + '.' + numeric[2]);
    const sep = /\b(virgule|point|comma|decimal|dot|komma|coma|virgula|virgola|punto|comma|virgule)\b/;
    const parts = clean.split(sep);
    if (parts.length >= 3) {
      const left = parseSpokenNumber(parts[0]);
      const rightPhrase = parts.slice(2).join(' ');
      const digitWords = rightPhrase.split(/\s+/).filter(Boolean).map(w => w.replace(/[^a-z0-9]/g,''));
      const singleDigits = digitWords.length && digitWords.every(w => Object.prototype.hasOwnProperty.call(speechWords,w) && speechWords[w] >= 0 && speechWords[w] <= 9);
      const right = singleDigits ? Number(digitWords.map(w => speechWords[w]).join('')) : parseSpokenNumber(rightPhrase);
      if (Number.isFinite(left) && Number.isFinite(right)) return Number(`${Math.trunc(left)}.${String(Math.trunc(right)).padStart(2,'0')}`);
    }
    const plain = clean.replace(/\bx\b/g,'').trim();
    if (/^\d+(?:[.,]\d+)?$/.test(plain)) return Number(plain.replace(',','.'));
    return parseSpokenNumber(plain);
  };
  const parseTimeSpeech = raw => {
    const clean = normalizeSpeech(raw);
    const nums = clean.match(/\d+/g);
    if (nums && nums.length >= 2) return [Number(nums[0]),Number(nums[1]),Number(nums[2] || 0)];
    const unitPattern = /^(.*?)\s*(?:hours?|hrs?|heures?|hora|horas|ore|stunden|ora|ora|saacada|ساعة|ساعات)\b\s*(.*?)\s*(?:minutes?|mins?|minutos?|minuti|minuten|minitra|دقائق?)\b(?:\s*(.*?)\s*(?:seconds?|secs?|segundos?|secondi|sekunden|segondra|ثواني?)\b)?/i;
    const m = clean.match(unitPattern);
    if (m) return [parseSpokenNumber(m[1]),parseSpokenNumber(m[2]),m[3] ? parseSpokenNumber(m[3]) : 0];
    const parts = clean.split(/[,;:]+/).map(x=>x.trim()).filter(Boolean);
    if (parts.length >= 2) return [parseSpokenNumber(parts[0]),parseSpokenNumber(parts[1]),parts[2] ? parseSpokenNumber(parts[2]) : 0];
    return null;
  };
  document.querySelectorAll('[data-voice-target]').forEach(button => button.addEventListener('click', () => {
    const target = $(button.dataset.voiceTarget);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!target) return;
    if (!SpeechRecognition) {
      const out = button.closest('.calculator-surface')?.querySelector('.calc-results');
      const message = 'La saisie vocale n’est pas prise en charge par ce navigateur. Essayez Chrome et autorisez le microphone.';
      if (out) out.innerHTML = `<p class="message">${message}</p>`; else alert(message);
      return;
    }
    const surface = button.closest('.calculator-surface');
    const languageSelect = surface?.querySelector('.voice-language');
    const recognition = new SpeechRecognition();
    const requestedLanguage = languageSelect?.value || 'fr-FR';
    recognition.lang = requestedLanguage === 'auto' ? (navigator.language || 'fr-FR') : requestedLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;
    button.classList.add('listening');
    button.disabled = true;
    recognition.onresult = event => {
      let assigned = false;
      let heard = '';
      // Read all fresh results, including interim hypotheses, so the field fills while the user is speaking.
      for (let i = event.resultIndex || 0; i < event.results.length; i++) {
        const result = event.results[i];
        const alternatives = Array.from(result || []).map(item => String(item.transcript || '').trim()).filter(Boolean);
        for (const spoken of alternatives) {
          heard = spoken;
          if (target.type === 'time') {
            const parts = parseTimeSpeech(spoken);
            if (parts && parts.every(Number.isFinite) && parts[0] >= 0 && parts[0] <= 23 && parts[1] >= 0 && parts[1] <= 59 && parts[2] >= 0 && parts[2] <= 59) {
              target.value = parts.map(n=>String(Math.trunc(n)).padStart(2,'0')).join(':'); assigned = true; break;
            }
          } else {
            const value = parseDecimalSpeech(spoken);
            if (Number.isFinite(value) && value >= 1 && value <= 100000000) { target.value = String(value); assigned = true; break; }
          }
        }
        if (assigned) break;
      }
      const out = surface?.querySelector('.calc-results');
      if (assigned) {
        target.dispatchEvent(new Event('input',{bubbles:true})); target.dispatchEvent(new Event('change',{bubbles:true}));
        if (out) out.innerHTML = `<p class="voice-success">Reconnu automatiquement : <b>${target.value}</b></p>`;
      } else if (event.results?.[event.results.length - 1]?.isFinal && out) {
        out.innerHTML = `<p class="message">${heard ? 'Voix entendue mais format non reconnu.' : 'Aucune parole reconnue.'} Réessayez en disant ${target.type === 'time' ? '« onze heures, vingt-trois minutes, douze secondes » ou « 11, 23, 12 »' : '« huit virgule soixante-huit », « 8 point 68 » ou « 8,68 »'}.</p>`;
      }
    };
    recognition.onerror = () => { const out=surface?.querySelector('.calc-results'); if(out) out.innerHTML='<p class="message">Saisie vocale interrompue. Vérifiez l’autorisation du microphone et la langue choisie, puis réessayez.</p>'; };
    recognition.onend = () => { button.classList.remove('listening'); button.disabled = false; };
    try { recognition.start(); } catch (_) { button.classList.remove('listening'); button.disabled = false; }
  }));

  $('premiumCheckAccess')?.addEventListener('click', () => loadPremiumAccess());

  const paymentDestinations = {
    'MVola': { number: '+261383955105', label: 'MVola', icon: 'M' },
    'Airtel Money': { number: '+261336756185', label: 'Airtel Money', icon: 'A' },
    'Orange Money': { number: '+261379594257', label: 'Orange Money', icon: 'O' },
    'Transfert bancaire / autre': { number: '', label: 'Autre moyen de paiement', icon: '↗' }
  };
  function updatePaymentDestination() {
    const method = $('premiumPaymentMethod')?.value || 'MVola';
    const destination = paymentDestinations[method] || paymentDestinations.MVola;
    const card = $('paymentDestinationCard');
    const number = $('paymentDestinationNumber');
    const name = $('paymentDestinationName');
    const icon = $('paymentDestinationIcon');
    const copy = $('copyPaymentNumber');
    if (name) name.textContent = destination.label;
    if (number) number.textContent = destination.number || 'Contactez l’administrateur';
    if (icon) icon.textContent = destination.icon;
    if (card) card.classList.toggle('payment-destination-other', !destination.number);
    if (copy) { copy.disabled = !destination.number; copy.textContent = 'Copier le numéro'; }
  }
  async function loadNotifications() {
    const list = $('notificationList'); if (!list) return;
    list.replaceChildren();
    $('notificationAdminComposer')?.classList.toggle('hide', !isPremiumAdmin());
    if (!db || !state.user) { list.textContent = 'Connectez-vous pour consulter vos notifications.'; return; }
    try {
      const [announcementResult, personalResult] = await Promise.all([
        db.from('stratx_announcements').select('id,title,body,created_at').eq('published',true).order('created_at',{ascending:false}).limit(100),
        db.from('stratx_user_notifications').select('id,title,body,created_at,kind').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(100)
      ]);
      if (announcementResult.error) throw announcementResult.error;
      if (personalResult.error && !/does not exist/i.test(personalResult.error.message || '')) throw personalResult.error;
      const notices = [ ...(personalResult.data || []).map(n=>({...n,kind:n.kind||'account'})), ...(announcementResult.data || []).map(n=>({...n,kind:'announcement'})) ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      if (!notices.length) { const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Aucune nouvelle notification pour le moment.';list.append(empty); }
      notices.forEach(n=>{ const card=document.createElement('button');card.type='button';card.className='notification-card';const icon=document.createElement('span');icon.className='notification-card-icon';icon.textContent=n.kind==='premium_request'?'♛':n.kind==='premium_approved'?'✓':n.kind==='premium_rejected'?'!':'✦';const content=document.createElement('div');const title=document.createElement('b');title.textContent=n.title;const body=document.createElement('p');body.textContent=(n.body||'').length>180?n.body.slice(0,180)+'…':(n.body||'');const meta=document.createElement('small');meta.textContent=`${n.kind==='announcement'?'Annonce StratX':'Notification de compte'} · ${formatDate(n.created_at)}`;content.append(title,body,meta);card.append(icon,content);card.addEventListener('click',()=>{const modal=document.createElement('div');modal.className='notification-reader-backdrop';const box=document.createElement('article');box.className='notification-reader';const close=document.createElement('button');close.className='btn btn-outline';close.type='button';close.textContent='Fermer';const h=document.createElement('h3');h.textContent=n.title;const p=document.createElement('p');p.textContent=n.body||'';const d=document.createElement('small');d.textContent=formatDate(n.created_at);close.addEventListener('click',()=>modal.remove());box.append(close,h,p,d);modal.append(box);modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});document.body.append(modal);});list.append(card);});
      const badge=$('notificationBadge');if(badge){badge.textContent=String(notices.length);badge.classList.toggle('hide',!notices.length);}
    } catch(error) { const p=document.createElement('p');p.className='message';p.textContent=`Impossible de charger les notifications : ${friendlyError(error)}. Vérifiez premium_access.sql.`;list.append(p); }
  }
  $('notificationRefresh')?.addEventListener('click',loadNotifications);
  window.setInterval(()=>{if(state.user){loadNotifications();if(isPremiumAdmin())loadPremiumPaymentRequests();}},25000);

  $('notificationAdminForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!isPremiumAdmin()||!db||!state.user)return;const title=$('noticeTitle').value.trim(),body=$('noticeBody').value.trim();const button=e.submitter;if(button)button.disabled=true;try{const {error}=await db.from('stratx_announcements').insert({title,body,created_by:state.user.id,published:true});if(error)throw error;$('notificationAdminForm').reset();say('notificationMessage','Annonce publiée. Elle sera visible dans le centre de notifications des membres.');await loadNotifications();}catch(error){say('notificationMessage',`Publication impossible : ${friendlyError(error)}`);}finally{if(button)button.disabled=false;}});

  // Prix globaux stables par fenêtre de 3 jours : ils ne changent pas à chaque calcul ni à chaque seconde.
  // Les montants restent dans les plages définies par l'administrateur et sont indicatifs côté client;
  // le contrôle serveur/Supabase doit être aligné avant la mise en production.
  const PRICE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
  function priceWindow() { return Math.floor(Date.now() / PRICE_WINDOW_MS); }
  function priceForDuration(days, windowId = priceWindow()) {
    const d = Math.max(1, Math.min(365, Math.floor(Number(days) || 1)));
    const rand = deterministicRandom(`stratx-premium-price-v1|${windowId}`);
    const p7 = 6500 + Math.floor(rand() * 2001); // 6 500–8 500 Ar
    const p30 = 25000 + Math.floor(rand() * 10001); // 25 000–35 000 Ar
    let amount;
    if (d <= 6) amount = 3000 + ((d - 1) / 6) * (p7 - 3000);
    else if (d === 7) amount = p7;
    else if (d <= 30) amount = p7 + ((d - 7) / 23) * (p30 - p7);
    else amount = p30 * (d / 30);
    return { days:d, amount:Math.round(amount), p7, p30, windowId, nextChange:new Date((windowId + 1) * PRICE_WINDOW_MS) };
  }
  function updatePremiumPlan() {
    const input = $('premiumDurationDays');
    if (!input) return;
    const raw = Number(input.value);
    const days = Math.max(1, Math.min(365, Math.floor(Number.isFinite(raw) && raw ? raw : 30)));
    if (String(days) !== input.value) input.value = String(days);
    const plan = priceForDuration(days);
    say('premiumDaysValue', String(days));
    const amount = $('premiumPaymentAmount'); if (amount) amount.value = String(plan.amount);
    const note = $('premiumPlanNote');
    if (note) note.textContent = `${days} jour${days > 1 ? 's' : ''} d’accès · ${plan.amount.toLocaleString('fr-FR')} Ar · activation après validation manuelle`;
    const stability = $('premiumPriceStability');
    if (stability) stability.textContent = `Tarif stable jusqu’au ${plan.nextChange.toLocaleString('fr-FR', {dateStyle:'medium',timeStyle:'short'})}. Plages : 7 jours ${plan.p7.toLocaleString('fr-FR')} Ar · 30 jours ${plan.p30.toLocaleString('fr-FR')} Ar.`;
  }
  $('premiumDurationDays')?.addEventListener('input', () => { if ($('premiumDurationExact')) $('premiumDurationExact').value = $('premiumDurationDays').value; updatePremiumPlan(); });
  $('premiumDurationDays')?.addEventListener('change', updatePremiumPlan);
  $('premiumDurationExact')?.addEventListener('input', () => { const field=$('premiumDurationExact'); const n=Number(field.value); if (!Number.isFinite(n) || n < 1) return; const d=Math.min(365,Math.floor(n)); $('premiumDurationDays').value=String(d); $('premiumDaysValue').textContent=String(d); updatePremiumPlan(); });
  updatePremiumPlan();
  $('premiumPaymentMethod')?.addEventListener('change', updatePaymentDestination);
  $('copyPaymentNumber')?.addEventListener('click', async () => {
    const number = $('paymentDestinationNumber')?.textContent?.trim();
    if (!number || !number.startsWith('+261')) return;
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ''));
      $('copyPaymentNumber').textContent = 'Numéro copié ✓';
    } catch (_) {
      const field = document.createElement('textarea'); field.value = number.replace(/\s/g, ''); field.setAttribute('readonly',''); field.style.position='fixed'; field.style.opacity='0'; document.body.append(field); field.select();
      const copied = document.execCommand('copy'); field.remove();
      $('copyPaymentNumber').textContent = copied ? 'Numéro copié ✓' : 'Copiez manuellement';
    }
    window.setTimeout(() => { if ($('copyPaymentNumber')) $('copyPaymentNumber').textContent = 'Copier le numéro'; }, 1800);
  });
  updatePaymentDestination();

  $('premiumRequestForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!db || !state.user) { msg('premiumRequestMessage','Connectez-vous avant d’envoyer une demande.',true); return; }
    const button = $('premiumRequestSubmit'); button.disabled = true;
    try {
      const durationDays = Math.max(1, Math.min(365, Math.floor(Number($('premiumDurationDays')?.value || 30))));
      const selectedPlan = priceForDuration(durationDays);
      const payload = {user_id:state.user.id,payment_method:$('premiumPaymentMethod').value,transaction_ref:$('premiumPaymentRef').value.trim(),amount_ariary:Number($('premiumPaymentAmount').value),note:$('premiumPaymentNote').value.trim(),plan_code:`custom_${durationDays}d`,duration_days:durationDays,status:'pending'};
      if (!payload.transaction_ref || !Number.isFinite(payload.amount_ariary) || payload.amount_ariary !== selectedPlan.amount) throw new Error(`Le montant attendu pour ${durationDays} jours est ${selectedPlan.amount.toLocaleString('fr-FR')} Ar. Actualisez le tarif avant d’envoyer la demande.`);
      const {error} = await db.from('premium_payment_requests').insert(payload);
      if (error) throw error;
      $('premiumRequestForm').reset(); updatePremiumPlan();
      msg('premiumRequestMessage','Demande envoyée. L’accès sera activé après vérification manuelle du paiement. Ne renvoyez pas plusieurs demandes pour la même transaction.');
      await loadMyPremiumRequests(); await loadPremiumPaymentRequests();
    } catch (error) { msg('premiumRequestMessage',friendlyError(error),true); }
    finally { button.disabled = false; }
  });
  $('premiumAdminRefresh')?.addEventListener('click',loadPremiumPaymentRequests);

  // Reduce casual copying of page text while preserving normal form-field editing.
  document.addEventListener('copy', e => { if (!e.target.closest('input,textarea,[contenteditable="true"]')) e.preventDefault(); });
  document.addEventListener('cut', e => { if (!e.target.closest('input,textarea,[contenteditable="true"]')) e.preventDefault(); });
  document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea,[contenteditable="true"],button,a')) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (!e.target.closest('input,textarea,[contenteditable="true"]')) e.preventDefault(); });
  function initDate() { say('todayDate', new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'})); const now=new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset()); const local=now.toISOString().slice(0,16); if($('observedAt')) $('observedAt').value=local; }
  async function init() {
    bind(); bindCalculator(); initDate();
    window.addEventListener('popstate', () => { if (recoveryMode) lockRecoveryInterface('Tsy maintsy mamorona mot de passe vaovao aloha ianao.'); else syncRouteFromUrl(); });
    document.addEventListener('click', event => { if (!recoveryMode) return; const authCard = $('auth'); if (authCard && !authCard.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); lockRecoveryInterface('Tsy maintsy mamorona mot de passe vaovao aloha ianao.'); } }, true);
    if (!db) { setStatus('Supabase indisponible',false); msg('authmsg','Impossible de charger Supabase. Vérifiez la connexion Internet ou la configuration de la bibliothèque.',true); return; }
    try {
      const { data, error } = await db.auth.getSession(); if(error) throw error; state.user=data.session?.user || null; authUI();
      recoveryMode = window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('recovery') === '1';
      if (recoveryMode) lockRecoveryInterface('Lien de réinitialisation détecté. Choisissez et confirmez un nouveau mot de passe pour continuer.');
      if(state.user) { setStatus('Connecté'); if (!recoveryMode) { await refresh(); await loadPremiumAccess(); syncRouteFromUrl(); } } else { setStatus('En attente de connexion'); syncRouteFromUrl(); }
      db.auth.onAuthStateChange((event, session) => { state.user=session?.user || null; if(event === 'PASSWORD_RECOVERY') { recoveryMode = true; lockRecoveryInterface('Lien vérifié. Choisissez et confirmez maintenant un nouveau mot de passe pour accéder à StratX.'); return; } if (recoveryMode) { lockRecoveryInterface('La réinitialisation est obligatoire avant de pouvoir accéder à StratX.'); return; } if(!state.user && $('displayName')) delete $('displayName').dataset.loaded; authUI(); if(state.user) { setStatus('Connecté'); loadPremiumAccess(); if(event==='SIGNED_IN') { history.replaceState({}, '', '/accueil'); showPage('home', false); } if(event==='SIGNED_IN' || event==='INITIAL_SESSION' || event==='USER_UPDATED') setTimeout(() => refresh(),0); } else { setStatus('En attente de connexion'); state.posts=[]; state.games=[]; loadPremiumAccess(); } });
    } catch(error) { setStatus('Erreur de connexion',false); msg('authmsg',friendlyError(error),true); console.error('StratX auth init:',error); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
