const SUPABASE_URL = "https://pvqwpohypdioqkfysynz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_IFZGXyCPkt_eZFjaDdWOaA_LYZ1UdEg";
const $ = (id) => document.getElementById(id);
const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentUser = null;
let authReady = false;

function setMessage(id, text) { $(id).textContent = text; }
function setButtonLoading(button, loading, label) {
  button.disabled = loading;
  if (label) button.textContent = loading ? "Patientez..." : label;
}
function updateUI() {
  $("authForm").classList.toggle("hidden", !!currentUser);
  $("accountInfo").classList.toggle("hidden", !currentUser);
  $("postForm").classList.toggle("hidden", !currentUser);
  $("authIntro").textContent = currentUser
    ? "Votre compte StratX est connecté."
    : "Connectez-vous ou créez votre compte StratX.";
  $("userEmail").textContent = currentUser?.email ?? "";
}
async function loadPosts() {
  if (!db || !authReady || !currentUser) {
    $("posts").replaceChildren();
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Connectez-vous pour consulter les analyses.";
    $("posts").append(p);
    return;
  }
  $("refreshBtn").disabled = true;
  $("posts").replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Chargement des analyses...";
  $("posts").append(loading);
  try {
    const { data, error } = await db.from("analyses")
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    $("posts").replaceChildren();
    if (!data?.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Aucune analyse publiée pour le moment.";
      $("posts").append(empty);
      return;
    }
    for (const item of data) {
      const article = document.createElement("article");
      article.className = "post";
      const heading = document.createElement("h3");
      heading.textContent = item.title;
      const date = document.createElement("small");
      const parsedDate = new Date(item.created_at);
      date.textContent = Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toLocaleString("fr-FR");
      const body = document.createElement("p");
      body.textContent = item.body;
      article.append(heading, date, body);
      $("posts").append(article);
    }
  } catch (error) {
    $("posts").replaceChildren();
    const p = document.createElement("p");
    p.className = "message";
    p.textContent = "Erreur de chargement : " + error.message;
    $("posts").append(p);
  } finally { $("refreshBtn").disabled = false; }
}
$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) return setMessage("authMessage", "Supabase JS n'est pas chargé.");
  const button = $("loginBtn");
  setButtonLoading(button, true, "Connexion");
  try {
    const { error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(), password: $("password").value
    });
    if (error) throw error;
    setMessage("authMessage", "Connexion réussie.");
  } catch (error) {
    setMessage("authMessage", "Connexion impossible : " + error.message);
  } finally { setButtonLoading(button, false, "Connexion"); }
});
$("signupBtn").addEventListener("click", async () => {
  if (!db) return setMessage("authMessage", "Supabase JS n'est pas chargé.");
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 6)
    return setMessage("authMessage", "Vérifiez l'e-mail et le mot de passe.");
  const button = $("signupBtn");
  setButtonLoading(button, true, "Créer un compte");
  try {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    setMessage("authMessage", data.session
      ? "Compte créé et connecté."
      : "Compte créé. Vérifiez votre e-mail pour confirmer l'inscription.");
  } catch (error) {
    setMessage("authMessage", "Inscription impossible : " + error.message);
  } finally { setButtonLoading(button, false, "Créer un compte"); }
});
$("logoutBtn").addEventListener("click", async () => {
  if (!db) return;
  $("logoutBtn").disabled = true;
  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    setMessage("authMessage", "Déconnexion réussie.");
  } catch (error) {
    setMessage("authMessage", "Erreur : " + error.message);
  } finally { $("logoutBtn").disabled = false; }
});
$("postForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db || !currentUser) return setMessage("postMessage", "Connectez-vous avant de publier.");
  const title = $("postTitle").value.trim();
  const body = $("postBody").value.trim();
  if (!title || !body) return setMessage("postMessage", "Remplissez les deux champs.");
  const button = $("publishBtn");
  setButtonLoading(button, true, "Publier l'analyse");
  try {
    const { error } = await db.from("analyses").insert({
      user_id: currentUser.id, title, body
    });
    if (error) throw error;
    $("postForm").reset();
    setMessage("postMessage", "Publication enregistrée dans Supabase.");
    await loadPosts();
  } catch (error) {
    setMessage("postMessage", "Publication impossible : " + error.message);
  } finally { setButtonLoading(button, false, "Publier l'analyse"); }
});
$("refreshBtn").addEventListener("click", loadPosts);
if (db) {
  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    authReady = true;
    updateUI();
    Promise.resolve().then(loadPosts);
  });
  db.auth.getSession().then(({ data, error }) => {
    if (error) {
      setMessage("authMessage", error.message);
      return;
    }
    currentUser = data.session?.user ?? currentUser;
    authReady = true;
    updateUI();
    loadPosts();
    $("connection").textContent = "Supabase connecté";
  }).catch(() => {
    $("connection").textContent = "Erreur de connexion";
    setMessage("authMessage", "Impossible de vérifier la session.");
  });
} else {
  $("connection").textContent = "Supabase indisponible";
  setMessage("authMessage", "Vérifiez votre connexion Internet et le CDN.");
  authReady = true;
  updateUI();
  loadPosts();
}
