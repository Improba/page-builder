# Intégration backend

Ce document décrit comment implémenter le backend pour une application qui utilise `@improba/page-builder`. La bibliothèque est **uniquement frontend** : elle ne définit aucune route ni aucun appel HTTP. C’est à votre backend de fournir la persistance des pages et, optionnellement, des médias.

## Rôle du backend

- **Fournir les données de page** — Le frontend appelle une ou plusieurs routes pour obtenir le payload `IPageData` (mode lecture ou édition).
- **Persister les sauvegardes** — Lorsque l’utilisateur enregistre (bouton Sauvegarder ou Ctrl/Cmd+S), le frontend émet un événement `@save` avec un payload `IPageSavePayload`. L’application hôte doit envoyer ce payload au backend et le backend doit le stocker.
- **Optionnel : médias** — Les champs image/vidéo/URL sont aujourd’hui saisis en texte (URL). Si vous souhaitez un flux « upload de fichier », c’est à votre app de l’implémenter et de brancher l’événement `@upload` du MediaPicker (voir section Médias).

---

## Contrat entrant : données de page (GET)

Le frontend attend un seul type de payload pour afficher ou éditer une page : **`IPageData`**.

### Route recommandée

| Méthode | Route (exemple)        | Description                    |
|--------|-------------------------|--------------------------------|
| `GET`  | `/api/pages/:id`        | Retourne une page par identifiant. |

L’identifiant `:id` peut être l’`meta.id` de la page (string) ou un identifiant technique (ex. UUID, slug). C’est vous qui définissez la convention.

### Réponse attendue

- **Content-Type** : `application/json`
- **Corps** : un objet JSON conforme à `IPageData`.

Structure TypeScript (référence) :

```ts
interface IPageData {
  meta: IPageMeta;
  content: INode;
  layout: INode;
  maxId: number;
  variables: Record<string, string>;
}

interface IPageMeta {
  id: string;
  name: string;
  url: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt?: string;   // ISO 8601
  createdAt?: string;   // ISO 8601
}

interface INode {
  id: number;
  name: string;
  slot: string | null;
  props: Record<string, unknown>;
  children: INode[];
  readonly?: boolean;
}
```

- **meta** : métadonnées de la page (identifiant, nom, URL, statut, dates). Non modifiées par l’éditeur ; le backend les gère.
- **content** : racine de l’arbre de contenu éditable. Le nœud racine doit avoir `slot: null`.
- **layout** : racine de l’arbre de layout (enveloppe le contenu). Souvent un seul nœud (ex. `PbContainer`) avec `children` vides ou contenant un placeholder pour le contenu. Peut être marqué `readonly: true`.
- **maxId** : plus grand `id` de nœud présent dans l’arbre. **Obligatoire** pour que l’éditeur génère des IDs uniques lors de l’ajout de composants. Doit être cohérent avec les `id` des nœuds (≥ à tous les `id` du tree).
- **variables** : map clé/valeur (string/string) injectée dans les props au rendu (remplacement de `{{ VAR }}`). Non envoyée lors du save ; le backend les conserve et les renvoie à chaque GET.

### Exemple de réponse GET

```json
{
  "meta": {
    "id": "page-001",
    "name": "Accueil",
    "url": "/",
    "status": "published",
    "updatedAt": "2026-03-10T14:30:00Z",
    "createdAt": "2026-01-15T09:00:00Z"
  },
  "content": {
    "id": 1,
    "name": "PbSection",
    "slot": null,
    "props": { "padding": "32px" },
    "children": [
      {
        "id": 2,
        "name": "PbRow",
        "slot": "default",
        "props": { "gap": "24px" },
        "children": [
          {
            "id": 3,
            "name": "PbText",
            "slot": "default",
            "props": { "content": "<h1>Bienvenue</h1>", "tag": "div" },
            "children": []
          }
        ]
      }
    ]
  },
  "layout": {
    "id": 100,
    "name": "PbContainer",
    "slot": null,
    "props": { "maxWidth": "1200px" },
    "children": [],
    "readonly": true
  },
  "maxId": 100,
  "variables": {
    "COMPANY_NAME": "Improba"
  }
}
```

### Côté frontend (exemple)

```ts
const pageId = 'page-001'; // ou depuis la route /pages/:id
const res = await fetch(`/api/pages/${pageId}`);
if (!res.ok) throw new Error('Page not found');
const pageData: IPageData = await res.json();
```

- En **mode lecture** : utilisez `pageData` avec `<PageBuilder :page-data="pageData" mode="read" />`.
- En **mode édition** : utilisez le même `pageData` avec `mode="edit"` et gérez `@save` (voir ci‑dessous).

---

## Contrat sortant : sauvegarde (PUT / PATCH)

Quand l’utilisateur sauvegarde, le composant émet un événement **`save`** avec un payload **`IPageSavePayload`**. Seules les parties modifiables sont envoyées ; `meta` et `variables` restent côté backend.

### Payload émis par le frontend

```ts
interface IPageSavePayload {
  content: INode;   // Arbre de contenu mis à jour
  layout: INode;    // Arbre de layout mis à jour
  maxId: number;   // Nouveau maxId (à persister pour les prochains ajouts de nœuds)
}
```

### Route recommandée

| Méthode   | Route (exemple)     | Description                          |
|-----------|---------------------|--------------------------------------|
| `PUT`     | `/api/pages/:id`    | Remplace la page (ou seulement content/layout/maxId). |
| `PATCH`   | `/api/pages/:id`    | Met à jour partiellement (content, layout, maxId).     |

Convention courante : **PUT** pour « remplacer toute la ressource page » (en fusionnant vous‑même `meta` et `variables`), **PATCH** pour « mettre à jour uniquement content, layout et maxId ».

### Corps de la requête (exemple)

Le frontend envoie typiquement le `IPageSavePayload` en JSON :

```json
{
  "content": { "id": 1, "name": "PbSection", "slot": null, "props": {}, "children": [ ... ] },
  "layout":  { "id": 100, "name": "PbContainer", "slot": null, "props": {}, "children": [] },
  "maxId": 105
}
```

### Comportement attendu côté backend

1. **Identifier la page** via `:id` (correspondant à `meta.id` ou à votre clé métier).
2. **Fusionner** les champs reçus avec les données existantes :
   - Remplacer `content`, `layout` et `maxId` par les valeurs du payload.
   - **Ne pas** écraser `meta` ni `variables` avec le payload de save (ils n’y figurent pas).
3. **Persister** (base de données, fichier, etc.).
4. **Mettre à jour** `meta.updatedAt` si vous l’utilisez.
5. Répondre avec un **204 No Content** ou **200 OK** (éventuellement avec la page complète en corps si votre client la réutilise).

### Côté frontend (exemple)

```vue
<PageBuilder
  :page-data="pageData"
  mode="edit"
  @save="onSave"
  @change="onChange"
/>
```

```ts
async function onSave(payload: IPageSavePayload) {
  const pageId = pageData.value?.meta.id;
  if (!pageId) return;
  const res = await fetch(`/api/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Save failed');
  // Optionnel : mettre à jour pageData avec la réponse si le backend renvoie IPageData
}
```

---

## Validation côté backend

La bibliothèque exporte deux fonctions de validation que vous pouvez réutiliser côté serveur si vous exécutez du JavaScript/TypeScript :

- **`validatePageData(pageData: unknown): IValidationResult`** — Valide un objet complet `IPageData` (meta, content, layout, maxId, variables, structure des nœuds).
- **`validateNode(node: unknown, path?: string): IValidationResult`** — Valide un seul nœud (utile pour valider `content` ou `layout` isolément).

Recommandations :

1. **À la réception d’un GET** : avant d’envoyer une page au client, valider (ou au moins vérifier) que le payload stocké est un `IPageData` valide, pour éviter d’envoyer des données incohérentes.
2. **À la réception d’un save (PUT/PATCH)** : valider le payload reçu (par ex. `content` et `layout` avec `validateNode`, et que `maxId` est un entier ≥ max des `id` présents). En cas d’erreur, renvoyer **400 Bad Request** avec un corps décrivant les erreurs (la propriété `errors` de `IValidationResult` a la forme `{ path, message }[]`).

Exemple de structure d’erreur :

```json
{
  "error": "Validation failed",
  "details": [
    { "path": "content.children[0].id", "message": "Node id must be unique within the tree." }
  ]
}
```

Si vous n’utilisez pas JavaScript/TypeScript au backend, vous devrez réimplémenter les mêmes règles à partir de la doc (voir [JSON Schema](./architecture/json-schema.md), [Format JSON](./features/json-format.md)) et des implémentations de `validatePageData` / `validateNode` dans le code source.

---

## Règles métier à respecter côté backend

Lors de la **construction ou mise à jour** d’un `IPageData` (côté backend) :

1. **IDs uniques** — Chaque nœud doit avoir un `id` numérique unique dans toute la page. En pratique : entiers séquentiels, et `maxId` = maximum de tous les `id`.
2. **Racines** — Les nœuds racine `content` et `layout` doivent avoir `slot: null`.
3. **Slot par défaut** — Les enfants qui vont dans le slot par défaut doivent avoir `slot: "default"`.
4. **Enfants** — Les nœuds feuille doivent avoir `children: []` (tableau vide, pas d’omission).
5. **Variables** — Clés en UPPER_SNAKE_CASE par convention ; valeurs string uniquement.
6. **readonly** — Mettre `readonly: true` sur les nœuds de layout que l’utilisateur ne doit pas modifier (ex. conteneur global).

Détails et exemples : [Format JSON](./features/json-format.md#backend-formatting-guidelines).

---

## Médias (images, vidéos, URLs)

Aujourd’hui, les champs de type image/URL dans les composants intégrés (PbImage, PbVideo, etc.) sont saisis comme **URL texte**. Le composant **MediaPicker** fournit :

- Un champ pour coller/saisir une URL.
- Un bouton « Upload » qui **émet uniquement un événement `upload`** — la bibliothèque n’appelle aucune API.

Pour proposer un vrai flux d’upload :

1. Dans votre application, interceptez l’événement `@upload` (si vous utilisez un prop editor personnalisé qui wrap le MediaPicker) ou fournissez un mécanisme (sélecteur de fichier, drag & drop) qui appelle **votre** endpoint d’upload.
2. Votre backend expose par exemple :
   - **POST** `/api/media` (ou `/api/pages/:id/media`) : envoi de fichier, retourne une URL publique (ou un chemin) à stocker dans les props du nœud.
3. Une fois l’URL obtenue, mettez-la dans la prop correspondante (ex. `src`) du nœud ; le flux d’édition existant et le save enverront cette valeur dans `IPageSavePayload`.

Aucune route ni aucun format de body ne sont imposés par la bibliothèque pour l’upload.

---

## Sécurité

- **Frontend** : la lib sanitize HTML (richtext) et les URLs (liens, médias, arrière-plans) avant affichage. Ne pas désactiver ces contrôles en production.
- **Backend** : vous devez aussi valider et, si besoin, sanitizer les données reçues (save). En particulier :
  - Valider la structure (IDs uniques, noms de composants autorisés, types de props).
  - Pour le HTML dans les props (ex. `content` de PbText), appliquer une politique de contenu sûr (allowlist de balises/attributs) ou stocker du texte brut et laisser le frontend appliquer un rendu sécurisé.
  - Vérifier les URLs (schemes autorisés, pas de javascript:, etc.) pour les champs image/vidéo/lien.

---

## Codes HTTP et erreurs

| Code        | Usage recommandé |
|------------|-------------------|
| **200 OK** | GET page : retourner le corps `IPageData`. Optionnellement PUT/PATCH si vous renvoyez la page mise à jour. |
| **204 No Content** | PUT/PATCH save réussi sans corps. |
| **400 Bad Request** | Payload de save invalide (validation échouée). Corps : message + détails (ex. liste d’erreurs de validation). |
| **404 Not Found** | Page inexistante pour GET ou PUT/PATCH sur `:id` inconnu. |
| **409 Conflict** | Optionnel : conflit de version si vous faites du versioning optimiste. |
| **500 Internal Server Error** | Erreur serveur (à éviter d’exposer des détails sensibles au client). |

---

## Résumé des routes attendues

La bibliothèque **n’impose** aucune URL. Voici un résumé des routes que votre backend doit **au minimum** exposer pour une intégration complète :

| Méthode | Route (exemple)   | Body (requête)     | Réponse (succès)   |
|--------|--------------------|--------------------|--------------------|
| **GET**  | `/api/pages/:id`   | —                  | `200` + `IPageData` (JSON) |
| **PUT** ou **PATCH** | `/api/pages/:id` | `IPageSavePayload` (JSON) | `200` + optionnel body ou `204` |

Optionnel (médias) :

| Méthode | Route (exemple)   | Description |
|--------|--------------------|-------------|
| **POST** | `/api/media` ou `/api/pages/:id/media` | Upload de fichier ; retourne l’URL à stocker dans les props. |

---

## Références

- **[Format JSON](./features/json-format.md)** — Détail de `INode`, `IPageData`, variables, payload de save.
- **[JSON Schema (architecture)](./architecture/json-schema.md)** — Contraintes et bonnes pratiques sur les structures.
- **[Quick Start](./quickstart.md)** — Exemple de chargement de page depuis une API et gestion de `@save`.
- **Types et validation** : exportés depuis `@improba/page-builder` (`IPageData`, `IPageSavePayload`, `validatePageData`, `validateNode`). Voir la [référence API](./api/README.md).
