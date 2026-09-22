---
name: contenu
description: Remplir les trois tableaux de contenu du portfolio depuis une page de saisie, puis écrire content/*.json et lancer le build.
disable-model-invocation: true
---

# Contenu

Une page de saisie tient les trois tableaux qui alimentent le build. Mathieu
saisit dans le navigateur, l'agent relit et écrit le dépôt. Le dépôt et la page
sont deux copies de la même chose : la première étape de chaque passage est de
les remettre d'accord.

**Page :** https://claude.ai/artifact/EGqdVt2eHjibeXxGQBgP8e
(outils `Artifact` pour l'ouvrir, `ArtifactData` pour lire et écrire ses lignes)

| Collection | Fichier | Champs écrits, dans cet ordre |
|---|---|---|
| `projets` | `content/projets.json` | id, date, nom, client, a, b, c, media |
| `parcours` | `content/parcours.json` | id, nom, dates, role, body |
| `page-projet` | `content/page-projet.json` | id, chapo, contexte, enjeu, demarche, resultat, perimetre, chiffres, lien, github, media |

Le document porte un identifiant tiré au hasard par la page ; c'est le champ
`id` de son corps qui compte, jamais l'identifiant du document. Pousser vers la
page se fait donc en écrivant sur l'identifiant existant, sinon l'entrée est
dédoublée. Le champ `ordre` range la liste, il ne part pas dans le JSON.
`chiffres`, `lien`, `github` et `media` sont facultatifs : ils sont omis quand
ils sont absents ou vides, jamais écrits sous forme de coquille. `lien` porte
son libellé parce qu'il nomme une chose différente à chaque projet ; `github`
est une simple URL, le gabarit pose son libellé.

`chiffres` est la rangée de chiffres clés posée en tête du bloc Résultat : de
deux à quatre objets `{ n, l }`, le nombre en huit caractères, le libellé en
trois mots. Elle se lit d'un coup d'œil ou elle ne sert à rien, d'où les
bornes. Le matériau se prend dans le Résultat lui-même, les mesures qu'il
énonce déjà, jamais un chiffre inventé pour remplir la rangée.

```json
"chiffres": [
  { "n": "42", "l": "avis exploitables" },
  { "n": "5", "l": "sources croisées" },
  { "n": "3", "l": "irritants priorisés" }
]
```

`media` désigne un fichier déposé dans `src/assets/media/`, et son chemin
s'écrit relatif à `src/`, donc `assets/media/nom.webp`.

`build.mjs` est le seul juge de la validité. La page prévient, le build trie.

Le bouton **Prévisualiser**, dans l'onglet Page projet, ouvre la carte projet
telle que le site la rendra, avec la saisie en cours, enregistrée ou non. Ce
n'est pas une réplique : l'onglet charge `dist/apercu.html`, le fichier que le
build écrit à côté de `dist/index.html`, même feuille de style et même fonction
de rendu que le site. La saisie voyage dans le fragment de l'adresse, seul canal
qui traverse l'artifact, lequel refuse les cadres et coupe le lien avec l'onglet
qu'il ouvre ; le fragment ne part jamais vers le serveur. Le bouton est un lien,
son adresse s'écrivant au clic, parce que `window.open` revient vide dans
l'artifact alors qu'un lien vers une cible nommée passe. L'onglet porte un nom,
un second aperçu y remplace donc le premier, et la carte porte une pastille
« Aperçu de saisie ». L'aperçu lit le site déployé sur
https://matdeux-portfolio.vercel.app : une modification du gabarit n'apparaît
dans l'aperçu qu'une fois déployée.

## Le passage

1. **Accorder le dépôt et la page.** Lire les trois `content/*.json`, lire les
   trois collections. Pour chaque écart, demander à Mathieu laquelle des deux
   versions fait foi, puis aligner : `ArtifactData` `batch` pour pousser vers la
   page, réécriture du JSON pour l'inverse. Les deux copies portent le même
   contenu avant d'aller plus loin.

2. **Ouvrir la page** (`Artifact`, `action: "open"`) et dire en une ligne ce
   qui manque : les entrées incomplètes, les projets sans page projet. Puis
   rendre la main. Mathieu saisit, et c'est lui qui relance.

3. **Récupérer.** Lire les trois collections, écrire les trois fichiers avec
   les champs et l'ordre du tableau ci-dessus, deux espaces d'indentation, une
   ligne vide finale.

4. **Construire.** `node build.mjs`. Un échec nomme ses erreurs : les corriger
   dans le JSON quand la correction est mécanique, les rapporter à Mathieu
   quand elles demandent un arbitrage de contenu. Répéter jusqu'à ce que le
   build passe, puis lui rendre les avertissements tels quels.

5. **Reporter les corrections dans la page**, pour qu'elle ne redevienne pas la
   copie périmée.

## Modifier la page

La source est [`page.src.html`](page.src.html), avec `__FONT_B64__` en place de
la police. Inliner puis republier sur la même URL :

```bash
python3 -c "import base64,pathlib;s=pathlib.Path('.claude/skills/contenu/page.src.html').read_text();f=base64.b64encode(next(pathlib.Path('.').rglob('GeneralSans-Variable.woff2')).read_bytes()).decode();pathlib.Path('/tmp/contenu.html').write_text(s.replace('__FONT_B64__',f))"
```

Puis `Artifact` avec `file_path: /tmp/contenu.html` et l'`url` de la page. Sans
`url`, la publication crée une seconde page et laisse la base derrière elle.

La page déclare les capacités `db` et `user` ; une republication qui omet
`capabilities` les conserve.
