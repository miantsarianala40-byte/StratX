STRATX PREMIUM — VERSION CORRIGÉE

Contenu
- index.html : interface premium
- style.css : design responsive noir/or
- app.js : authentification Supabase, analyses, observations historiques et chargement de rencontres football via API-Football
- schema.sql : tables et politiques RLS Supabase (réexécutable)

INSTALLATION
1. Ouvrez votre projet Supabase et allez dans SQL Editor.
2. Copiez tout le contenu de schema.sql, exécutez-le.
3. Dans Authentication > URL Configuration, configurez le Site URL avec l'URL HTTPS de votre site et ajoutez cette URL aux Redirect URLs.
4. Hébergez index.html, style.css et app.js sur un hébergement HTTPS.
5. Testez « Créer un compte ». Si la confirmation d'e-mail est activée, ouvrez l'e-mail reçu avant de vous connecter.

FOOTBALL
- Créez un compte auprès d'un fournisseur d'API football et utilisez votre clé personnelle dans la section « Football en direct & à venir ».
- La clé est conservée dans localStorage de ce navigateur; elle n'est pas envoyée à Supabase.
- Ce client interroge https://v3.football.api-sports.io/fixtures. Les limites de l'offre du fournisseur s'appliquent. Si le navigateur bloque les requêtes CORS, utilisez un backend/proxy HTTPS au lieu d'exposer la clé.
- Cette version affiche les fixtures, scores et statuts seulement. Elle ne contient ni cotes ni tickets de pari.

SUPABASE / SÉCURITÉ
- La clé intégrée est une clé publishable, jamais une clé service_role.
- N'exposez jamais la clé service_role dans le navigateur.
- Les politiques RLS permettent aux utilisateurs connectés de lire les publications et fiches de match, mais chacun ne peut insérer que ses propres données.
- Les observations Aviator/JetX/CosmoX sont un journal historique uniquement. Les résultats passés ne prédisent pas les résultats futurs.

LIMITES
Le code a été vérifié statiquement, mais il n'a pas été déployé ni testé en direct contre votre projet Supabase ou votre clé fournisseur. Les résultats football nécessitent une clé API valide et une connexion Internet.
