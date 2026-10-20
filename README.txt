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

MISE À JOUR SUPPLÉMENTAIRE (COMMUNAUTÉ / COMPTE / ACCUEIL)
- La Communauté affiche le nom public choisi par l'auteur, permet de supprimer ses propres publications et de publier des commentaires persistants dans Supabase.
- L'auteur d'une publication peut supprimer les commentaires de cette publication. Un commentaire peut aussi être supprimé par son auteur. Un compte admin doit être défini côté serveur dans app_metadata.role = 'admin' pour modérer tous les posts.
- Le module Football est verrouillé temporairement dans l'interface, en attendant l'intégration et la vérification d'une source de données.
- Le formulaire de création de compte demande le nom affiché, distinct de l'adresse e-mail.
- Le bouton de suppression de compte crée uniquement une demande en attente dans account_deletion_requests. Il ne supprime pas le compte et n'envoie pas, à lui seul, un e-mail de validation. Pour une suppression réellement confirmée par e-mail, il faut déployer une Supabase Edge Function sécurisée qui envoie et valide un jeton de confirmation avant d'utiliser l'Admin API côté serveur. Ne jamais effectuer cette suppression depuis le navigateur ni exposer la service_role key.

APRÈS LA MISE À JOUR
1. Exécutez schema.sql dans Supabase SQL Editor. Il ajoute author_name, community_comments et account_deletion_requests, avec les règles RLS correspondantes.
2. Redéployez ensemble index.html, style.css et app.js.
3. Testez avec deux comptes distincts : création, publication, suppression par l'auteur, commentaires, suppression d'un commentaire par son auteur et par l'auteur du post.
