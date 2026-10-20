const SUPABASE_URL = "https://pvqwpohypdioqkfysynz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg";
const $ = (id) => document.getElementById(id);
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentUser = null;
let busy = false;

function msg(id, text) { $(id).textContent = text; }
function setLoading(button, loading, normalText) {
  button.disabled = loading;
  button.textContent = loading ? "Patientez..." : normalText;
}
function showAuth() {
  $("authView").classList.toggle("hidden", !!currentUser);
  $("homeView").classList.toggle("hidden", !currentUser);
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  if (currentUser) {
    $("welcomeEmail").textContent = currentUser.email || "membre StratX";
    $("profileEmail").textContent = currentUser.email || "—";
    $("profileId").textContent = currentUser.id;
  }
}
function showView(viewId) {
  document.querySelectorAll(".view-section").forEach(el => el.classList.toggle("hidden", el.id !== viewId));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.toggle("active", el.dataset.view === viewId));
}
document.querySelectorAll(".nav-tab").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
$("brandHome").addEventListener("click", (e) => {
  if (currentUser) { e.preventDefault(); showView("homeSection"); }
});
async function loadPosts(targetId) {
  const target = $(targetId);
  target.replaceChildren();
  if (!db || !currentUser) {
    const p = document.createElement("p"); p.className = "muted";
    p.textContent = "Connectez-vous pour consulter les analyses."; target.append(p); return;
  }
  const loading = document.createElement("p"); loading.className = "muted";
  loading.textContent = "Chargement..."; target.append(loading);
  try {
    const { data, error } = await db.from("analyses")
      .select("id,title,body,created_at,user_id")
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    target.replaceChildren();
    $("analysisCount").textContent = String(data?.length ?? 0);
    if (!data?.length) {
      const p = document.createElement("p"); p.className = "muted";
      p.textContent = "Aucune analyse pour le moment. Soyez le premier à publier."; target.append(p); return;
    }
    for (const item of data) {
      const article = document.createElement("article"); article.className = "post";
      const title = document.createElement("h3"); title.textContent = item.title;
      const date = document.createElement("small");
      const parsed = new Date(item.created_at);
      date.textContent = Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("fr-FR");
      const body = document.createElement("p"); body.textContent = item.body;
      const author = document.createElement("div"); author.className = "author";
      author.textContent = item.user_id === currentUser.id ? "Publié par vous" : "Membre StratX";
      article.append(title, date, author, body); target.append(article);
    }
  } catch (error) {
    target.replaceChildren();
    const p = document.createElement("p"); p.className = "message";
    p.textContent = "Erreur : " + error.message; target.append(p);
  }
}
async function refreshBoth() {
  await Promise.all([loadPosts("homePosts"), loadPosts("allPosts")]);
}
$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) return msg("authMessage", "Supabase JS n'est pas chargé. Vérifiez Internet.");
  const button = $("loginBtn"); setLoading(button, true, "Connexion");
  try {
    const { error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(), password: $("password").value
    });
    if (error) throw error;
    msg("authMessage", "Connexion réussie.");
  } catch (error) { msg("authMessage", "Connexion impossible : " + error.message); }
  finally { setLoading(button, false, "Connexion"); }
});
$("signupBtn").addEventListener("click", async () => {
  if (!db) return msg("authMessage", "Supabase JS n'est pas chargé.");
  const email = $("email").value.trim(), password = $("password").value;
  if (!email || password.length < 6) return msg("authMessage", "Vérifiez l'e-mail et le mot de passe (6 caractères minimum).");
  const button = $("signupBtn"); setLoading(button, true, "Créer un compte");
  try {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    msg("authMessage", data.session ? "Compte créé. Bienvenue sur StratX !" : "Compte créé. Confirmez votre e-mail puis connectez-vous.");
  } catch (error) { msg("authMessage", "Inscription impossible : " + error.message); }
  finally { setLoading(button, false, "Créer un compte"); }
});
async function logout() {
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) msg("authMessage", error.message);
}
$("logoutBtn").addEventListener("click", logout);
$("profileLogout").addEventListener("click", logout);
$("homeRefresh").addEventListener("click", refreshBoth);
$("analysisRefresh").addEventListener("click", () => loadPosts("allPosts"));
$("postForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db || !currentUser) return msg("postMessage", "Connectez-vous avant de publier.");
  const title = $("postTitle").value.trim(), body = $("postBody").value.trim();
  if (!title || !body) return msg("postMessage", "Remplissez les deux champs.");
  const button = $("publishBtn"); setLoading(button, true, "Publier l'analyse");
  try {
    const { error } = await db.from("analyses").insert({ user_id: currentUser.id, title, body });
    if (error) throw error;
    $("postForm").reset(); msg("postMessage", "Analyse enregistrée dans Supabase.");
    await refreshBoth(); showView("analysesSection");
  } catch (error) { msg("postMessage", "Publication impossible : " + error.message); }
  finally { setLoading(button, false, "Publier l'analyse"); }
});
if (!db) {
  $("connection").textContent = "Supabase indisponible";
  msg("authMessage", "Vérifiez votre connexion Internet et le script Supabase.");
} else {
  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    showAuth();
    $("connection").textContent = currentUser ? "Connecté à Supabase" : "Non connecté";
    if (currentUser) refreshBoth();
  });
  db.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    currentUser = data.session?.user ?? null;
    showAuth();
    $("connection").textContent = currentUser ? "Connecté à Supabase" : "Supabase prêt";
    if (currentUser) refreshBoth();
  }).catch(error => {
    $("connection").textContent = "Erreur de connexion";
    msg("authMessage", "Vérifiez Supabase : " + error.message);
  });
}
