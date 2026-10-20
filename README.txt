StratX — routes hiérarchiques

Fichier modifié : app.js uniquement.
Le vercel.json actuel du projet réécrit déjà les URL vers index.html, donc il n'est pas nécessaire de le remplacer pour ces routes.

Routes reconnues :
/accueil
/connexion
/inscription
/mot-de-passe-oublie
/aviator
/aviator/resultats
/aviator/historique
/aviator/statistiques
/aviator/ajouter
/jetx et les mêmes sous-routes
/cosmox et les mêmes sous-routes
/communaute
/profil

Les sous-routes sont reconnues par l'application et conservent le jeu correspondant. Certaines sous-routes réutilisent encore les éléments existants de la page Observations; elles ne constituent pas toutes des écrans séparés complets.
