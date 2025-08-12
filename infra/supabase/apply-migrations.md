# 🗄️ Guide d'application des migrations Supabase

## 📍 **Étape 1 : Accéder à votre projet**
- **URL** : https://supabase.com/dashboard/project/hyglnwkdthdewhqeqqss
- **Cliquez** sur "SQL Editor" dans le menu de gauche

## 📋 **Étape 2 : Migration 001 (Schéma initial)**
1. **Copiez** tout le contenu de `001_initial_schema.sql`
2. **Collez** dans l'éditeur SQL
3. **Cliquez** sur "Run" (▶️)
4. **Vérifiez** que vous voyez "Query returned successfully"

## 🔒 **Étape 3 : Migration 002 (Politiques RLS)**
1. **Copiez** tout le contenu de `002_rls_policies.sql`
2. **Collez** dans l'éditeur SQL
3. **Cliquez** sur "Run" (▶️)
4. **Vérifiez** que vous voyez "Query returned successfully"

## ✅ **Étape 4 : Vérification**
1. **Cliquez** sur "Table Editor" dans le menu
2. **Vérifiez** que vous voyez ces tables :
   - `shops`
   - `analytics_events`
   - `mapping_jobs`
   - `theme_adapters`
   - `adlign_variants`

## 🚨 **En cas d'erreur**
- Vérifiez que vous êtes bien dans le bon projet
- Assurez-vous que l'extension `uuid-ossp` est disponible
- Contactez-moi si vous avez des erreurs spécifiques
