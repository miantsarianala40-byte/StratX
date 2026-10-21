STRATX — TARIFS PREMIUM À DURÉE LIBRE

Modifications:
- L'utilisateur choisit un nombre entier de jours entre 1 et 365.
- 1 jour démarre à 3 000 Ar et le prix progresse avec la durée jusqu'à 6 jours.
- 7 jours: prix stable entre 6 500 et 8 500 Ar.
- 30 jours: prix stable entre 25 000 et 35 000 Ar.
- Les durées intermédiaires sont calculées par interpolation entre les tarifs 7 jours et 30 jours.
- Au-delà de 30 jours, le prix est proportionnel au tarif de 30 jours.
- Le tarif choisi est déterministe et reste identique pendant des fenêtres de 3 jours; il ne change pas à chaque seconde.
- La demande envoyée à l'administration inclut le nombre exact de jours et le montant proposé.

INSTALLATION:
1. Déployer les fichiers modifiés via le dépôt GitHub lié à Vercel.
2. Exécuter le fichier premium_access.sql dans Supabase SQL Editor pour autoriser les durées de 1 à 365 jours.
3. L'administrateur doit vérifier manuellement le paiement reçu avant d'approuver la demande.

IMPORTANT:
- La tarification est calculée dans l'interface client; ce n'est pas une protection contre la falsification. En validation manuelle, vérifiez toujours le montant réellement reçu et la référence dans le compte marchand.
- Pour une tarification anti-fraude, il faudra déplacer le calcul du tarif vers une fonction serveur et empêcher les clients de choisir librement amount_ariary côté base de données.
- Les prix au-delà de 30 jours suivent la règle proportionnelle définie ici; adaptez-la si vous souhaitez une remise pour les longues durées.
