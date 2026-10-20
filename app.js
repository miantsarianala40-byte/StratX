(() => {
"use strict";
const SUPABASE_URL = "https://pvqwpohypdioqkfysynz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg";
const $ = id => document.getElementById(id);
let db = null, user = null, busyAuth = false;
const say = (id, msg) => { const el=$(id); if(el) el.textContent=msg || ""; };
const errText = err => {
  const m = err?.message || String(err || "Erreur inconnue");
  if (/Invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(m)) return "Confirmez votre adresse e-mail avant de vous connecter.";
  if (/User already registered/i.test(m)) return "Cette adresse e-mail possède déjà un compte. Connectez-vous.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "Connexion impossible. Vérifiez Internet et la configuration Supabase.";
  return m;
};
function authUI() {
  $("auth").classList.toggle("hide", !!user);
  $("app").classList.toggle("hide", !user);
  $("logout").classList.toggle("hide", !user);
  if(user){ say("profileemail", user.email || ""); say("profileid", user.id || ""); }
}
function setBusy(on) {
  busyAuth=on;
  ["login","signup"].forEach(id=>{ $(id).disabled=on; $(id).textContent=on?(id==="login"?"Connexion…":"Création…"):(id==="login"?"Connexion":"Créer un compte"); });
}
function page(id) {
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("hide",x.id!==id));
  document.querySelectorAll("nav [data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
  if(id==="football") loadSavedFixturesKey();
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>page(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>page(b.dataset.goto)));
function renderList(id, rows, formatter) {
  const el=$(id); if(!el)return;
  el.replaceChildren();
  if(!rows?.length){el.className="empty";el.textContent="Aucune donnée pour le moment.";return;}
  el.className="";
  rows.forEach(r=>{
    const item=document.createElement("div"); item.className="item";
    const f=formatter(r)||{};
    const h=document.createElement("h3"); h.textContent=f.title||"Sans titre";
    const d=document.createElement("small"); d.textContent=r.created_at?new Date(r.created_at).toLocaleString("fr-FR"):"";
    const p=document.createElement("p"); p.textContent=f.body||"";
    item.append(h,d,p);el.append(item);
  });
}
async function fetchTable(table, fields, id, fmt) {
  if(!db || !user) return [];
  const {data,error}=await db.from(table).select(fields).order("created_at",{ascending:false}).limit(50);
  if(error){const el=$(id);if(el){el.className="empty";el.textContent="Erreur Supabase : "+errText(error);}return [];}
  renderList(id,data||[],fmt);return data||[];
}
async function refresh() {
  if(!db||!user)return;
  const [posts,sports,games]=await Promise.all([
    fetchTable("analyses","title,body,created_at,user_id","posts",r=>({title:r.title,body:r.body})),
    fetchTable("sports_analyses","competition,teams,notes,created_at","sportslist",r=>({title:r.teams,body:r.competition+" · "+r.notes})),
    fetchTable("game_observations","game_name,multiplier,note,created_at","gameslist",r=>({title:r.game_name+(r.multiplier==null?"":" · "+Number(r.multiplier).toFixed(2)+"x"),body:r.note||"Observation historique"}))
  ]);
  $("countPosts").textContent=posts.length;$("countSports").textContent=sports.length;$("countGames").textContent=games.length;
  renderList("latest",posts.slice(0,5),r=>({title:r.title,body:r.body}));
  const vals=games.filter(x=>x.multiplier!==null&&x.multiplier!==undefined).map(x=>Number(x.multiplier)).filter(Number.isFinite);
  say("total",games.length);say("average",vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—");say("maximum",vals.length?Math.max(...vals).toFixed(2)+"x":"—");
}
async function handleAuth(mode) {
  if(!db){say("authmsg","Supabase n'est pas initialisé. Vérifiez votre connexion Internet et la configuration.");return;}
  if(busyAuth)return;
  const email=$("email").value.trim(), password=$("password").value;
  if(!email||!password){say("authmsg","Saisissez votre adresse e-mail et votre mot de passe.");return;}
  if(password.length<6){say("authmsg","Le mot de passe doit contenir au moins 6 caractères.");return;}
  setBusy(true);say("authmsg","");
  try {
    let result;
    if(mode==="login") result=await db.auth.signInWithPassword({email,password});
    else result=await db.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+window.location.pathname}});
    if(result.error) throw result.error;
    if(mode==="signup"&&!result.data.session) say("authmsg","Compte créé. Vérifiez votre boîte e-mail pour confirmer l'adresse, puis connectez-vous.");
    else say("authmsg",mode==="login"?"Connexion réussie.":"Compte créé et connecté.");
  } catch(e){say("authmsg",errText(e));}
  finally{setBusy(false);}
}
$("login").addEventListener("click",()=>handleAuth("login"));
$("signup").addEventListener("click",()=>handleAuth("signup"));
$("password").addEventListener("keydown",e=>{if(e.key==="Enter")handleAuth("login");});
$("logout").addEventListener("click",async()=>{if(!db)return;const {error}=await db.auth.signOut();if(error)say("status",errText(error));});
$("refresh").addEventListener("click",refresh);
$("sportform").addEventListener("submit",async e=>{
  e.preventDefault();if(!db||!user){say("sportmsg","Connectez-vous pour enregistrer une fiche.");return;}
  const notes=($("matchdate").value?"Date : "+$("matchdate").value+" · ":"")+$("notes").value.trim();
  const {error}=await db.from("sports_analyses").insert({user_id:user.id,competition:$("competition").value.trim(),teams:$("teams").value.trim(),notes});
  say("sportmsg",error?"Erreur : "+errText(error):"Analyse enregistrée.");
  if(!error){e.target.reset();await refresh();}
});
$("postform").addEventListener("submit",async e=>{
  e.preventDefault();if(!db||!user){say("postmsg","Connectez-vous pour publier.");return;}
  const {error}=await db.from("analyses").insert({user_id:user.id,title:$("title").value.trim(),body:$("body").value.trim()});
  say("postmsg",error?"Erreur : "+errText(error):"Publication enregistrée.");
  if(!error){e.target.reset();await refresh();}
});
$("gameform").addEventListener("submit",async e=>{
  e.preventDefault();if(!db||!user){say("gamemsg","Connectez-vous pour enregistrer une observation.");return;}
  const raw=$("multiplier").value;
  const {error}=await db.from("game_observations").insert({user_id:user.id,game_name:$("gamename").value,multiplier:raw===""?null:Number(raw),note:$("gamenote").value.trim()||null});
  say("gamemsg",error?"Erreur : "+errText(error):"Observation enregistrée.");
  if(!error){e.target.reset();await refresh();}
});

// Football data: fixtures and match statistics only; no odds or betting markets.
const KEY_STORE="stratx_football_api_key";
function loadSavedFixturesKey(){try{$("footballKey").value=localStorage.getItem(KEY_STORE)||"";}catch(_){}}
$("saveFootballKey").addEventListener("click",()=>{
  const key=$("footballKey").value.trim();
  try { if(key)localStorage.setItem(KEY_STORE,key);else localStorage.removeItem(KEY_STORE);say("footballmsg",key?"Clé enregistrée sur cet appareil.":"Clé supprimée."); }
  catch(_){say("footballmsg","Le navigateur n'a pas autorisé le stockage local.");}
});
function fixtureCard(f){
  const fixture=f.fixture||{}, teams=f.teams||{}, goals=f.goals||{}, league=f.league||{};
  const home=teams.home?.name||"Équipe domicile", away=teams.away?.name||"Équipe extérieure";
  const status=fixture.status?.short||"";
  const live=["1H","HT","2H","ET","BT","P","LIVE"].includes(status);
  const score=(goals.home!==null&&goals.home!==undefined)?`${goals.home} – ${goals.away}`:"vs";
  const box=document.createElement("article");box.className="fixture";
  const top=document.createElement("div");top.className="fixture-top";
  const leagueEl=document.createElement("small");leagueEl.textContent=league.name||"Football";
  const state=document.createElement("span");state.className=live?"live-dot":"muted";state.textContent=live?"● EN DIRECT":(fixture.status?.long||status||"À venir");
  top.append(leagueEl,state);
  const teamsEl=document.createElement("div");teamsEl.className="fixture-teams";
  const left=document.createElement("strong");left.textContent=home;
  const sc=document.createElement("span");sc.className="score";sc.textContent=score;
  const right=document.createElement("strong");right.textContent=away;
  teamsEl.append(left,sc,right);
  const date=document.createElement("p");date.className="muted";date.textContent=fixture.date?new Date(fixture.date).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"}):"Date indisponible";
  box.append(top,teamsEl,date);
  if(f.status?.elapsed!=null){const minute=document.createElement("small");minute.textContent=`Minute : ${f.fixture.status.elapsed}'`;box.append(minute);}
  return box;
}
async function loadFixtures(){
  let key=$("footballKey").value.trim();
  if(!key){try{key=localStorage.getItem(KEY_STORE)||"";}catch(_){}}
  if(!key){say("footballmsg","Ajoutez votre clé API-Football pour charger les rencontres.");return;}
  const liveEl=$("liveFixtures"), upcomingEl=$("upcomingFixtures");
  liveEl.className="empty";liveEl.textContent="Chargement…";upcomingEl.className="empty";upcomingEl.textContent="Chargement…";
  say("footballmsg","Récupération des données football…");
  try {
    const headers={"x-apisports-key":key};
    const today=new Date(), end=new Date();end.setDate(end.getDate()+7);
    const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const [liveRes,upRes]=await Promise.all([
      fetch("https://v3.football.api-sports.io/fixtures?live=all",{headers}),
      fetch(`https://v3.football.api-sports.io/fixtures?from=${fmt(today)}&to=${fmt(end)}&timezone=Indian%2FAntananarivo`,{headers})
    ]);
    if(!liveRes.ok||!upRes.ok)throw new Error("L'API a refusé la requête (HTTP "+(!liveRes.ok?liveRes.status:upRes.status)+"). Vérifiez la clé et les limites de votre forfait.");
    const liveData=await liveRes.json(), upData=await upRes.json();
    if(liveData.errors&&Object.keys(liveData.errors).length)throw new Error(JSON.stringify(liveData.errors));
    if(upData.errors&&Object.keys(upData.errors).length)throw new Error(JSON.stringify(upData.errors));
    const live=liveData.response||[], upcoming=upData.response||[];
    liveEl.replaceChildren();upcomingEl.replaceChildren();liveEl.className="fixture-list";upcomingEl.className="fixture-list";
    if(!live.length){liveEl.className="empty";liveEl.textContent="Aucun match en direct trouvé.";}else live.forEach(f=>liveEl.append(fixtureCard(f)));
    const filtered=upcoming.filter(f=>!["FT","AET","PEN","CANC","ABD","AWD","WO"].includes(f.fixture?.status?.short));
    if(!filtered.length){upcomingEl.className="empty";upcomingEl.textContent="Aucune rencontre à venir trouvée pour les 7 prochains jours.";}else filtered.forEach(f=>upcomingEl.append(fixtureCard(f)));
    say("footballmsg",`Données chargées : ${live.length} match(s) en direct et ${filtered.length} rencontre(s) à venir. Les quotas dépendent de votre fournisseur.`);
  } catch(e) {
    liveEl.className="empty";liveEl.textContent="Impossible de charger les matchs.";
    upcomingEl.className="empty";upcomingEl.textContent="Vérifiez la clé API, Internet et les limites du fournisseur.";
    say("footballmsg",errText(e)+" Si le navigateur bloque la requête (CORS), un petit backend/proxy HTTPS sera nécessaire.");
  }
}
$("loadFixtures").addEventListener("click",loadFixtures);

async function init(){
  if(!window.supabase?.createClient){say("status","Bibliothèque Supabase indisponible");say("authmsg","Impossible de charger Supabase. Vérifiez Internet.");return;}
  try{
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    db.auth.onAuthStateChange((_event,session)=>{
      user=session?.user||null;authUI();say("status",user?"Compte connecté":"Non connecté");
      if(user) setTimeout(()=>refresh().catch(e=>say("status",errText(e))),0);
    });
    const {data,error}=await db.auth.getSession();
    if(error)throw error;
    user=data.session?.user||null;authUI();say("status",user?"Compte connecté":"Prêt");
    if(user)await refresh();
  }catch(e){say("status","Erreur Supabase");say("authmsg","Erreur d'initialisation : "+errText(e));}
  loadSavedFixturesKey();
}
init();
})();