
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const $ = (id) => document.getElementById(id);

const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT") &&
  SUPABASE_KEY.length > 20 &&
  !SUPABASE_KEY.includes("YOUR_SUPABASE");

let db = null;
let currentUser = null;

if (configured && window.supabase) {
  db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

function message(id, text) {
  $(id).textContent = text;
}

function updateUI() {
  $("authPanel").querySelector("form").classList.toggle(
    "hidden", !!currentUser
  );
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  $("postForm").classList.toggle("hidden", !currentUser);
}

async function refreshSession() {
  if (!db) {
    $("connection").textContent = "Configuration requise";
    message("authMessage", "Ampidiro aloha ny URL sy key Supabase.");
    $("posts").replaceChildren();
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Miandry ny configuration Supabase.";
    $("posts").append(p);
    updateUI();
    return;
  }

  const { data, error } = await db.auth.getSession();
  if (error) {
    message("authMessage", error.message);
    return;
  }

  currentUser = data.session?.user ?? null;
  $("connection").textContent = "Supabase connecté";
  updateUI();
  await loadPosts();
}

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) return message("authMessage", "Configurez Supabase d'abord.");

  const email = $("email").value.trim();
  const password = $("password").value;

  $("loginBtn").disabled = true;
  try {
    const { error } = await db.auth.signInWithPassword({
      email, password
    });
    message("authMessage", error
      ? error.message
      : "Connexion réussie.");
    if (!error) await refreshSession();
  } finally {
    $("loginBtn").disabled = false;
  }
});

$("signupBtn").addEventListener("click", async () => {
  if (!db) return message("authMessage", "Configurez Supabase d'abord.");

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || password.length < 6) {
    return message("authMessage", "Vérifiez l'e-mail et le mot de passe.");
  }

  $("signupBtn").disabled = true;
  try {
    const { data, error } = await db.auth.signUp({
      email, password
    });
    if (error) throw error;

    message("authMessage", data.session
      ? "Compte créé. Vous êtes connecté."
      : "Compte créé. Vérifiez votre e-mail pour confirmer l'inscription.");

    await refreshSession();
  } catch (error) {
    message("authMessage", error.message);
  } finally {
    $("signupBtn").disabled = false;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) return message("authMessage", error.message);

  currentUser = null;
  updateUI();
  message("authMessage", "Déconnexion réussie.");
});

$("postForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!db || !currentUser) {
    return message("postMessage", "Connectez-vous pour publier.");
  }

  const title = $("postTitle").value.trim();
  const body = $("postBody").value.trim();

  if (!title || !body) return;

  $("publishBtn").disabled = true;
  try {
    const { error } = await db.from("analyses").insert({
      user_id: currentUser.id,
      title,
      body
    });

    if (error) throw error;

    $("postForm").reset();
    message("postMessage", "Analyse publiée.");
    await loadPosts();
  } catch (error) {
    message("postMessage", error.message);
  } finally {
    $("publishBtn").disabled = false;
  }
});

async function loadPosts() {
  if (!db) return;

  $("posts").replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Chargement...";
  $("posts").append(loading);

  const { data, error } = await db
    .from("analyses")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  $("posts").replaceChildren();

  if (error) {
    const p = document.createElement("p");
    p.className = "message";
    p.textContent = "Impossible de charger les analyses : " + error.message;
    $("posts").append(p);
    return;
  }

  if (!data.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Tsy mbola misy publication.";
    $("posts").append(p);
    return;
  }

  for (const item of data) {
    const article = document.createElement("article");
    article.className = "post";

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const date = document.createElement("small");
    date.textContent = new Date(item.created_at).toLocaleString();

    const body = document.createElement("p");
    body.textContent = item.body;

    article.append(heading, date, body);
    $("posts").append(article);
  }
}

$("refreshBtn").addEventListener("click", loadPosts);

if (db) {
  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateUI();
    // Aleo atao ivelan'ny callback ny asa async fanampiny.
    setTimeout(() => loadPosts(), 0);
  });
}

refreshSession();
