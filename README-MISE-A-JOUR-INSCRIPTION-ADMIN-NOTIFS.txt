STRATX — MISE À JOUR INSCRIPTION ET NOTIFICATIONS

FICHIERS À REMPLACER DANS LE PROJET VERCEL/GITHUB
- index.html
- app.js
- style.css
- premium_access.sql (à exécuter dans Supabase SQL Editor; ne pas simplement l’héberger)

1) INSCRIPTION
- Nom et prénom obligatoires, adresse e-mail obligatoire, téléphone facultatif.
- L’utilisateur choisit un mot de passe puis le confirme; les deux doivent correspondre.
- Le nom et le téléphone sont enregistrés dans les métadonnées du compte Supabase Auth.
- Si la confirmation e-mail est activée, l’utilisateur doit ouvrir l’e-mail de confirmation avant de se connecter.
- Dans Supabase > Authentication > URL Configuration, vérifiez que Site URL correspond à l’URL publique du site et que Redirect URLs contient l’URL publique, /connexion et /mot-de-passe-oublie.
- Si aucun e-mail de confirmation n’arrive, vérifiez les paramètres SMTP / Email de Supabase et les courriers indésirables.

2) NOTIFICATIONS AUTOMATIQUES
- Exécuter tout le fichier premium_access.sql dans Supabase SQL Editor.
- Une demande Premium crée une notification destinée à l’Admin; une décision d’acceptation ou de refus crée une notification privée pour l’utilisateur concerné.
- Le centre de notifications se rafraîchit environ toutes les 25 secondes lorsque la session est connectée. Ce sont des notifications dans l’application, pas des notifications push du téléphone.

3) ADMIN
- Le compte Admin doit avoir le rôle sécurisé app_metadata.role = 'admin' attribué côté Supabase, jamais via le formulaire public.
- Après le changement de rôle, déconnectez-vous puis reconnectez-vous.

IMPORTANT
- La publicité vidéo a été retirée de l’interface et du SQL fourni.
- Ne mettez jamais la clé service_role dans le navigateur.
- Les résultats des jeux sont aléatoires; aucune simulation ne garantit un résultat futur.
