STRATX - PACK DE DEPLOIEMENT

IMPORTANT
Ce ZIP contient les fichiers du site à la racine. Ne déployez pas le ZIP comme un fichier .zip affiché sur le site : extrayez-le et importez le contenu dans le projet Vercel/Git.

CONTENU
- index.html, app.js, style.css : fichiers de l'application
- vercel.json : configuration de routage Vercel
- schema.sql : schéma initial de l'application (à exécuter seulement si ce projet Supabase n'a pas déjà reçu le schéma)
- premium_access.sql : table/permissions d'accès Premium à exécuter dans Supabase SQL Editor

DEPLOIEMENT VERCEL
1. Faites une copie de sauvegarde du projet actuel.
2. Dans le dossier du projet relié à Vercel/Git, remplacez index.html, app.js, style.css et vercel.json par ceux de ce pack. Conservez les autres fichiers déjà présents s'ils sont utilisés par votre projet.
3. Committez/poussez les modifications dans le dépôt Git relié à Vercel, ou importez le dossier extrait comme un nouveau projet Vercel.
4. Dans Vercel > Project > Deployments, vérifiez que le dernier déploiement est bien créé et indique Ready.
5. Ouvrez le site et forcez le rechargement (Ctrl+F5 sur ordinateur, ou videz le cache du navigateur sur mobile).

SUPABASE PREMIUM
1. Ouvrez le projet Supabase utilisé par le site > SQL Editor.
2. Exécutez premium_access.sql.
3. Ne réexécutez schema.sql sur une base existante sans vérifier son contenu, car il peut modifier les tables/politiques de l'application.
4. Pour qu'un compte soit Premium, il faut une entrée active valide dans premium_subscriptions pour l'ID utilisateur concerné. L'exécution SQL seule n'accorde pas automatiquement l'accès Premium à tous les utilisateurs.

NOTE
Le paiement automatique n'est pas configuré dans ce pack. L'activation des abonnements doit être contrôlée côté serveur après validation d'un paiement par un prestataire.
