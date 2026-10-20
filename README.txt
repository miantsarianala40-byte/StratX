STRATX — VERSION MVP CONNECTÉE À SUPABASE
========================================

Fonctions incluses
- Inscription / connexion par e-mail avec Supabase Auth.
- Accueil avec dernières publications et compteurs.
- Analyses sportives : compétition, équipes, observations et statistiques.
- Aviator, JetX, CosmoX : historique personnel de résultats déjà observés et calcul descriptif de moyenne / maximum.
- Communauté : publication et lecture des analyses.
- Profil et déconnexion.
- Sécurité de base via Row Level Security (RLS).

MISE EN SERVICE
1. Ouvrez votre projet Supabase.
2. Allez dans SQL Editor, créez une nouvelle requête, collez schema.sql et exécutez-la.
3. Vérifiez Authentication > Providers > Email.
4. Téléversez index.html, style.css et app.js sur un hébergeur HTTPS statique (par ex. Netlify, Cloudflare Pages ou GitHub Pages).
5. Testez la création de compte, confirmez l'e-mail si demandé, connectez-vous puis ajoutez une publication et une observation.
6. Dans Supabase, consultez Table Editor pour vérifier que les lignes sont enregistrées.

CONFIGURATION
Le projet utilise le Project URL et la publishable key fournis pour cette application. Une clé publishable peut être utilisée côté navigateur avec RLS activé. Ne mettez jamais une service_role key ou un mot de passe administrateur dans le code client.

LIMITES HONNÊTES
C'est un MVP fonctionnel côté code, mais il n'a pas été déployé ni testé en direct sur votre compte Supabase. L'application nécessite Internet, les tables créées par schema.sql et un hébergement HTTPS. Les résultats passés des jeux à hasard ne prédisent pas les résultats futurs. Aucun système de gain, signal garanti, automatisation de mise ou promesse de profit n'est inclus.

À AJOUTER PLUS TARD
- Profils publics / pseudonymes.
- Modération et signalement.
- Filtrage et recherche.
- Statistiques plus avancées.
- Interface administrateur sécurisée côté serveur.
