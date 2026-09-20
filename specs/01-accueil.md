# Spec, Section Accueil

Statut : validée le 20/09/2026. Source : atelier de cadrage avec Mathieu.
Portée : premier écran du portfolio, plus le header, qui est un composant global.

---

## ⭐️ Contexte & persona

### Contexte

Le portfolio de Mathieu Godefroy, product manager, s'ouvre sur un écran unique
avant la section Projets. Cet écran n'a pas vocation à convaincre. Il qualifie,
il donne le ton, et il envoie vers la preuve.

### Persona cible

Recruteur ou hiring manager produit. Lecture en diagonale, quelques secondes,
majoritairement sur desktop. Il cherche à savoir en un coup d'œil de qui il
s'agit, puis à voir des réalisations. Il ne lit pas, il scanne.

Toute la section est écrite pour lui. Les autres visiteurs, pairs et clients,
ne sont pas une cible de conception.

### Objectif unique

Faire descendre le visiteur vers la section Projets.

Corollaire de conception : tout élément qui capte l'attention sans servir ce
mouvement est un concurrent, y compris les liens de contact. Le contact est
disponible, jamais mis en avant.

### KPI

| Indicateur | Événement | Lecture |
|---|---|---|
| Intention de scroll | `clic_ancre_projets` | Le visiteur suit le guidage explicite |
| Passage effectif | `section_projets_atteinte` | Le hero a rempli son rôle, guidage ou scroll libre |

Outil : analytics respectueux de la vie privée, sans cookie, type Plausible.
Les deux événements doivent être prévus dès le prototype, avec des points de
déclenchement identifiables.

---

## 👫 User stories

### Release unique, MVP

Il n'y a pas de V2 prévue pour cette section.

| # | Story |
|---|---|
| US1 | En tant que recruteur qui arrive sur le site, je veux comprendre en quelques secondes qui est Mathieu et comment il voit son métier, afin de décider si je continue |
| US2 | En tant que recruteur convaincu par l'accroche, je veux être guidé vers ses réalisations, afin de ne pas avoir à chercher où regarder |
| US3 | En tant que recruteur intéressé, je veux accéder à son code sur GitHub, afin de juger sa culture produit et technique |
| US4 | En tant que recruteur prêt à échanger, je veux récupérer son adresse mail sans friction, afin de le contacter depuis l'outil de mon choix |
| US5 | En tant que visiteur sur mobile, je veux la même lisibilité et le même guidage, afin de ne pas avoir une version dégradée |

---

## ✅ Critères d'acceptation

### US1, comprendre qui est Mathieu

- **GIVEN** j'arrive sur la page d'accueil sur desktop
- **WHEN** l'écran s'affiche
- **THEN** je vois le manifeste comme élément typographique dominant du premier écran
- **AND** je vois le label `product manager` en contrepoint discret, à gauche du manifeste
- **AND** je vois le nom `Mathieu Godefroy` dans le header
- **AND** aucun autre contenu éditorial n'occupe le premier écran

- **GIVEN** la page est affichée
- **WHEN** je mesure le contraste du label `product manager` sur le fond crème
- **THEN** le ratio est d'au moins 4.5:1

- **GIVEN** la page est affichée
- **WHEN** je lis le manifeste
- **THEN** il tient sur 3 à 4 lignes maximum
- **AND** aucune ligne ne se termine par un mot orphelin isolé

### US2, être guidé vers les projets

- **GIVEN** j'arrive sur la page, quelle que soit la taille de mon écran
- **WHEN** je n'ai pas encore scrollé
- **THEN** l'ancre `Projets ↓` est visible dans l'écran, sans action de ma part

- **GIVEN** l'ancre est visible
- **WHEN** je clique dessus
- **THEN** la page défile de façon animée jusqu'au début de la section Projets
- **AND** l'événement `clic_ancre_projets` est envoyé

- **GIVEN** j'ai quitté le premier écran en scrollant
- **WHEN** la section Accueil n'est plus visible
- **THEN** l'ancre n'est plus affichée

- **GIVEN** mon système est réglé sur `prefers-reduced-motion`
- **WHEN** je clique sur l'ancre
- **THEN** la page se positionne sur la section Projets sans animation de défilement
- **AND** la micro-animation de la flèche est désactivée

### US3, accéder au GitHub

- **GIVEN** je suis sur n'importe quelle section du site, sur desktop
- **WHEN** je regarde le header
- **THEN** je vois le logo GitHub suivi du mot `GitHub`, sans fond ni cadre

- **GIVEN** le lien GitHub est affiché
- **WHEN** je le survole ou qu'il reçoit le focus clavier
- **THEN** un soulignement apparaît
- **AND** le focus clavier est visible indépendamment du survol

- **GIVEN** le lien GitHub est affiché
- **WHEN** je clique dessus
- **THEN** le profil GitHub s'ouvre dans un nouvel onglet
- **AND** le portfolio reste ouvert dans l'onglet d'origine

- **GIVEN** j'utilise un lecteur d'écran
- **WHEN** j'atteins le lien GitHub
- **THEN** son libellé accessible annonce l'ouverture dans un nouvel onglet

### US4, récupérer l'adresse mail

- **GIVEN** je suis sur n'importe quelle section du site
- **WHEN** je clique sur le bouton mail du header
- **THEN** l'adresse est copiée dans mon presse-papier
- **AND** un toast apparaît sous le bouton avec la confirmation `Adresse copiée`
- **AND** ce toast propose un bouton `Écrire à Mathieu`
- **AND** aucun client mail ne s'ouvre à ce stade

- **GIVEN** le toast est affiché
- **WHEN** je clique sur `Écrire à Mathieu`
- **THEN** le client mail par défaut s'ouvre sur un nouveau message adressé à Mathieu

- **GIVEN** le toast est affiché
- **WHEN** environ 6 secondes s'écoulent, ou je clique ailleurs, ou j'appuie sur Échap
- **THEN** le toast disparaît
- **AND** le reste de la page est resté utilisable pendant tout ce temps

- **GIVEN** j'utilise un lecteur d'écran
- **WHEN** le toast apparaît
- **THEN** la confirmation de copie est annoncée
- **AND** le bouton `Écrire à Mathieu` est atteignable au clavier

### US5, expérience mobile

- **GIVEN** je suis sur mobile
- **WHEN** la page d'accueil s'affiche
- **THEN** les blocs sont empilés verticalement
- **AND** l'ordre de lecture est : label métier en petit, puis manifeste, puis ancre Projets
- **AND** l'ancre Projets est visible sans scroller

- **GIVEN** je suis sur mobile
- **WHEN** je regarde le header
- **THEN** GitHub, mail et LinkedIn sont trois icônes de gabarit identique
- **AND** le header tient sur une seule ligne, sans compression du nom
- **AND** chaque icône porte un libellé accessible

### Transverse, animations

- **GIVEN** le designer a proposé une animation, quelle qu'elle soit
- **WHEN** mon système est réglé sur `prefers-reduced-motion`
- **THEN** cette animation est remplacée par un état statique équivalent
- **AND** aucune information ni aucune action n'est perdue par rapport à la version animée

- **GIVEN** la page est affichée
- **WHEN** je regarde le curseur en fin de manifeste
- **THEN** il est immobile, sans clignotement ni effet de saisie

---

## 📱 Design & composition

Le prototype existant, `prototypes/Accueil.png`, sert de base. La spec fixe les
intentions et les contraintes vérifiables. Elle n'impose aucune valeur de
couleur, de police, ni d'espacement. La forme reste la décision du designer.

### Hiérarchie du premier écran

1. **Manifeste.** Élément dominant. Texte figé, non modifiable :
   `Comprendre les utilisateurs pour leur apporter des solutions qui ont du sens.`
   C'est une vision du métier, pas une phrase d'accroche marketing. Le designer
   décide du découpage en lignes, dans la limite de 3 à 4 lignes.
2. **Ancre Projets.** Seul organe qui sert l'objectif de la section.
3. **Label métier.** `product manager`, contrepoint discret à gauche du
   manifeste. Discrétion visuelle, jamais illisibilité.
4. **Header.** Identité et accès, en retrait.

### Éléments

| Élément | Règle |
|---|---|
| Manifeste | Texte figé au mot près, ponctuation comprise. 3 à 4 lignes max, pas de mot orphelin |
| Curseur de saisie | Purement décoratif. Aucune animation d'écriture, aucun clignotement, aucune rotation de phrases. Seule exception à la liberté d'animation ci-dessous |
| Vignette | Conservée en fin de manifeste. Taille minimale garantissant sa lisibilité, texte alternatif obligatoire |
| Label métier | Gris en retrait, contraste minimum 4.5:1 sur le fond |
| Ancre Projets | Toujours dans le premier écran. Micro-animation discrète autorisée sur la flèche |
| Preuve | Aucune. Pas de logo d'entreprise, pas de chiffre, pas de liste de secteurs |
| Photo de portrait | Aucune. La vignette suffit |

### Animations

Le mouvement est à la main du designer. Apparitions au chargement, transitions
au scroll, états de survol, comportement de l'ancre et du header : il propose,
rien n'est imposé ici.

Deux limites seulement :

1. **Le curseur reste statique.** L'effet machine à écrire retarde la lecture
   du manifeste, qui est ce que le recruteur doit saisir en premier.
2. **`prefers-reduced-motion` est respecté.** Toute animation proposée doit
   avoir un état statique équivalent, qui délivre la même information et permet
   les mêmes actions. Cette contrainte n'est pas négociable.

### Hauteur

Le hero occupe 100% de la hauteur visible. En dessous d'un seuil de hauteur
d'écran, de l'ordre de 600 px, la section passe en hauteur automatique pour
éviter tout chevauchement ou toute réduction excessive du corps de texte.
L'ancre Projets reste visible sans scroller dans les deux cas.

### Header, composant global

Présent sur toutes les sections du site. Spécifié ici pour que le designer
l'ait sous les yeux dès le premier écran. Les specs des sections suivantes y
renvoient au lieu de le redécrire.

**Contenu, de gauche à droite :** nom `Mathieu Godefroy`, puis, alignés à
droite, le lien GitHub, le bouton mail, le bouton LinkedIn.

**Comportement au scroll :** masqué au défilement vers le bas, réapparaît au
défilement vers le haut.

**Traitement des accès :** asymétrie assumée. GitHub est un lien en toutes
lettres parce que c'est celui qu'on veut faire cliquer. Mail et LinkedIn
restent des pastilles icônes, ce sont des moyens de contact attendus.

| Élément | Repos | Survol et focus | Action |
|---|---|---|---|
| GitHub | Logo plus mot `GitHub`, sans fond ni cadre, sans flèche | Soulignement | Nouvel onglet |
| Mail | Pastille icône | État de survol visible | Copie de l'adresse, puis toast |
| LinkedIn | Pastille icône | État de survol visible | Nouvel onglet |

Sur mobile, GitHub repasse en pastille icône de même gabarit que les deux
autres.

Maquette de composition du header : `prototypes/header-github.html`.
Esquisse de proportions uniquement, les couleurs et la police y sont
approchées.

### Langue

Français uniquement. Décision assumée, pas un oubli. Pas de sélecteur de
langue, aucune contrainte de longueur bilingue sur le manifeste.

---

## 🧀 Edge cases

| Situation | Comportement attendu |
|---|---|
| Client mail non configuré | Le clic sur `Écrire à Mathieu` peut ne rien produire. L'adresse est déjà dans le presse-papier, donc le contact n'est jamais perdu. C'est la raison d'être de l'ordre copie puis proposition |
| Presse-papier refusé par le navigateur | Le toast affiche l'adresse en clair, sélectionnable, à la place de `Adresse copiée` |
| Clics répétés sur le bouton mail | Un seul toast à la fois. Le nouveau clic réinitialise le compte à rebours au lieu d'empiler les toasts |
| `prefers-reduced-motion` actif | Toute animation de la section bascule sur son état statique équivalent. Pas de défilement animé, pas de micro-animation, pas d'animation d'apparition |
| Écran très bas, mobile en paysage | Bascule en hauteur automatique. L'ancre Projets peut sortir du premier écran plutôt que d'écraser le manifeste |
| JavaScript désactivé | Le lien GitHub, le lien LinkedIn et l'ancre Projets restent fonctionnels en HTML. Le bouton mail bascule sur un `mailto` simple |
| Toast et lecteur d'écran | La confirmation est annoncée, le focus n'est pas volé, Échap ferme |
| Manifeste dans une langue plus longue | Hors périmètre, le site est en français uniquement |
| Nom très long dans le header sur petit écran | Le nom garde la priorité, les icônes se resserrent avant lui, jamais l'inverse |

---

## ❓ À compléter

Rien. Les accès du header sont renseignés :

| Accès | Valeur |
|---|---|
| GitHub | `https://github.com/m-gdfr` |
| Mail | `godefroy.mth@gmail.com` |
| LinkedIn | `https://www.linkedin.com/in/m-gdfr/` |
