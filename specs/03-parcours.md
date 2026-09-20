# Spec — Écran Parcours

> Statut : spec de conception, issue d'une session de cadrage. Les points marqués **[À confirmer]** ne sont pas tranchés.

---

# ⭐️ Contexte & Persona

## Contexte de la fonctionnalité

L'écran Parcours est la page du portfolio qui présente l'historique professionnel. Il repose sur une idée unique : **une grille de points figure le parcours dans son ensemble, et chaque expérience en occupe une part proportionnelle à sa durée.**

Au repos, la grille est entièrement remplie et uniforme — elle dit « voici mon parcours ». À l'ouverture d'une expérience, les points qui lui correspondent restent allumés et tous les autres s'éteignent : la part que cette expérience représente devient visible d'un seul coup d'œil.

Le principe structurant retenu, après arbitrage : **la forme commande la règle.** La grille est un carré plein de 100 points, invariable. C'est la répartition qui s'ajuste, pas la géométrie.

## Persona cible

**Recruteur ou décideur qui consulte le portfolio en diagonale.** Il arrive par un lien reçu, dispose de deux à trois minutes, compare plusieurs profils dans la même session, et cherche d'abord à situer : quels employeurs, sur quelle période, pour quel métier. La grille est un différenciateur mémoriel, pas un outil d'analyse — l'information doit rester accessible même si elle n'est jamais décodée.

Persona secondaire : **pair du métier** (designer, PM, planneur), plus disponible, sensible au parti pris d'interface, susceptible de faire circuler le lien.

## KPI visés **[À confirmer]**

Aucun KPI n'a été défini pendant la session. Proposition, à valider :

- **Taux d'ouverture d'au moins une fiche** — mesure si la mécanique invite au clic. Principal indicateur de réussite de l'écran.
- **Nombre moyen de fiches ouvertes par session** — mesure si le contraste donne envie de comparer les expériences entre elles.
- **Temps passé sur l'écran Parcours** — proxy de l'attention accordée au contenu.
- **Taux de partage d'une ancre** — mesure l'usage réel du lien profond.

---

# 👫 Releases & User Stories

## MVP

| # | User story |
|---|---|
| US-1 | En tant que visiteur, quand j'arrive sur l'écran Parcours, je vois la liste de mes expériences et une grille pleine, afin de comprendre immédiatement que la grille représente l'ensemble du parcours. |
| US-2 | En tant que visiteur, quand je clique sur une expérience, elle se déplie et les points correspondants restent allumés pendant que les autres s'éteignent, afin de percevoir la part qu'elle représente. |
| US-3 | En tant que visiteur, quand une fiche est ouverte, je peux la refermer, afin de revenir à la vue d'ensemble. |
| US-4 | En tant que visiteur, quand je survole une expérience fermée, je vois un aperçu atténué de sa part sur la grille, afin de choisir quoi ouvrir sans cliquer. |
| US-5 | En tant que visiteur sur mobile, quand j'arrive sur l'écran, je vois directement la liste sous le titre, afin d'accéder au contenu sans scroller dans le vide. |
| US-6 | En tant que visiteur, quand je lis une fiche dépliée, je vois la durée de l'expérience écrite en toutes lettres, afin d'accéder à l'information sans dépendre de la grille. |
| US-7 | En tant que visiteur, quand j'ouvre une expérience, l'URL se met à jour, afin de pouvoir partager un lien qui rouvre directement cette expérience. |
| US-8 | En tant que visiteur navigant au clavier, je peux parcourir et ouvrir les expériences, afin d'utiliser l'écran sans souris. |
| US-9 | En tant que visiteur ayant réduit les animations sur son système, je vois les changements d'état sans mouvement, afin de consulter l'écran sans gêne. |

## V2 **[À confirmer]**

| # | User story |
|---|---|
| US-10 | En tant que visiteur, quand je survole un point de la grille, je vois à quelle expérience il appartient. *(Exclu du MVP : la grille est décorative et non interactive.)* |
| US-11 | En tant que visiteur, je peux accéder à une preuve externe depuis une fiche (lien sortant, cas d'étude). *(Écarté au MVP.)* |
| US-12 | En tant que visiteur mobile, je dispose d'une représentation visuelle alternative de la répartition. *(La grille est masquée sur mobile au MVP.)* |

---

# ✅ Critères d'acceptation

## US-2 — Ouverture d'une expérience et contraste sur la grille

**Chemin nominal**

- **GIVEN** je suis sur l'écran Parcours, aucune fiche n'est ouverte et les 100 points sont allumés de façon uniforme
- **WHEN** je clique sur l'en-tête d'une expérience
- **THEN** la fiche se déplie avec une animation de hauteur d'environ 220 ms
- **AND** les points attribués à cette expérience restent allumés
- **AND** les autres points s'éteignent en cascade, en partant du point le plus récent de l'expérience ouverte
- **AND** la cascade et le dépliage démarrent simultanément
- **AND** l'URL est mise à jour avec l'ancre de cette expérience, sans créer d'entrée dans l'historique du navigateur

**Accordéon strict**

- **GIVEN** une expérience A est déjà ouverte
- **WHEN** je clique sur l'en-tête d'une expérience B
- **THEN** la fiche A se referme et la fiche B s'ouvre
- **AND** une seule fiche est ouverte à tout instant
- **AND** la grille passe directement de la répartition de A à celle de B, sans repasser par l'état uniforme

**Enchaînement depuis l'aperçu**

- **GIVEN** je survole l'en-tête d'une expérience et la grille affiche son aperçu atténué
- **WHEN** je clique sur cet en-tête
- **THEN** la cascade poursuit depuis l'état atténué jusqu'à l'état de contraste complet
- **AND** la grille ne repasse jamais par l'état uniforme entre les deux

**Mouvement réduit**

- **GIVEN** le réglage système « réduire les animations » est actif
- **WHEN** j'ouvre une expérience
- **THEN** la fiche et la grille passent instantanément à leur état final, sans cascade ni animation de hauteur

**Mobile**

- **GIVEN** je consulte l'écran sur mobile
- **WHEN** j'ouvre une expérience
- **THEN** la fiche se déplie et affiche la durée en texte
- **AND** aucune grille n'est affichée

---

## US-3 — Fermeture d'une fiche

**Par re-clic**

- **GIVEN** une expérience est ouverte
- **WHEN** je clique à nouveau sur son en-tête
- **THEN** la fiche se replie
- **AND** les points éteints se rallument en cascade, depuis la même origine qu'à l'ouverture et avec la même durée
- **AND** l'ancre est retirée de l'URL, sans entrée d'historique

**Par la touche Échap**

- **GIVEN** une expérience est ouverte
- **WHEN** j'appuie sur Échap
- **THEN** la fiche se referme dans les mêmes conditions que par re-clic
- **AND** le focus clavier revient sur l'en-tête de l'expérience qui vient d'être fermée

**Par clic ailleurs**

- **GIVEN** une expérience est ouverte
- **WHEN** je clique en dehors de la fiche et en dehors de la grille
- **THEN** la fiche se referme
- **AND** un clic sur la grille ne referme rien : la grille n'est pas une zone de fermeture

---

## US-4 — Aperçu au survol

**Chemin nominal**

- **GIVEN** aucune fiche n'est ouverte
- **WHEN** je survole l'en-tête d'une expérience fermée
- **THEN** la ligne reçoit un retour visuel
- **AND** la grille affiche immédiatement l'aperçu atténué de la part de cette expérience, sans cascade
- **WHEN** la souris quitte la ligne
- **THEN** la grille revient instantanément à l'état uniforme

**Neutralisation quand une fiche est ouverte**

- **GIVEN** une expérience est ouverte
- **WHEN** je survole l'en-tête d'une autre expérience
- **THEN** la ligne survolée reçoit son retour visuel
- **AND** la grille ne change pas : l'état choisi par le clic est préservé

**Équivalent clavier**

- **GIVEN** je navigue au clavier, aucune fiche n'est ouverte
- **WHEN** le focus arrive sur l'en-tête d'une expérience
- **THEN** l'aperçu atténué s'affiche comme au survol souris
- **AND** un indicateur de focus visible est présent sur l'en-tête

---

## US-1 — Répartition des points

- **GIVEN** la liste des expériences avec leurs dates de début et de fin
- **WHEN** l'écran calcule la répartition
- **THEN** chaque expérience reçoit un nombre de points égal à sa part de la durée totale du parcours, sur 100
- **AND** l'arrondi suit la méthode du plus fort reste
- **AND** en cas d'égalité de reste, le point supplémentaire va à l'expérience la plus récente
- **AND** la somme des points attribués vaut exactement 100
- **AND** toute expérience listée reçoit au minimum 1 point
- **AND** les points sont distribués du plus récent, en haut à gauche, au plus ancien, en bas à droite
- **AND** la grille reste un carré de 10 × 10 quel que soit le nombre d'expériences

> Les critères d'acceptation des user stories restantes (US-5 à US-9) seront générés avec le skill spec-writer.

---

# 📱 Designs & Workflow

## Prototype

Prototype interactif : https://claude.ai/artifact/8Q1okc5awnTTFUb89433eM

Il permet de comparer les densités de points et de basculer entre vue desktop et mobile. **Réglage retenu : points presque jointifs.** Le prototype implémente la répartition en pourcentage, la cascade et le comportement mobile ; il ne reflète pas encore l'aperçu atténué au survol ni les ancres URL.

## Règles de mise en page

**Desktop** — deux colonnes. À gauche, sur environ 420 px : le titre, un filet, puis la liste des expériences ancrée en bas de colonne. À droite : la grille, carré centré occupant la hauteur disponible. La colonne de gauche scrolle indépendamment quand son contenu dépasse ; la grille ne bouge jamais.

**Mobile** — une colonne. Titre, filet, puis la liste immédiatement dessous, sans espace vide. Aucune grille.

## Diagramme d'états de la grille

```
                    ┌─────────────────────┐
                    │   UNIFORME          │  ← état d'arrivée
                    │   100 pts allumés   │
                    └─────────────────────┘
                       ▲              │
      sortie de survol │              │ survol / focus d'une ligne
         (instantané)  │              ▼   (instantané, sans cascade)
                    ┌─────────────────────┐
                    │   APERÇU            │
                    │   contraste atténué │
                    └─────────────────────┘
                       ▲              │
    fermeture (cascade │              │ clic
       de retour)      │              ▼   (cascade, poursuit depuis l'atténué)
                    ┌─────────────────────┐
                    │   CONTRASTE         │
                    │   fiche ouverte     │◄──┐
                    └─────────────────────┘   │ clic sur une autre
                                 │            │ expérience
                                 └────────────┘  (transition directe)
```

L'état APERÇU est inaccessible tant qu'une fiche est ouverte, et n'existe pas sur mobile.

---

# 🧀 Edge cases & gestion d'erreur

## Répartition et calcul

| Cas | Comportement attendu |
|---|---|
| Expérience trop courte pour valoir 1 point | Elle reçoit 1 point garanti. Le point est pris sur l'expérience la plus longue. |
| Nombre d'expériences supérieur à 100 | Impossible d'attribuer 1 point à chacune. **[À trancher]** — limiter le nombre d'expériences affichées dans la grille, ou lever la garantie du minimum. |
| Expérience en cours, sans date de fin | La durée court jusqu'à la date du jour. La part de toutes les autres expériences diminue mécaniquement chaque mois. |
| Date de fin antérieure à la date de début | Donnée invalide. L'expérience n'est pas affichée et l'anomalie est signalée en console ; l'écran reste fonctionnel. |
| Chevauchement de deux expériences | Les mois comptent deux fois dans le total et la somme des parts reste ramenée à 100. Assumé, aucun traitement particulier. |
| Aucune expérience | La grille n'est pas affichée et la colonne indique qu'aucune expérience n'est encore renseignée. |
| Une seule expérience | Elle occupe les 100 points. L'ouverture n'éteint rien : la grille reste identique. Le contraste ne porte aucune information tant qu'il n'y a pas au moins deux expériences. |

## Interaction

| Cas | Comportement attendu |
|---|---|
| Balayage rapide de la souris sur plusieurs lignes | L'aperçu étant immédiat, la grille change à chaque ligne traversée. **Risque accepté**, à vérifier en test utilisateur ; un délai de déclenchement est la correction prévue si le scintillement gêne. |
| Clic répété très rapide sur le même en-tête | Chaque clic bascule l'état. Les animations en cours sont interrompues et reprises depuis la position courante, sans file d'attente. |
| Clic sur une autre expérience pendant une cascade | La cascade en cours est abandonnée, la nouvelle démarre depuis l'état courant des points. |
| Clic sur la grille | Aucun effet. La grille n'ouvre, ne ferme et ne sélectionne rien. |
| Échap alors qu'aucune fiche n'est ouverte | Aucun effet, aucun retour visuel. |
| Souris quittant la ligne pendant le dépliage | Le dépliage va à son terme : le clic a été validé, le survol n'a plus d'autorité. |
| Écran tactile sans survol possible | L'état APERÇU n'est jamais atteint. Le clic mène directement au contraste, la cascade s'exécute sur la totalité du trajet. |

## URL et navigation

| Cas | Comportement attendu |
|---|---|
| Arrivée avec une ancre valide | La fiche correspondante est ouverte et la cascade est jouée. |
| Arrivée avec une ancre inconnue ou obsolète | L'écran s'affiche dans son état par défaut, tout fermé. L'ancre est retirée de l'URL. Aucun message d'erreur : l'écran est parfaitement utilisable ainsi. |
| Bouton retour du navigateur | Il ramène à la page précédente, jamais à un état antérieur de l'accordéon. L'URL est remplacée et non empilée. |
| Arrivée sans ancre | Tout est fermé, la grille est uniforme, aucune animation n'est jouée au chargement. |

## Affichage et contenu

| Cas | Comportement attendu |
|---|---|
| Fiche plus haute que la colonne | La colonne de gauche scrolle en interne. La grille reste fixe et visible. |
| Liste plus haute que la colonne, toutes fiches fermées | Même traitement : scroll interne de la colonne. |
| Fenêtre très étroite en desktop | Bascule sur la mise en page mobile : grille masquée, liste collée sous le titre. |
| Fenêtre redimensionnée pendant qu'une fiche est ouverte | L'état ouvert est conservé. La grille est recalculée à la nouvelle taille sans rejouer d'animation. |
| Consultation au lecteur d'écran | La grille est masquée. Le parcours est restitué par le titre, les en-têtes d'expérience et le contenu des fiches, durée comprise. |

---

# ⚠️ Risques connus, acceptés

**Les trois expériences ont des durées presque identiques.** La répartition actuelle donne 35 / 33 / 32 points. La grille affiche donc trois parts équivalentes et n'apporte, aujourd'hui, aucune information que les dates ne donnaient déjà. La mécanique ne deviendra éloquente qu'avec des durées contrastées. Assumé : l'écran est conçu pour le parcours à venir autant que pour le parcours actuel.

**L'unité est relative, pas absolue.** Un point vaut un pourcentage, pas une durée. À chaque nouvelle expérience, toutes les parts se recalculent : une expérience passée verra son nombre de points diminuer sans que sa durée ait changé. C'est le principe même de la représentation, pas un défaut.

**La cascade s'exécute sur un trajet réduit.** L'aperçu au survol amenant déjà les points à mi-chemin, l'animation au clic ne parcourt que la distance restante. Le réglage de la durée et de la valeur d'atténuation devra compenser, faute de quoi le mouvement se lira comme un frémissement.

**Il n'existe plus aucun point vide.** L'idée initiale d'un point non rempli signalant la prochaine expérience est structurellement impossible avec une grille en pourcentage, pleine à 100 % par construction. Abandonnée définitivement.

---

# 📌 Décisions ouvertes

| Sujet | Statut |
|---|---|
| Dates exactes de début et de fin de chaque expérience | **Manquantes.** La répartition 35 / 33 / 32 repose sur une hypothèse de 12 mois par expérience. À recalculer. |
| Valeur exacte de l'atténuation de l'aperçu | Laissée à l'appréciation du designer. |
| KPI de la fonctionnalité | Proposés ci-dessus, non validés. |
| Comportement au-delà de 100 expériences | Non tranché. |
