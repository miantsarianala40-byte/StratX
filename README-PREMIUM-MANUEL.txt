STRATX — ACCÈS PREMIUM PAR VALIDATION MANUELLE

A. INSTALLATION
- Supabase > SQL Editor : exécuter premium_access.sql (la section Premium est aussi incluse à la fin de schema.sql). Après modification des tables/policies, relancer ce script.
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

CORRECTION RLS / PRIVILÈGES
- Les policies RLS ne suffisent pas seules : premium_access.sql accorde aussi les privilèges SQL nécessaires au rôle authenticated.
- Si l'espace admin affiche encore un refus, lire le message détaillé dans l'interface et vérifier que le compte connecté a app_metadata.role = admin, puis se déconnecter/reconnecter.
