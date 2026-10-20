STRATX PREMIUM — VERSION AMÉLIORÉE
=================================

CONTENU
- index.html : interface responsive premium (accueil, football, observations, communauté, profil).
- style.css : design sombre, accents dorés, cartes, logos de jeux et adaptation mobile.
- app.js : authentification Supabase, session, profil, enregistrements, statistiques descriptives et affichage.
- schema.sql : tables et politiques RLS Supabase, avec colonnes de date et policies ré-exécutables.

MISE EN PLACE
1. Décompressez ce ZIP.
2. Dans Supabase, ouvrez SQL Editor et exécutez schema.sql.
3. Dans Authentication > URL Configuration, configurez Site URL et les Redirect URLs vers l'adresse HTTPS où sera hébergée l'application.
4. Vérifiez Authentication > Providers > Email. Si la confirmation par e-mail est activée, le nouvel utilisateur doit confirmer son e-mail avant de se connecter.
5. Hébergez index.html, style.css et app.js ensemble sur un hébergement statique HTTPS.
6. Ouvrez le site et créez un compte. Les données sont sauvegardées dans Supabase.

FONCTIONS DISPONIBLES
- Connexion, création de compte, déconnexion et demande de réinitialisation du mot de passe par e-mail.
- Accueil premium avec métriques et activité récente.
- Fiches de rencontres de football ajoutées par l'utilisateur, avec compétition, équipes, date et notes statistiques.
- Trois espaces d'observation séparés : Aviator, JetX et CosmoX. Chaque espace affiche uniquement ses entrées et calcule une moyenne/maximale descriptives des valeurs enregistrées.
- Publications communautaires.
- Profil modifiable (nom affiché et présentation) enregistré dans les métadonnées de Supabase Auth.

LIMITES IMPORTANTES
- L'intégration Supabase utilise l'URL et la clé publique du projet configurées dans app.js. Une clé publique/publishable peut être utilisée dans le navigateur seulement si les politiques RLS sont correctement configurées. Ne placez jamais de clé service_role dans ce fichier.
- Cette version n'intègre pas automatiquement une API externe de résultats football : les fiches de rencontres sont ajoutées manuellement. Aucun score, match en direct ou statistique externe n'est inventé.
- Les observations des jeux sont des historiques descriptifs, pas des prédictions du prochain résultat. Les valeurs passées ne garantissent pas les résultats futurs.
- La connexion au projet Supabase et les e-mails d'authentification doivent être testés dans votre propre environnement après configuration de l'hébergement.
