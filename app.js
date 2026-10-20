(() => {
  'use strict';
  const SUPABASE_URL = 'https://pvqwpohypdioqkfysynz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg';
  const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  const state = { user: null, currentPage: 'home', activeGame: 'Aviator', games: [], sports: [], posts: [], profile: {}, communityFilter: 'all', communityQuery: '', communitySort: 'newest', communityLiked: new Set(), communitySaved: new Set(), communityComments: {} };
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
    // Always land on the home dashboard after a valid session is detected.
    if ($('app') && $('home') && state.currentPage !== 'home') showPage('home');
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
    if ($('displayName') && !$('displayName').dataset.loaded) { $('displayName').value = meta.display_name || ''; $('profileBio').value = meta.bio || ''; $('displayName').dataset.loaded = 'yes'; }
  }
  function showPage(id) {
    if(id==='sports'){ id='sports'; }
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
        queryTable('analyses', 'id,title,body,created_at,user_id,author_name'),
        queryTable('sports_analyses', 'id,competition,teams,notes,match_date,created_at,user_id'),
        queryTable('game_observations', 'id,game_name,multiplier,note,observed_at,created_at,user_id')
      ]);
      state.posts = posts; state.sports = sports; state.games = games;
      say('countPosts', posts.length); say('countSports', sports.length); say('countGames', games.length);
      say('sportsCount', `${sports.length} fiche${sports.length === 1 ? '' : 's'}`);
      renderList('sportslist', sports, r => ({ title: r.teams, body: `${r.competition || 'Compétition non précisée'}\n${r.notes || ''}`, date: r.match_date || r.created_at, eyebrow: 'FICHE FOOTBALL' }), 'Aucune rencontre enregistrée', 'Ajoutez une fiche de rencontre pour la retrouver ici.');
      renderCommunity();
      renderList('latest', [...posts.map(r => ({ title: r.title, body: r.body, created_at: r.created_at, kind: 'PUBLICATION' })), ...sports.map(r => ({ title: r.teams, body: r.competition, created_at: r.created_at, kind: 'FOOTBALL' })), ...games.map(r => ({ title: `${r.game_name}${r.multiplier == null ? '' : ` · ${Number(r.multiplier).toFixed(2)}x`}`, body: r.note || 'Observation historique', created_at: r.created_at, kind: 'OBSERVATION' }))].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), r => ({ title: r.title, body: r.body, date: r.created_at, eyebrow: r.kind }), 'Votre espace est prêt', 'Vos publications et analyses apparaîtront ici.');
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
    say('gamename', name); $('gamename').value = name;
    say('gameBannerTitle', name); say('gameBannerDesc', info.desc); say('historyTitle', `Historique ${name}`);
    const logo = $('gameBannerLogo'); logo.className = `game-banner-logo ${info.cls}`; logo.textContent = info.logo;
    document.querySelectorAll('.game-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.game === name));
    const rows = state.games.filter(r => r.game_name === name).sort((a,b) => new Date(b.observed_at || b.created_at) - new Date(a.observed_at || a.created_at));
    const vals = rows.map(r => Number(r.multiplier)).filter(v => Number.isFinite(v) && v > 0);
    say('gameTotal', rows.length); say('gameAverage', vals.length ? `${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)}x` : '—'); say('gameMaximum', vals.length ? `${Math.max(...vals).toFixed(2)}x` : '—'); say('gameCountChip', `${rows.length} entrée${rows.length===1?'':'s'}`);
    renderList('gameslist', rows, r => ({ title: r.multiplier == null ? 'Observation sans valeur numérique' : `Valeur observée : ${Number(r.multiplier).toFixed(2)}x`, body: r.note || 'Aucune note ajoutée.', date: r.observed_at || r.created_at, eyebrow: name.toUpperCase() }), `Aucune observation ${name}`, `Les entrées que vous ajouterez à ${name} seront affichées ici.`);
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
        // Do not rely only on the asynchronous auth-state event to open the dashboard.
        state.user = data?.user || data?.session?.user || null;
        if (!state.user) {
          const { data: sessionData, error: sessionError } = await db.auth.getSession();
          if (sessionError) throw sessionError;
          state.user = sessionData?.session?.user || null;
        }
        if (!state.user) throw new Error('Connexion acceptée mais session absente. Vérifiez la configuration Auth de Supabase.');
        authUI();
        showPage('home');
        setStatus('Connecté');
        msg('authmsg', 'Connexion réussie. Bienvenue sur StratX.');
        refresh().catch(error => console.error('StratX dashboard refresh:', error));
      } else if (action === 'signup') {
        const displayName = $('signupName').value.trim();
        const redirectUrl = window.location.href.split('#')[0];
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl, data: { display_name: displayName } }
        });
        if (error) throw error;
        if (data.session) {
          state.user = data.user || data.session.user;
          authUI();
          showPage('home');
          setStatus('Connecté');
          msg('authmsg', 'Compte créé et connecté. Bienvenue sur StratX.');
          refresh().catch(error => console.error('StratX dashboard refresh:', error));
        } else {
          msg('authmsg', 'Compte créé. Ouvrez l’e-mail de confirmation envoyé par Supabase, confirmez votre adresse, puis revenez ici pour vous connecter.');
        }
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] });
        if (error) throw error;
        msg('authmsg', 'Si cette adresse correspond à un compte, un e-mail de réinitialisation sera envoyé.');
      }
    } catch (error) { msg('authmsg', friendlyError(error), true); }
    finally { ['login','signup','resetPassword'].forEach(id => { const b = $(id); if (b) b.disabled = false; }); }
  }
  async function signOut() { if (!db) return; const { error } = await db.auth.signOut(); if (error) msg('profilemsg', friendlyError(error), true); }
  function bind() {
    document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
    document.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.goto)));
    document.querySelectorAll('.game-tab').forEach(btn => btn.addEventListener('click', () => { state.activeGame = btn.dataset.game; renderGame(); }));
    $('login').addEventListener('click', () => { toggleSignupFields(false); runAuth('login'); });
    $('signup').addEventListener('click', () => {
      if (!$('signupNameWrap')?.classList.contains('signup-mode')) {
        toggleSignupFields(true);
        msg('authmsg', 'Renseignez votre nom affiché, votre e-mail et un mot de passe, puis validez la création du compte.');
        return;
      }
      runAuth('signup');
    });
    $('resetPassword').addEventListener('click', () => { toggleSignupFields(false); runAuth('reset'); });
    $('password').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); runAuth($('signupNameWrap')?.classList.contains('signup-mode') ? 'signup' : 'login'); }
    });
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
  async function init() {
    bind(); initDate();
    if (!db) { setStatus('Supabase indisponible',false); msg('authmsg','Impossible de charger Supabase. Vérifiez la connexion Internet ou la configuration de la bibliothèque.',true); return; }
    try {
      const { data, error } = await db.auth.getSession(); if(error) throw error; state.user=data.session?.user || null; authUI();
      if(state.user) { setStatus('Connecté'); await refresh(); } else setStatus('En attente de connexion');
      db.auth.onAuthStateChange((event, session) => {
        state.user = session?.user || null;
        if (!state.user && $('displayName')) delete $('displayName').dataset.loaded;
        authUI();
        if (state.user) {
          setStatus('Connecté');
          showPage('home');
          if (event !== 'INITIAL_SESSION') setTimeout(() => refresh(), 0);
        } else {
          setStatus('En attente de connexion');
          state.posts=[]; state.sports=[]; state.games=[];
        }
      });
    } catch(error) { setStatus('Erreur de connexion',false); msg('authmsg',friendlyError(error),true); console.error('StratX auth init:',error); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
