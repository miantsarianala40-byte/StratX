STRATX WEB APP — VERSION ACCUEIL
==================================

Fichiers :
- index.html : écran d'authentification et accueil après connexion
- style.css  : thème responsive noir et or
- app.js     : connexion/inscription Supabase, navigation, profil et analyses
- schema.sql : table analyses et règles RLS

Mise en route :
1. Dans Supabase Dashboard > SQL Editor, exécutez schema.sql.
2. Dans Authentication > Providers, vérifiez que Email est activé.
3. Déployez les fichiers sur un hébergement HTTPS ou utilisez un serveur local.
4. Créez un compte ou connectez-vous. Après authentification, l'accueil s'affiche.
5. Publiez une analyse et vérifiez la table public.analyses.

Le projet URL et la publishable key fournis sont intégrés dans app.js.
Ne placez jamais une service_role/secret key dans le code navigateur.
Ce paquet n'a pas été déployé ni testé contre votre projet Supabase. Il nécessite Internet.
Les analyses ne garantissent aucun résultat.
