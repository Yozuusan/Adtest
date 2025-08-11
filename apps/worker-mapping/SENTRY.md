# Sentry Integration

Ce document décrit l'intégration de Sentry pour le monitoring et la gestion des erreurs dans le worker mapping.

## Configuration

### Variables d'environnement

```bash
# Sentry DSN (obligatoire)
SENTRY_DSN=https://0b7d7e048c8c91312871957a0fbc8ba4@o4509821848059904.ingest.de.sentry.io/4509821850681424

# Environnement (optionnel, défaut: development)
NODE_ENV=production

# Version de l'application (optionnel, défaut: package.json version)
npm_package_version=0.1.0
```

### Fichier d'instrumentation

Le fichier `src/instrument.ts` initialise Sentry avec les configurations suivantes :

- **DSN** : Point d'entrée Sentry pour la collecte des données
- **Performance Monitoring** : Traces activées avec 100% de sampling
- **Environment** : Défini automatiquement selon NODE_ENV
- **Release** : Version de l'application
- **Debug Mode** : Activé en développement
- **BeforeSend** : Filtrage des données sensibles (headers auth, cookies)

## Utilisation

### Capture d'exceptions

```typescript
import Sentry from './instrument';

try {
  // Code qui peut échouer
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      jobId: 'job-123',
      shopId: 'shop-456',
      operation: 'processJob'
    },
    extra: {
      context: 'additional data',
      timestamp: new Date().toISOString()
    }
  });
}
```

### Capture de messages

```typescript
// Message d'information
Sentry.captureMessage('Operation completed successfully', 'info');

// Message d'avertissement
Sentry.captureMessage('Resource usage high', 'warning');

// Message d'erreur
Sentry.captureMessage('Critical system failure', 'error');
```

### Gestionnaires d'erreurs globaux

Le worker configure automatiquement :

- **uncaughtException** : Erreurs non capturées
- **unhandledRejection** : Promesses rejetées non gérées
- **SIGINT/SIGTERM** : Arrêt gracieux

## Monitoring

### Métriques collectées

- **Erreurs** : Exceptions avec contexte complet
- **Performance** : Temps d'exécution des opérations
- **Contexte** : Job ID, Shop ID, opération
- **Environnement** : Dev/Staging/Production

### Dashboard Sentry

Accédez au dashboard Sentry pour :

- Voir les erreurs en temps réel
- Analyser les tendances d'erreurs
- Configurer les alertes
- Surveiller les performances

## Tests

### Test de l'intégration

```bash
# Test Sentry avec une erreur simulée
npm run test:sentry
```

Ce test :
1. Simule une erreur
2. Capture l'erreur dans Sentry
3. Envoie un message de test
4. Vérifie l'intégration

### Configuration de test

Le fichier `src/test-config.ts` configure l'environnement de test :

- NODE_ENV=test
- Variables d'environnement par défaut
- Configuration Sentry identique à la production

## Déploiement

### Production

1. Définir `NODE_ENV=production`
2. Vérifier que `SENTRY_DSN` est configuré
3. Déployer avec la version correcte

### Développement

1. `NODE_ENV=development` (défaut)
2. Mode debug activé
3. Logs détaillés dans la console

## Dépannage

### Sentry ne fonctionne pas

1. Vérifier `SENTRY_DSN` dans les variables d'environnement
2. Vérifier la connectivité réseau
3. Consulter les logs de Sentry

### Trop d'erreurs capturées

1. Ajuster `tracesSampleRate` dans `instrument.ts`
2. Filtrer les erreurs non critiques avec `beforeSend`
3. Configurer les règles d'ignorance dans Sentry

## Support

Pour toute question sur l'intégration Sentry :

1. Consulter la [documentation officielle Sentry](https://docs.sentry.io/)
2. Vérifier les logs du worker
3. Consulter le dashboard Sentry
