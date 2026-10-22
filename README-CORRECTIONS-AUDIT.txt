STRATX — CORRECTIONS APPORTÉES À CETTE VERSION

Fichiers modifiés :
- app.js
- index.html

Corrections :
1. Déconnexion : fermeture de session, nettoyage de l'état local, masquage de l'application privée et retour à /connexion.
2. Session absente : les URL privées redirigent vers /connexion au lieu de laisser une page privée ou une URL incohérente.
3. Connexion / inscription / mot de passe oublié : conservation de la bonne vue d'authentification lors de la navigation directe.
4. Observations : les routes canoniques /observations/aviator/, /observations/jetx/ et /observations/cosmox/ sont synchronisées avec le jeu choisi.
5. Sélection d'un mode de jeu : le nom du jeu, le formulaire d'observation et l'URL sont synchronisés afin d'éviter de conserver Aviator quand JetX ou CosmoX est sélectionné.
6. Les sections resultats, historique, statistiques et ajouter sont reconnues par le routeur.
7. Le lien de marque StratX ouvre maintenant la page d'accueil au lieu d'un lien # sans destination réelle.
8. Le message d'erreur de mot de passe est aligné sur la règle de 8 caractères appliquée par le formulaire.

Vérifications effectuées :
- Syntaxe JavaScript vérifiée avec node --check.
- Archive ZIP testée.
- Identifiants HTML dupliqués et cibles data-page/data-goto vérifiés.

Limites :
- Les opérations nécessitant le projet Supabase réel (authentification, politiques RLS, données et notifications) n'ont pas pu être testées de bout en bout depuis cette archive.
- Avant déploiement, sauvegardez la version en production. Déployez les fichiers du dossier StratX-main et vérifiez ensuite connexion, inscription, récupération du mot de passe, sélection des jeux, ajout d'observation, profil, communauté et déconnexion.
- Les sorties du calculateur sont illustratives et non des prédictions validées des résultats de jeux aléatoires.
