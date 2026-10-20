// StratX MVP — Supabase Auth + analyses sportives + observations statistiques
const SUPABASE_URL = "https://pvqwpohypdioqkfysynz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg";
const $ = id => document.getElementById(id);
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentUser = null;
let refreshQueued = false;
const safeMessage = (id, text) => { $(id).textContent = text; };
function loading(btn, on, normal) { btn.disabled = on; btn.textContent = on ? "Patientez…" : normal; }
function showAuth() {
  $("authView").classList.toggle("hidden", !!currentUser);
  $("appView").classList.toggle("hidden", !currentUser);
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  if (currentUser) {
    $("welcomeEmail").textContent = currentUser.email || "membre StratX";
    $("profileEmail").textContent = currentUser.email || "—";
    $("profileId").textContent = currentUser.id;
  }
}
const viewIds = ["homeSection","sportsSection","gamesSection","analysesSection","profileSection"];
function showView(id) {
  viewIds.forEach(v => $(v).classList.toggle("hidden", v !== id));
  document.querySelectorAll(".nav-tab").forEach(b => b.classList.toggle("active", b.dataset.view === id));
}
document.querySelectorAll(".nav-tab").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));
$("brandHome").addEventListener("click", e => { if (currentUser) { e.preventDefault(); showView("homeSection"); } });
function renderMessage(target, text, cls="muted") {
  target.replaceChildren(); const p=document.createElement("p"); p.className=cls; p.textContent=text; target.append(p);
}
function addPostCard(target, item, label) {
  const article=document.createElement("article"); article.className="post";
  const h=document.createElement("h3"); h.textContent=item.title || item.teams || "Observation";
  const small=document.createElement("small"); const d=new Date(item.created_at); small.textContent=Number.isNaN(d.getTime())?"":d.toLocaleString("fr-FR");
  const author=document.createElement("div"); author.className="author"; author.textContent=item.user_id===currentUser?.id?"Publié par vous":label;
  const p=document.createElement("p"); p.textContent=item.body || item.notes || [item.competition,item.teams].filter(Boolean).join(" · ");
  article.append(h,small,author,p); target.append(article);
}
async function fetchRows(table, fields, targetId, empty, label) {
  const target=$(targetId);
  if (!db || !currentUser) return renderMessage(target,"Connectez-vous pour consulter ces données.");
  renderMessage(target,"Chargement…");
  try {
    const {data,error}=await db.from(table).select(fields).order("created_at",{ascending:false}).limit(50);
    if(error) throw error;
    target.replaceChildren();
    if(!data?.length) { renderMessage(target,empty); return []; }
    data.forEach(item => addPostCard(target,item,label));
    return data;
  } catch(e) { renderMessage(target,"Erreur : "+e.message,"message"); return null; }
}
async function refreshAll() {
  if (!currentUser || !db || refreshQueued) return;
  refreshQueued=true;
  try {
    const [analyses,sports,observations] = await Promise.all([
      fetchRows("analyses","id,title,body,created_at,user_id","allPosts","Aucune publication pour le moment.","Membre StratX"),
      fetchRows("sports_analyses","id,competition,teams,notes,created_at,user_id","sportsPosts","Aucune analyse sportive enregistrée.","Membre StratX"),
      fetchObservations()
    ]);
    $("analysisCount").textContent=analyses ? analyses.length : "—";
    $("observationCount").textContent=observations ? observations.length : "—";
    await fetchRows("analyses","id,title,body,created_at,user_id","homePosts","Aucune analyse pour le moment.","Membre StratX");
  } finally { refreshQueued=false; }
}
async function fetchObservations() {
  const target=$("observationsList");
  if(!db||!currentUser) return null;
  renderMessage(target,"Chargement…");
  try {
    const {data,error}=await db.from("game_observations").select("id,game_name,multiplier,note,created_at,user_id").order("created_at",{ascending:false}).limit(100);
    if(error) throw error;
    target.replaceChildren();
    const vals=(data||[]).filter(x=>typeof x.multiplier==="number").map(x=>x.multiplier);
    $("obsTotal").textContent=String(data?.length||0);
    $("obsAverage").textContent=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+"x":"—";
    $("obsMax").textContent=vals.length?Math.max(...vals).toFixed(2)+"x":"—";
    if(!data?.length) { renderMessage(target,"Aucune observation enregistrée."); return []; }
    data.forEach(item=>{
      const a=document.createElement("article");a.className="post";
      const h=document.createElement("h3");h.textContent=item.game_name+(item.multiplier!=null?" · "+Number(item.multiplier).toFixed(2)+"x":"");
      const d=document.createElement("small");d.textContent=new Date(item.created_at).toLocaleString("fr-FR");
      const author=document.createElement("div");author.className="author";author.textContent="Observation historique";
      const p=document.createElement("p");p.textContent=item.note||"Aucune note ajoutée.";
      a.append(h,d,author,p);target.append(a);
    });
    return data||[];
  }catch(e){renderMessage(target,"Erreur : "+e.message,"message");return null;}
}
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault(); if(!db)return safeMessage("authMessage","Supabase JS n’est pas chargé. Vérifiez Internet.");
 const b=$("loginBtn");loading(b,true,"Connexion");
 try{const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)throw error;safeMessage("authMessage","Connexion réussie.");}
 catch(err){safeMessage("authMessage","Connexion impossible : "+err.message);}finally{loading(b,false,"Connexion");}
});
$("signupBtn").addEventListener("click",async()=>{
 if(!db)return safeMessage("authMessage","Supabase JS n’est pas chargé.");
 const email=$("email").value.trim(),password=$("password").value;
 if(!email||password.length<6)return safeMessage("authMessage","Saisissez un e-mail valide et un mot de passe de 6 caractères minimum.");
 const b=$("signupBtn");loading(b,true,"Créer un compte");
 try{const {data,error}=await db.auth.signUp({email,password});if(error)throw error;safeMessage("authMessage",data.session?"Compte créé. Bienvenue !":"Compte créé. Confirmez votre e-mail puis connectez-vous.");}
 catch(err){safeMessage("authMessage","Inscription impossible : "+err.message);}finally{loading(b,false,"Créer un compte");}
});
async function logout(){if(!db)return;const {error}=await db.auth.signOut();if(error)safeMessage("authMessage",error.message);}
$("logoutBtn").addEventListener("click",logout);$("profileLogout").addEventListener("click",logout);
$("homeRefresh").addEventListener("click",refreshAll);$("analysisRefresh").addEventListener("click",()=>fetchRows("analyses","id,title,body,created_at,user_id","allPosts","Aucune publication.","Membre StratX"));
$("sportsRefresh").addEventListener("click",()=>fetchRows("sports_analyses","id,competition,teams,notes,created_at,user_id","sportsPosts","Aucune analyse sportive.","Membre StratX"));
$("obsRefresh").addEventListener("click",fetchObservations);
$("postForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser)return safeMessage("postMessage","Connectez-vous avant de publier.");
 const title=$("postTitle").value.trim(),body=$("postBody").value.trim();if(!title||!body)return safeMessage("postMessage","Remplissez les deux champs.");
 const b=$("publishBtn");loading(b,true,"Publier");
 try{const {error}=await db.from("analyses").insert({user_id:currentUser.id,title,body});if(error)throw error;$("postForm").reset();safeMessage("postMessage","Publication enregistrée.");await refreshAll();showView("analysesSection");}
 catch(err){safeMessage("postMessage","Publication impossible : "+err.message);}finally{loading(b,false,"Publier");}
});
$("sportsForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser)return safeMessage("sportsMessage","Connectez-vous avant d’enregistrer.");
 const payload={user_id:currentUser.id,competition:$("competition").value.trim(),teams:$("teams").value.trim(),notes:$("sportNotes").value.trim()};
 const b=$("sportsBtn");loading(b,true,"Enregistrement…");
 try{const {error}=await db.from("sports_analyses").insert(payload);if(error)throw error;$("sportsForm").reset();safeMessage("sportsMessage","Analyse sportive enregistrée dans Supabase.");await refreshAll();}
 catch(err){safeMessage("sportsMessage","Enregistrement impossible : "+err.message);}finally{loading(b,false,"Enregistrer l’analyse");}
});
$("observationForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser)return safeMessage("observationMessage","Connectez-vous avant d’enregistrer.");
 const raw=$("multiplier").value;const multiplier=raw===""?null:Number(raw);
 if(multiplier!==null&&(!Number.isFinite(multiplier)||multiplier<=0))return safeMessage("observationMessage","Saisissez un nombre positif ou laissez le champ vide.");
 const payload={user_id:currentUser.id,game_name:$("gameName").value,multiplier,note:$("observationNote").value.trim()||null};
 const b=$("observationBtn");loading(b,true,"Enregistrement…");
 try{const {error}=await db.from("game_observations").insert(payload);if(error)throw error;$("observationForm").reset();safeMessage("observationMessage","Observation enregistrée. Elle décrit le passé et ne prédit pas le prochain résultat.");await refreshAll();}
 catch(err){safeMessage("observationMessage","Enregistrement impossible : "+err.message);}finally{loading(b,false,"Enregistrer l’observation");}
});
if(!db){$("connection").textContent="Supabase indisponible";safeMessage("authMessage","Vérifiez Internet et le script Supabase.");}
else{
 db.auth.onAuthStateChange((event,session)=>{
   currentUser=session?.user||null;showAuth();$("connection").textContent=currentUser?"Connecté à Supabase":"Déconnecté";
   if(currentUser) setTimeout(()=>refreshAll(),0);
 });
 db.auth.getSession().then(({data,error})=>{if(error)throw error;currentUser=data.session?.user||null;showAuth();$("connection").textContent=currentUser?"Connecté à Supabase":"Supabase prêt";if(currentUser)refreshAll();})
 .catch(err=>{ $("connection").textContent="Erreur Supabase";safeMessage("authMessage","Vérifiez la configuration : "+err.message);});
}
