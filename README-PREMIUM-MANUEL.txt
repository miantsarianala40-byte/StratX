STRATX — ACCÈS PREMIUM PAR VALIDATION MANUELLE

A. INSTALLATION
- Supabase > SQL Editor : exécuter premium_access.sql.
- Déployer les fichiers du projet sur le dépôt GitHub connecté à Vercel, puis attendre Deployment = Ready.

B. CONFIGURER LE RESPONSABLE
- Supabase > Authentication > Users > choisir le compte administrateur.
- Dans les métadonnées privées app_metadata, définir : {"role":"admin"}.
- Ne pas mettre ce rôle dans user_metadata modifiable par l'utilisateur.
- Déconnecter puis reconnecter le compte admin pour rafraîchir son jeton.

C. FLUX UTILISATEUR
- L'utilisateur connecté ouvre Premium, sélectionne son moyen de paiement, entre le montant réellement payé et la référence de transaction, puis envoie la demande.
- Le statut reste pending et le calculateur reste verrouillé tant qu'aucun admin ne l'a approuvée.

D. VALIDATION ADMIN
- Ouvrir Premium avec le compte admin.
- Vérifier le paiement réel dans le compte marchand ou le reçu de transfert fiable.
- Cliquer « Paiement vérifié · Activer 30 jours » uniquement après confirmation. Cela crée/actualise l'abonnement actif pour 30 jours.
- Cliquer « Refuser » si le paiement n'est pas valide.

SÉCURITÉ
- N'exigez jamais de code PIN, mot de passe ou code OTP du client.
- Une référence saisie par l'utilisateur n'est pas une preuve suffisante en soi.
- Le flux est une validation manuelle, pas un paiement automatisé ni une vérification bancaire automatique.


OFFRES PREMIUM PAR DÉFAUT
- 7 jours : 2 000 Ar
- 30 jours : 5 000 Ar
- 90 jours : 12 000 Ar
Ces tarifs sont des valeurs initiales modifiables dans app.js (premiumPlans). L’accès expire selon expires_at. Les renouvellements ajoutent la durée à l’échéance existante si elle est encore active.

ADMINISTRATEUR
Le compte dont auth.users.raw_app_meta_data.role vaut "admin" a un accès Premium illimité sans ligne d’abonnement. Le tableau de bord affiche les demandes en attente, les abonnements actifs et les accès expirés. Les politiques RLS restent activées.

IMPORTANT
Les scénarios Aviator/JetX/CosmoX affichés par ce projet sont des simulations illustratives, pas des prédictions fiables ou garanties. Ne pas vendre un résultat comme certain.
