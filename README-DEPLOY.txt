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

VALIDATION MANUELLE DES PAIEMENTS PREMIUM
1. Dans Supabase > SQL Editor, exécutez le fichier premium_access.sql complet.
2. Pour donner le rôle administrateur, ouvrez Authentication > Users, choisissez le compte du responsable et ajoutez dans app_metadata le JSON {"role":"admin"}. Faites-le uniquement depuis le tableau de bord Supabase (jamais depuis le navigateur public). Déconnectez/reconnectez ce compte pour renouveler son JWT.
3. L'utilisateur connecté envoie une demande dans l'espace Premium avec le moyen de paiement, le montant et la référence de transaction. Ne demandez jamais son PIN ou code secret.
4. Le responsable se connecte avec son compte administrateur, ouvre l'espace Premium et vérifie d'abord le paiement dans son compte marchand. Le panneau « Demandes Premium à valider » permet ensuite d'approuver ou de refuser la demande. L'approbation active 30 jours à partir du moment de validation.
5. Sans le rôle app_metadata.role=admin, le panneau d'administration ne sera pas visible et les validations seront refusées par RLS.
6. Ce flux ne vérifie pas automatiquement les transferts : l'administrateur doit confirmer chaque paiement manuellement avant d'appuyer sur « Paiement vérifié ». Le client ne doit pas être activé sur la seule base d'une capture d'écran.
