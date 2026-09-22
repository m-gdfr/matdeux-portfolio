# Spec, gestion du contenu et build

2026-09-20

**Statut** : à implémenter · **Portée** : outillage, aucun changement visible · **Dépend de** : specs 02-projets et 03-parcours

---

## Contexte & persona

Les sections Projets et Parcours sont du contenu qui bouge : un projet livré, un poste qui change, un résultat à requalifier. Aujourd'hui ce contenu vit à deux endroits différents et tous les deux dans `index.html` : un tableau `PROJETS` dans le script, et cinquante lignes de markup écrites en dur pour le Parcours. Mettre à jour son parcours suppose donc d'ouvrir un fichier de 1500 lignes et d'éditer du HTML au milieu du code qui l'anime.

### Persona cible

L'auteur du portfolio. Il met le site à jour trois ou quatre fois par an, souvent à chaud, souvent entre deux choses. Il n'a aucune envie de relire une feuille de style pour ajouter une ligne de parcours, et il ne doit pas pouvoir casser le défilement de la section Projets en corrigeant une date.

Le recruteur est le bénéficiaire indirect : le contenu doit être présent dans le HTML servi, pas injecté après coup.

### Décision d'architecture

Une base de données a été envisagée et écartée. Le site est statique, destiné à Vercel, et compte une dizaine d'entrées de contenu. Une base imposerait des fonctions serverless, un pooling de connexions, un secret d'environnement et un démarrage à froid, c'est à dire une page qui peut répondre en erreur là où elle ne peut aujourd'hui que s'afficher. Le contenu part donc dans des fichiers versionnés, et git tient l'historique des versions.

---

## Releases & user stories

Une seule release. Le découpage n'a d'intérêt que complet : extraire les projets sans le parcours laisserait le contenu à deux endroits, ce qui est exactement le problème de départ.

| # | User story | Criticité |
| --- | --- | --- |
| US1 | En tant qu'auteur, quand j'ajoute ou modifie un projet, je veux éditer un seul fichier de données pour ne pas avoir à toucher au HTML ni au script. | Critique |
| US2 | En tant qu'auteur, quand j'ajoute ou modifie une expérience, je veux éditer un seul fichier de données, avec le même geste que pour un projet. | Critique |
| US3 | En tant qu'auteur, quand je pousse un commit, je veux que le site se régénère et se déploie sans action de ma part. | Critique |
| US4 | En tant que recruteur, quand j'arrive sur la page, je veux que les projets et le parcours soient dans le HTML servi, pour les voir même si le script tarde ou échoue. | Critique |
| US5 | En tant qu'auteur, quand je travaille en local, je veux voir le site final avant de pousser. | Normale |
| US6 | En tant qu'auteur, quand j'écris un contenu incomplet, je veux que le build échoue avec un message clair plutôt que de publier une ligne cassée. | Normale |
| US7 | En tant qu'auteur, quand je rédige une page projet, je veux saisir son chapô et ses quatre blocs dans un fichier dédié, sans redonner le nom, le client et la date déjà écrits pour la liste. | Critique |

---

## Critères d'acceptation

### US1. Éditer un projet

- **ÉTANT DONNÉ** que je veux ajouter un projet, **QUAND** j'ajoute un objet dans `content/projets.json` et que je lance le build, **ALORS** la ligne apparaît dans la section Projets, à sa place dans l'ordre du fichier, sans aucune autre modification.
- **ÉTANT DONNÉ** que j'ai modifié la date ou le client d'un projet existant, **QUAND** je lance le build, **ALORS** seule cette ligne change dans la page produite.
- **ÉTANT DONNÉ** que j'ai réordonné les objets du fichier, **QUAND** je lance le build, **ALORS** l'ordre d'affichage suit le fichier, et le premier projet du fichier est celui qui est net à l'arrivée dans la section.

### US2. Éditer une expérience

- **ÉTANT DONNÉ** que j'ajoute un objet dans `content/parcours.json`, **QUAND** je lance le build, **ALORS** l'expérience apparaît dans l'accordéon, repliée, et son ouverture au clic fonctionne sans code supplémentaire.
- **ÉTANT DONNÉ** qu'une expérience porte l'identifiant `anyway`, **QUAND** j'ouvre la page avec `#xp-anyway`, **ALORS** cette expérience est ouverte à l'arrivée, comme aujourd'hui.

### US3. Déploiement

- **ÉTANT DONNÉ** que je pousse un commit sur la branche principale, **QUAND** Vercel construit le projet, **ALORS** il exécute la commande de build et publie le dossier de sortie, sans configuration manuelle à chaque déploiement.
- **ÉTANT DONNÉ** que le build échoue, **QUAND** Vercel traite le commit, **ALORS** le déploiement est annulé et la version précédente reste en ligne.

### US4. Contenu dans la source

- **ÉTANT DONNÉ** que je consulte le HTML servi, **QUAND** je cherche le nom d'un projet ou d'une expérience, **ALORS** il est présent dans le document, sans exécution de script.
- **ÉTANT DONNÉ** que le script de la page est bloqué ou échoue, **QUAND** j'affiche la page, **ALORS** les cinq lignes de projet et les expériences sont lisibles, même sans le flou ni l'accordéon.

### US5. Travail en local

- **ÉTANT DONNÉ** que je suis dans le dossier du projet, **QUAND** je lance la commande de build puis un serveur statique sur le dossier de sortie, **ALORS** j'obtiens le site final tel qu'il sera déployé.

### US6. Contenu invalide

- **ÉTANT DONNÉ** qu'un projet n'a pas d'identifiant, de nom, de date ou de client, **QUAND** je lance le build, **ALORS** le build s'arrête, nomme le fichier, l'index de l'entrée et le champ manquant, et n'écrit rien dans le dossier de sortie.
- **ÉTANT DONNÉ** que deux expériences portent le même identifiant, **QUAND** je lance le build, **ALORS** le build s'arrête et nomme le doublon, parce que les identifiants servent d'ancres et d'attributs `aria-controls`.

### US7. Contenu d'une page projet

- **ÉTANT DONNÉ** que je rédige une page projet, **QUAND** j'ajoute un objet dans `content/page-projet.json` avec l'`id` du projet, son chapô et ses quatre blocs, **ALORS** je n'ai ni nom, ni client, ni date à ressaisir : ils viennent de `content/projets.json`.
- **ÉTANT DONNÉ** que je modifie le nom ou la date d'un projet dans `content/projets.json`, **QUAND** je lance le build, **ALORS** la liste et la page projet affichent la même valeur, sans second endroit à corriger.
- **ÉTANT DONNÉ** qu'un média déclaré n'existe pas sur le disque, **QUAND** je lance le build, **ALORS** le build s'arrête et nomme le chemin introuvable, plutôt que de publier une page au visuel cassé.
- **ÉTANT DONNÉ** qu'une entrée de `content/page-projet.json` porte un `id` absent de `content/projets.json`, **QUAND** je lance le build, **ALORS** le build s'arrête et nomme l'identifiant orphelin.

---

## Architecture cible

```
content/projets.json     contenu, édité à la main
content/parcours.json    contenu, édité à la main
content/page-projet.json contenu, édité à la main
src/index.html           gabarit, l'index.html actuel moins le contenu
src/assets/              dust.js et les polices, déplacés tels quels
build.mjs                le script de génération
dist/                    la sortie, ignorée par git
```

`prototypes/` et `specs/` ne sont pas copiés dans `dist/`. Ils restent dans le dépôt, ils ne sont pas publiés.

### Format de `content/projets.json`

Tableau d'objets. Les champs reprennent exactement ceux du tableau `PROJETS` actuel.

| Champ | Type | Obligatoire | Usage |
| --- | --- | --- | --- |
| `id` | chaîne, sans espace ni accent | Oui | Clé de jointure avec `content/page-projet.json`, et futur segment d'URL de la page projet |
| `date` | chaîne | Oui | Affichée telle quelle dans `.f-date` |
| `nom` | chaîne | Oui | Affiché dans `.f-name`, et repris dans l'`aria-label` de la ligne |
| `client` | chaîne | Oui | Affiché dans `.f-theme`. Remplace l'ancien champ `theme` |
| `media` | objet | Oui | La miniature de la ligne. Format décrit plus bas. Type `image` uniquement |
| `a`, `b`, `c` | couleurs hexadécimales | Oui | Les trois arrêts du dégradé affiché pendant le chargement de la miniature |

L'ordre du tableau est l'ordre d'affichage. Les cinq projets actuels sont repris tels quels, aucune donnée n'est inventée ni reformulée au passage. Seul le champ `theme` devient `client` : le nom du champ change, la valeur est reprise telle quelle. Les cinq valeurs actuelles décrivent un domaine et non un client, elles sont donc à réécrire. C'est un travail d'écriture, hors de ce chantier, et le build ne le vérifie pas : il ne peut pas distinguer un nom de client d'un nom de domaine.

Le dégradé change de statut. Il était le visuel de substitution en attendant les vrais visuels, il devient le fond de chargement de la miniature, celui que l'attribut `data-loading` gère déjà. Les trois couleurs restent donc obligatoires, et gagnent à être prélevées dans la miniature pour que la transition ne saute pas.

`media` est obligatoire dans `content/projets.json` : c'est l'US8 de la spec 02, un projet sans visuel ne se publie pas. Le build refuse un projet sans miniature.

La classe CSS `.f-theme` n'est pas renommée. Le champ de données change de nom, la feuille de style non : un renommage de classe ferait entrer ce chantier dans le CSS de la section Projets, ce que la recette d'équivalence interdit. L'écart de nommage est assumé et documenté ici.

### Format de `content/page-projet.json`

Le contenu des pages projet, défini par la spec 04. Tableau d'objets, un par projet.

Trois champs sont partagés avec `content/projets.json` et ne sont **pas** redupliqués ici : `nom`, `client` et `date`. Ils sont lus depuis `content/projets.json` au moment du build et joints par `id`. Une donnée écrite à deux endroits finit par diverger, et c'est exactement ce que ce chantier cherche à éviter.

| Champ | Type | Obligatoire | Usage |
| --- | --- | --- | --- |
| `id` | chaîne | Oui | Doit correspondre à un `id` de `content/projets.json`. Porte la jointure |
| `chapo` | chaîne | Oui | Une à deux phrases en tête de page, donnant le projet **et son résultat**. Garde-fou posé par la spec 04, puisque le bloc Résultat arrive en fin de page |
| `contexte` | chaîne | Oui | Le point de départ, le problème, la contrainte. Bloc S du gabarit STAR de la spec 04 |
| `enjeu` | chaîne | Oui | L'objectif à atteindre et le périmètre confié. Bloc T |
| `demarche` | chaîne | Oui | Ce qui a été fait personnellement. Méthode, décisions, arbitrages. Bloc A |
| `perimetre` | tableau de chaînes | Oui | Les missions tenues sur le projet. Par exemple `["Recherche utilisateur", "Modèle d'information", "Parcours de création", "Design system"]`. De 2 à 6 entrées, chacune de 5 mots au plus |
| `resultat` | chaîne | Oui | Ce que ça a produit, chiffré ou daté. Bloc R |
| `media` | objet | Oui | Le visuel d'en-tête de la page. Image ou vidéo. Format décrit plus bas |

`perimetre` est une liste, pas une phrase. C'est ce que le recruteur balaie en premier pour savoir si le projet parle de son besoin, et une liste se balaie, un paragraphe se lit. Le gabarit de la spec 04 l'affichera comme tel, à côté de l'en-tête et non dans le corps du texte.

Correspondance avec la spec 04 : `contexte` vaut Situation, `enjeu` vaut Task, `demarche` vaut Action, `resultat` vaut Result. Les noms français font foi dans les fichiers de contenu, le vocabulaire STAR reste celui de la spec 04.

Un point reste ouvert. L'en-tête de page de la spec 04 demande le rôle tenu **et** le client. Le champ partagé étant désormais le client, le rôle tenu n'existe plus dans les données : soit il entre dans le chapô, soit la spec 04 le retire de son en-tête, soit un champ `role` propre à la page projet est ajouté ici. À trancher avant l'implémentation des pages.

### Format d'un objet `media`

Même forme dans les deux fichiers, une seule règle à retenir.

| Champ | Type | Obligatoire | Usage |
| --- | --- | --- | --- |
| `type` | `"image"` ou `"video"` | Oui | `"video"` est refusé dans `content/projets.json` |
| `src` | chemin relatif à la racine du site | Oui | Par exemple `assets/media/atlas.webp` |
| `alt` | chaîne | Oui pour une image | Description, jamais le nom du projet répété |
| `poster` | chemin | Oui pour une vidéo | L'image affichée avant lecture, et la seule chose affichée en animations réduites |
| `w`, `h` | entiers | Oui | Dimensions en pixels de la source. Elles réservent la place et évitent que la page saute pendant le chargement, ce que l'US7 de la spec 02 demande explicitement |

Les fichiers vivent dans `src/assets/media/`, recopié dans `dist/assets/media/` par le build. Ils sont versionnés avec le reste.

**Images.** WebP ou AVIF. Le JPEG reste accepté, il n'est simplement pas le bon choix par défaut.

**Vidéos.** MP4 en H.264, plus un WebM en AV1 ou VP9 si le poids le justifie. Toujours sans piste audio : une vidéo de portfolio qui ne fait pas de bruit n'a pas besoin de commande de son, et le navigateur n'autorise la lecture automatique que si elle est muette. Le gabarit de la spec 04 la posera en boucle, muette, `playsinline`, avec `preload="metadata"` et le `poster` affiché tant que la lecture n'a pas commencé.

**Plafond.** 5 Mo par vidéo, poster compris. Au delà, le fichier ne va pas dans le dépôt : il part chez un hébergeur de vidéo et le champ `src` devient l'URL d'un lecteur externe. Ce cas n'est pas couvert par ce format, il fera l'objet d'un champ `type: "embed"` le jour où il se présente. Le build émet un avertissement à partir de 3 Mo et échoue au delà de 5 Mo.

**Animations réduites.** Sous `prefers-reduced-motion`, la vidéo ne démarre pas et le `poster` tient la place. C'est pour ça qu'il est obligatoire et pas facultatif.

Le build valide ce fichier dès maintenant. Il ne génère pas encore les pages : leur gabarit relève de l'implémentation de la spec 04.

### Format de `content/parcours.json`

| Champ | Type | Obligatoire | Rôle |
| --- | --- | --- | --- |
| `id` | chaîne, sans espace | Oui | Alimente `data-id`, `id="xp-<id>"`, `id="fold-<id>"` et `aria-controls`. Sert d'ancre de lien profond |
| `nom` | chaîne | Oui | `.xp__name`, et `aria-label` de la région dépliée |
| `dates` | chaîne | Oui | `.xp__dates` |
| `role` | chaîne | Oui | `.xp__role` |
| `body` | chaîne | Oui | `.xp__body` |

### Repères dans le gabarit

Deux emplacements, aux endroits qui existent déjà dans `index.html` :

```html
<div class="projets__list" id="projets-list"><!-- projets --></div>
<ul class="xp-list"><!-- parcours --></ul>
```

Un repère absent du gabarit fait échouer le build. Le script ne doit jamais écrire une sortie dans laquelle un repère serait resté en place.

---

## Contrat du script `build.mjs`

Node seul, aucune dépendance, aucun `package.json` nécessaire au delà de `{"type": "module"}` si besoin.

Le script, dans cet ordre :

1. Lit les deux fichiers de contenu et les valide selon les tableaux ci dessus. Toute erreur arrête le script avec un code de sortie non nul et un message qui nomme le fichier, l'index et le champ.
2. Échappe le texte destiné au HTML. Les contenus sont français et contiennent des apostrophes et des esperluettes, les `<`, `>` et `&` doivent être échappés.
3. Construit le markup des projets avec les fonctions `ligne()` et `visual()` déplacées depuis le script de la page, inchangées dans leur logique. L'identifiant du dégradé reste `pj-g<index>`.
4. Construit le markup du parcours, reproduisant exactement la structure actuelle d'un `<li class="xp">`, y compris `h3 style="margin:0"`, `aria-expanded="false"`, `role="region"` et les attributs d'accessibilité.
5. Remplace les deux repères dans le gabarit, écrit `dist/index.html`, recopie `src/assets/` dans `dist/assets/`.

Le script est idempotent : deux exécutions de suite produisent le même fichier.

---

## Modifications dans la page

### Le tableau `PROJETS` disparaît du script

Il n'a plus de raison d'être côté navigateur. Les fonctions `ligne()` et `visual()` partent avec lui, dans `build.mjs`.

### `build()` ne construit plus, il mesure

La fonction actuelle crée les cinq boutons puis mesure. Elle ne fait plus que reprendre ce qui est déjà dans la page :

```js
function build() {
  rows = [...list.querySelectorAll('.row')];
  inners = rows.map((r) => r.querySelector('.row__inner'));
  applied = rows.map(() => ({ blur: -1, fade: -1 }));
  loadVisuals(); measure(); paint(true);
}
```

Tout le reste du module Projets, la loi du flou, l'élection du projet net, le calage, la bande de défilement, `measure`, `paint` et `settle`, est inchangé. C'est la contrainte principale de ce chantier : le comportement au défilement ne doit pas être retouché à cette occasion.

### Le module Parcours n'est pas modifié

Il lit déjà le DOM et ne construit rien. Le markup généré doit donc lui être indiscernable du markup actuel.

---

## Configuration Vercel

| Réglage | Valeur |
| --- | --- |
| Framework Preset | Other |
| Build Command | `node build.mjs` |
| Output Directory | `dist` |
| Install Command | vide, aucune dépendance |

`dist/` est ajouté au `.gitignore`.

En local, `node build.mjs && npx serve dist`.

---

## Cas limites

| Situation | Comportement attendu |
| --- | --- |
| Un champ obligatoire manque | Le build échoue, nomme le fichier, l'index et le champ. Rien n'est écrit dans `dist/` |
| Deux expériences ont le même `id` | Le build échoue et nomme le doublon |
| Un `id` d'expérience contient un espace ou un accent | Le build échoue. Ces identifiants deviennent des ancres d'URL |
| Une couleur n'est pas un hexadécimal valide | Le build échoue. Une couleur invalide passe silencieusement dans le dégradé et donne un visuel noir |
| `content/projets.json` est un tableau vide | Le build échoue. La section Projets sans projet n'a pas de sens, et le calcul de la bande de défilement suppose au moins une ligne |
| Le JSON est mal formé | Le message d'erreur nomme le fichier avant de laisser remonter l'erreur d'analyse |
| Un repère est absent du gabarit | Le build échoue |
| Un `id` de `page-projet.json` n'existe pas dans `projets.json` | Le build échoue et nomme l'identifiant orphelin |
| Deux entrées de `page-projet.json` portent le même `id` | Le build échoue et nomme le doublon |
| Un projet de `projets.json` n'a pas d'entrée dans `page-projet.json` | Avertissement, non bloquant. Tant que les pages ne sont pas générées, un projet sans page reste une ligne cliquable sans destination, ce que la spec 02 traite déjà |
| Un `media` pointe un fichier absent de `src/assets/media/` | Le build échoue et nomme le chemin |
| Un `media` de type `video` dans `content/projets.json` | Le build échoue. Cinq vidéos en lecture simultanée dans la liste sont incompatibles avec le budget d'image de la section |
| Un `media` de type `video` sans `poster` | Le build échoue |
| `w` ou `h` absents, ou ne correspondant pas au fichier | Le build échoue. Des dimensions fausses font sauter la mise en page au chargement |
| Une vidéo dépasse 3 Mo, puis 5 Mo | Avertissement, puis échec |
| `perimetre` compte moins de 2 ou plus de 6 entrées | Le build échoue |
| Un bloc `resultat` ne contient ni chiffre ni date | Avertissement, non bloquant, conformément à la règle éditoriale de la spec 04 |
| Le nombre de projets dépasse une dizaine | Aucune erreur, mais la spec 02 documente le seuil au delà duquel le calage doit être assoupli. Le build peut émettre un avertissement à partir de 10 |

---

## Recette

À vérifier après implémentation, dans l'ordre.

1. **Équivalence de la sortie.** `dist/index.html` produit à partir du contenu actuel est comparé à l'`index.html` d'aujourd'hui. Les seules différences admises sont l'indentation, les commentaires de code déplacés et la disparition du tableau `PROJETS`. Aucune classe, aucun attribut, aucun identifiant ne change.
2. **Défilement Projets.** Un projet net à la fois, calage au repos, aucun arrêt entre deux lignes, zoom du visuel net seul. Sur desktop et sur mobile.
3. **Accordéon Parcours.** Ouverture, fermeture, une seule expérience ouverte à la fois si c'est le comportement actuel, `aria-expanded` correct.
4. **Lien profond.** `#xp-anyway` ouvre la bonne expérience à l'arrivée.
5. **Animations réduites.** Avec `prefers-reduced-motion`, le flou reste, les déplacements disparaissent.
6. **Sans JavaScript.** Les cinq projets et les trois expériences restent lisibles.
7. **Ajout à blanc.** Ajouter un sixième projet et une quatrième expérience dans les fichiers de contenu, relancer le build, vérifier qu'ils s'affichent, puis les retirer.
8. **Jointure des pages projet.** Modifier le nom d'un projet dans `content/projets.json`, relancer le build, vérifier que la validation de `content/page-projet.json` passe toujours et qu'aucun nom n'est à corriger ailleurs. Introduire un `id` orphelin, vérifier l'échec et le message.
9. **Médias.** Vérifier qu'aucune ligne de projet ne saute au chargement de sa miniature, que le dégradé cède la place à l'image sans rupture, et que sous `prefers-reduced-motion` une vidéo de page projet reste sur son poster.
10. **Échec propre.** Retirer un champ obligatoire, vérifier le message et le code de sortie, vérifier que `dist/` n'a pas été touché.

---

## Hors périmètre

- Toute modification du comportement au défilement, du flou ou de l'accordéon.
- La génération des pages projet elles mêmes, gabarit et mise en page, qui relève de l'implémentation de la spec 04. Ce chantier définit et valide leur fichier de contenu, il ne produit pas encore de page.
- L'arbitrage du rôle tenu dans l'en-tête de la spec 04, et la réécriture éditoriale des cinq valeurs `client`.
- Une interface d'édition. Si le besoin apparaît, un CMS git écrira dans ces mêmes fichiers, sans rien changer à la chaîne décrite ici.
- Les vrais visuels de projet. Ils restent l'obligation d'édition posée par US8 de la spec 02, et prendront un champ `visuel` dans `content/projets.json`.
