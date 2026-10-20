STRATX — Fichiers de base
========================

Contenu :
- index.html : structure de l'application
- style.css  : interface responsive noir et or
- app.js     : authentification et publications Supabase
- schema.sql : table analyses et règles RLS

Installation :
1. Ouvrir Supabase Dashboard > SQL Editor.
2. Exécuter le contenu de schema.sql.
3. Vérifier que le fournisseur Email est activé dans Authentication.
4. Héberger ces fichiers via HTTPS (ou utiliser un serveur local).
5. Ouvrir index.html depuis le serveur et tester inscription, connexion et publication.

Le projet Supabase URL et la publishable key fournis ont été insérés dans app.js.
Ne jamais placer une service_role ou une secret key dans du code client.
Le code n'a pas été déployé ni testé sur le projet Supabase dans ce paquet.
