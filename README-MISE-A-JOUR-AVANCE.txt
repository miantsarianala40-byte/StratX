STRATX — MISE À JOUR AVANCÉE

Contenu : index.html, app.js, style.css, premium_access.sql.

INSTALLATION
1. Remplacez les trois fichiers front-end dans votre projet GitHub/Vercel.
2. Dans Supabase > SQL Editor, exécutez le fichier premium_access.sql complet.
3. Vérifiez que le compte admin possède app_metadata.role = 'admin' dans auth.users, puis reconnectez ce compte.
4. Supabase > Authentication > URL Configuration : définissez Site URL sur l'URL publique Vercel et ajoutez cette même URL (et https://votre-domaine/* si besoin) aux Redirect URLs.
5. Pour les e-mails de confirmation/réinitialisation : activez Email provider. Pour une livraison fiable, configurez un SMTP personnalisé dans Supabase Authentication > SMTP Settings. Le code du site ne peut pas corriger un SMTP qui ne délivre pas les messages.
6. Redeployez Vercel et testez inscription, connexion, oubli de mot de passe, demande premium, acceptation et refus.

NOTES
- La validation d'abonnement est maintenant une fonction SQL transactionnelle stratx_review_premium_request, réservée au rôle admin; elle met à jour la demande et l'abonnement dans une transaction.
- Le bouton Premium est séparé de la navigation principale; les vues utilisateur et administrateur sont distinctes.
- Les notifications sont des notifications internes à l'application, pas des push mobiles.
- Les simulations de jeux restent illustratives, sans garantie de résultat.
