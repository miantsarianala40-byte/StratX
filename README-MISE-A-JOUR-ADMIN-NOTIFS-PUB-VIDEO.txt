MISE À JOUR STRATX — INSCRIPTION, ADMIN, NOTIFICATIONS ET PUBLICITÉ VIDÉO

FICHIERS À REMPLACER DANS LE PROJET VERCEL/GITHUB
- index.html
- app.js
- style.css
- premium_access.sql (à exécuter dans Supabase SQL Editor; ne pas simplement l'héberger)

1) INSCRIPTION
- Le formulaire garde le nom affiché et l'e-mail, puis demande un mot de passe et sa confirmation.
- Si la confirmation e-mail est activée dans Supabase, l'utilisateur doit ouvrir l'e-mail de confirmation avant de se connecter.
- Vérifier Supabase > Authentication > URL Configuration : Site URL = URL publique du site et Redirect URLs contient l'URL publique + /connexion et /mot-de-passe-oublie.

2) NOTIFICATIONS AUTOMATIQUES
- Exécuter tout le fichier premium_access.sql dans Supabase SQL Editor.
- Quand un membre envoie une demande Premium, un trigger SQL crée une notification pour chaque administrateur reconnu via auth.users.raw_app_meta_data.role = 'admin'.
- Quand l'administrateur accepte ou refuse, un trigger SQL crée une notification privée pour le membre concerné.
- Le centre se rafraîchit automatiquement environ toutes les 25 secondes lorsque la session est connectée; ouvrir l'onglet Notifications pour lire les messages.

3) PUBLICITÉ VIDÉO
- L'administrateur peut publier une publicité depuis l'emplacement « Espace publicitaire vidéo » sur l'accueil.
- Utiliser une URL HTTPS directe vers un fichier vidéo MP4 ou WebM hébergé en ligne; une page YouTube ordinaire n'est pas une URL de fichier vidéo directe.
- La vidéo est affichée avec commandes de lecture. Le navigateur ne la lance pas automatiquement avec son audio; cela évite de forcer le son et respecte les règles des navigateurs.

4) ADMIN
- Le compte admin doit avoir le rôle sécurisé app_metadata.role = 'admin' attribué côté Supabase, jamais via le formulaire public.
- Après le changement de rôle, se déconnecter puis se reconnecter pour actualiser la session.

IMPORTANT
- Ne jamais mettre la clé service_role dans le navigateur.
- Les triggers de notification s'exécutent côté base de données; l'utilisateur ne peut pas envoyer une notification à un autre compte depuis le client.
