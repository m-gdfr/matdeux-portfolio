#!/usr/bin/env node
/* ==========================================================================
   build.mjs

   Lit content/projets.json, content/parcours.json et content/page-projet.json,
   les valide, puis injecte le markup produit dans src/index.html pour écrire
   dist/index.html. Recopie ensuite src/assets/ vers dist/assets/.

   Aucune dépendance npm. Node seul.

   Trois arbitrages, tranchés avec l'auteur, priment sur la spec 05 :
   1. Le champ media est facultatif dans les deux fichiers (aucun visuel
      n'existe encore, et le texte d'une page projet s'écrit avant son
      visuel). Absent : avertissement non bloquant. Présent : validé à fond.
      content/projets.json refuse la vidéo, page-projet.json l'accepte.
   2. content/page-projet.json peut être vide. Ses règles de validation sont
      écrites et actives dès qu'une entrée apparaît.
   3. Les valeurs client sont reprises telles quelles. Un avertissement liste
      les entrées à requalifier, le script ne pouvant pas distinguer un nom
      de client d'un nom de domaine.
   ======================================================================= */

import { readFileSync, statSync, existsSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

/* ==========================================================================
   Lecture et parsing du JSON, nommé avant de laisser remonter l'erreur
   ======================================================================= */
function readJSON(relPath) {
  const full = join(ROOT, relPath);
  let raw;
  try {
    raw = readFileSync(full, 'utf8');
  } catch (e) {
    console.error(`${relPath} : fichier introuvable ou illisible (${e.message}).`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`${relPath} : JSON mal formé, ${e.message}.`);
    process.exit(1);
  }
}

const projets = readJSON('content/projets.json');
const parcours = readJSON('content/parcours.json');
const pageProjet = readJSON('content/page-projet.json');

/* ==========================================================================
   Utilitaires de validation
   ======================================================================= */
const ID_RE = /^[a-z0-9-]+$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function wordCount(s) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/* ==========================================================================
   Échappement HTML. Le contenu est en français, plein d'apostrophes et
   d'esperluettes. L'ordre compte, & en premier.
   ======================================================================= */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ==========================================================================
   Lecteur d'en-tête d'image maison : PNG, JPEG, WebP. Tout le reste, AVIF
   compris, n'est pas reconnu et retombe sur un simple contrôle d'entiers
   positifs, avec avertissement.
   ======================================================================= */
function pngSize(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue; }
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    const len = buf.readUInt16BE(offset + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    offset += 2 + len;
  }
  return null;
}

function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii', 12, 16);
  const data = 20;
  if (fourcc === 'VP8X') {
    return {
      width: 1 + (buf[data + 4] | (buf[data + 5] << 8) | (buf[data + 6] << 16)),
      height: 1 + (buf[data + 7] | (buf[data + 8] << 8) | (buf[data + 9] << 16))
    };
  }
  if (fourcc === 'VP8 ') {
    return { width: buf.readUInt16LE(data + 6) & 0x3fff, height: buf.readUInt16LE(data + 8) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    const b0 = buf[data + 1], b1 = buf[data + 2], b2 = buf[data + 3], b3 = buf[data + 4];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | (b1 >> 6))
    };
  }
  return null;
}

function readImageSize(filePath) {
  const buf = readFileSync(filePath);
  return pngSize(buf) || jpegSize(buf) || webpSize(buf) || null;
}

/* ==========================================================================
   Validation d'un objet media, partagée entre projets.json et
   page-projet.json. `allowVideo` : projets.json le refuse.
   ======================================================================= */
function validateMedia(media, ctx, allowVideo) {
  if (media == null) return;
  if (typeof media !== 'object') { err(`${ctx} : champ "media" invalide.`); return; }

  if (!isNonEmptyString(media.type) || (media.type !== 'image' && media.type !== 'video')) {
    err(`${ctx}, media.type : doit valoir "image" ou "video".`);
    return;
  }
  if (media.type === 'video' && !allowVideo) {
    err(`${ctx}, media.type : "video" est refusé dans content/projets.json.`);
    return;
  }
  if (!isNonEmptyString(media.src)) { err(`${ctx}, media.src : obligatoire.`); return; }
  if (typeof media.w !== 'number' || !Number.isInteger(media.w) || media.w <= 0) err(`${ctx}, media.w : entier positif attendu.`);
  if (typeof media.h !== 'number' || !Number.isInteger(media.h) || media.h <= 0) err(`${ctx}, media.h : entier positif attendu.`);

  if (media.type === 'image' && !isNonEmptyString(media.alt)) err(`${ctx}, media.alt : obligatoire pour une image.`);
  if (media.type === 'video' && !isNonEmptyString(media.poster)) err(`${ctx}, media.poster : obligatoire pour une vidéo.`);

  const srcPath = join(ROOT, 'src', media.src);
  if (!existsSync(srcPath)) {
    err(`${ctx}, media.src : fichier introuvable (src/${media.src}).`);
  } else if (typeof media.w === 'number' && typeof media.h === 'number' && media.w > 0 && media.h > 0) {
    if (media.type === 'image') {
      const size = readImageSize(srcPath);
      if (size == null) {
        warn(`${ctx} : dimensions non vérifiables (format d'image non reconnu, src/${media.src}).`);
      } else if (size.width !== media.w || size.height !== media.h) {
        err(`${ctx}, media.w/h : ${media.w}x${media.h} déclarés, ${size.width}x${size.height} dans le fichier (src/${media.src}).`);
      }
    }
  }

  let posterPath = null;
  if (media.type === 'video') {
    if (isNonEmptyString(media.poster)) {
      posterPath = join(ROOT, 'src', media.poster);
      if (!existsSync(posterPath)) {
        err(`${ctx}, media.poster : fichier introuvable (src/${media.poster}).`);
        posterPath = null;
      } else if (typeof media.w === 'number' && typeof media.h === 'number' && media.w > 0 && media.h > 0) {
        const size = readImageSize(posterPath);
        if (size == null) {
          warn(`${ctx} : dimensions non vérifiables (format de poster non reconnu, src/${media.poster}).`);
        } else if (size.width !== media.w || size.height !== media.h) {
          err(`${ctx}, media.w/h : ${media.w}x${media.h} déclarés, ${size.width}x${size.height} dans le poster (src/${media.poster}).`);
        }
      }
    }
    if (existsSync(srcPath) || posterPath) {
      const total = (existsSync(srcPath) ? statSync(srcPath).size : 0) + (posterPath ? statSync(posterPath).size : 0);
      const MO = 1024 * 1024;
      if (total > 5 * MO) {
        err(`${ctx} : vidéo (poster compris) de ${(total / MO).toFixed(1)} Mo, plafond 5 Mo.`);
      } else if (total > 3 * MO) {
        warn(`${ctx} : vidéo (poster compris) de ${(total / MO).toFixed(1)} Mo, au delà du seuil d'avertissement de 3 Mo.`);
      }
    }
  }
}

/* ==========================================================================
   A. Validation de content/projets.json
   ======================================================================= */
if (!Array.isArray(projets) || projets.length === 0) {
  err('content/projets.json : le tableau est vide, la section Projets suppose au moins une entrée.');
}

const projetIds = new Set();
const clientsARequalifier = [];

if (Array.isArray(projets)) {
  projets.forEach((p, i) => {
    const ctx = `content/projets.json[${i}]`;
    if (p == null || typeof p !== 'object') { err(`${ctx} : entrée invalide.`); return; }

    ['id', 'date', 'nom', 'client', 'a', 'b', 'c'].forEach((champ) => {
      if (!isNonEmptyString(p[champ])) err(`${ctx}, ${champ} : obligatoire.`);
    });

    if (isNonEmptyString(p.id)) {
      if (!ID_RE.test(p.id)) {
        err(`${ctx}, id : "${p.id}" doit être composé uniquement de [a-z0-9-], sans espace ni accent.`);
      } else if (projetIds.has(p.id)) {
        err(`${ctx}, id : "${p.id}" en double dans content/projets.json.`);
      } else {
        projetIds.add(p.id);
      }
    }

    ['a', 'b', 'c'].forEach((champ) => {
      if (isNonEmptyString(p[champ]) && !HEX_RE.test(p[champ])) {
        err(`${ctx}, ${champ} : "${p[champ]}" n'est pas une couleur hexadécimale valide (#rgb ou #rrggbb).`);
      }
    });

    if (p.media == null) {
      warn(`${ctx} (${p.id ?? '?'}) : aucun media, la ligne restera sur son dégradé de chargement.`);
    } else {
      validateMedia(p.media, `${ctx}.media`, false);
    }

    if (isNonEmptyString(p.client)) clientsARequalifier.push(`${p.id ?? `index ${i}`} ("${p.client}")`);
  });

  if (projets.length > 10) {
    warn(`content/projets.json : ${projets.length} projets, au delà du seuil de dix au delà duquel le calage du défilement doit être assoupli.`);
  }
}

if (clientsARequalifier.length > 0) {
  warn(`Valeurs "client" reprises telles quelles, à requalifier (elles décrivent aujourd'hui un domaine, pas un client) : ${clientsARequalifier.join(', ')}.`);
}

/* ==========================================================================
   B. Validation de content/parcours.json
   ======================================================================= */
if (!Array.isArray(parcours)) {
  err('content/parcours.json : un tableau est attendu.');
}

const parcoursIds = new Set();

if (Array.isArray(parcours)) {
  parcours.forEach((x, i) => {
    const ctx = `content/parcours.json[${i}]`;
    if (x == null || typeof x !== 'object') { err(`${ctx} : entrée invalide.`); return; }

    ['id', 'nom', 'dates', 'role', 'body'].forEach((champ) => {
      if (!isNonEmptyString(x[champ])) err(`${ctx}, ${champ} : obligatoire.`);
    });

    if (isNonEmptyString(x.id)) {
      if (!ID_RE.test(x.id)) {
        err(`${ctx}, id : "${x.id}" doit être composé uniquement de [a-z0-9-], sans espace ni accent.`);
      } else if (parcoursIds.has(x.id)) {
        err(`${ctx}, id : "${x.id}" en double dans content/parcours.json.`);
      } else {
        parcoursIds.add(x.id);
      }
    }
  });
}

/* ==========================================================================
   C. Validation de content/page-projet.json

   Le tableau peut être vide aujourd'hui, ces règles s'appliquent dès qu'une
   entrée apparaît. nom, client et date ne sont pas dupliqués ici : ils sont
   lus depuis content/projets.json par jointure sur id.
   ======================================================================= */
if (!Array.isArray(pageProjet)) {
  err('content/page-projet.json : un tableau est attendu.');
}

const pageProjetIds = new Set();
const pageProjetById = new Map();

if (Array.isArray(pageProjet)) {
  pageProjet.forEach((pp, i) => {
    const ctx = `content/page-projet.json[${i}]`;
    if (pp == null || typeof pp !== 'object') { err(`${ctx} : entrée invalide.`); return; }

    ['id', 'chapo', 'contexte', 'enjeu', 'demarche', 'resultat'].forEach((champ) => {
      if (!isNonEmptyString(pp[champ])) err(`${ctx}, ${champ} : obligatoire.`);
    });

    if (isNonEmptyString(pp.id)) {
      if (pageProjetIds.has(pp.id)) {
        err(`${ctx}, id : "${pp.id}" en double dans content/page-projet.json.`);
      } else {
        pageProjetIds.add(pp.id);
      }
      if (!projetIds.has(pp.id)) {
        err(`${ctx}, id : "${pp.id}" est orphelin, absent de content/projets.json.`);
      } else {
        pageProjetById.set(pp.id, pp);
      }
    }

    if (!Array.isArray(pp.perimetre)) {
      err(`${ctx}, perimetre : un tableau de 2 à 6 chaînes est attendu.`);
    } else {
      if (pp.perimetre.length < 2 || pp.perimetre.length > 6) {
        err(`${ctx}, perimetre : ${pp.perimetre.length} entrée(s), 2 à 6 attendues.`);
      }
      pp.perimetre.forEach((entree, j) => {
        if (!isNonEmptyString(entree)) {
          err(`${ctx}, perimetre[${j}] : entrée vide.`);
        } else if (wordCount(entree) > 5) {
          err(`${ctx}, perimetre[${j}] : "${entree}" dépasse 5 mots.`);
        }
      });
    }

    /* chiffres : facultatif. Une rangée de deux à quatre chiffres clés posée
       en tête du bloc Résultat, avant ses paragraphes. Le nombre se lit de
       loin, le libellé le nomme, donc l'un est court et l'autre tient en
       trois mots. En dessous de deux, ce n'est pas une rangée ; au delà de
       quatre, la rangée passe à la ligne et perd sa lecture d'un coup d'œil. */
    if (pp.chiffres != null) {
      const cctx = `${ctx}, chiffres`;
      if (!Array.isArray(pp.chiffres)) {
        err(`${cctx} : un tableau de 2 à 4 objets { n, l } est attendu.`);
      } else {
        if (pp.chiffres.length < 2 || pp.chiffres.length > 4) {
          err(`${cctx} : ${pp.chiffres.length} entrée(s), 2 à 4 attendues.`);
        }
        pp.chiffres.forEach((f, j) => {
          if (f == null || typeof f !== 'object' || Array.isArray(f)) {
            err(`${cctx}[${j}] : un objet { n, l } est attendu.`);
            return;
          }
          if (!isNonEmptyString(f.n)) {
            err(`${cctx}[${j}].n : obligatoire.`);
          } else if (f.n.trim().length > 8) {
            err(`${cctx}[${j}].n : "${f.n}" dépasse 8 caractères.`);
          }
          if (!isNonEmptyString(f.l)) {
            err(`${cctx}[${j}].l : obligatoire.`);
          } else if (wordCount(f.l) > 3) {
            err(`${cctx}[${j}].l : "${f.l}" dépasse 3 mots.`);
          }
        });
      }
    }

    if (pp.media == null) {
      warn(`${ctx} (${pp.id ?? '?'}) : aucun media, la page projet s'ouvrira sans visuel.`);
    } else {
      validateMedia(pp.media, `${ctx}.media`, true);
    }

    /* lien et github : facultatifs, indépendants l'un de l'autre. Un projet
       dont le livrable est consultable en ligne, ou dont le code est ouvert,
       porte une sortie cliquable sous le bloc Résultat. Le texte des blocs
       étant échappé, c'est le seul endroit où une URL peut vivre.

       lien porte son libellé, parce qu'il nomme une chose différente à chaque
       projet. github n'en porte pas : un lien vers du dépôt se nomme toujours
       pareil, le gabarit le pose. */
    if (pp.lien != null) {
      const lctx = `${ctx}, lien`;
      if (typeof pp.lien !== 'object' || Array.isArray(pp.lien)) {
        err(`${lctx} : un objet { libelle, url } est attendu.`);
      } else {
        if (!isNonEmptyString(pp.lien.libelle)) {
          err(`${lctx}.libelle : obligatoire.`);
        } else if (wordCount(pp.lien.libelle) > 6) {
          err(`${lctx}.libelle : "${pp.lien.libelle}" dépasse 6 mots.`);
        }
        if (!isNonEmptyString(pp.lien.url)) {
          err(`${lctx}.url : obligatoire.`);
        } else if (!/^https:\/\/[^\s"']+$/.test(pp.lien.url.trim())) {
          err(`${lctx}.url : une URL https absolue est attendue ("${pp.lien.url}").`);
        }
      }
    }

    if (pp.github != null) {
      const gctx = `${ctx}, github`;
      if (!isNonEmptyString(pp.github)) {
        err(`${gctx} : une URL est attendue, pas ${JSON.stringify(pp.github)}.`);
      } else if (!/^https:\/\/(www\.)?github\.com\/[^\s"']+$/.test(pp.github.trim())) {
        err(`${gctx} : une URL https absolue sur github.com est attendue ("${pp.github}").`);
      }
    }

    if (isNonEmptyString(pp.resultat) && !/\d/.test(pp.resultat)) {
      warn(`${ctx}, resultat : ne contient ni chiffre ni date ("${pp.resultat}").`);
    }
  });

  if (Array.isArray(projets)) {
    projets.forEach((p) => {
      if (isNonEmptyString(p?.id) && !pageProjetById.has(p.id)) {
        warn(`content/page-projet.json : aucune entrée pour le projet "${p.id}".`);
      }
    });
  }
}

/* ==========================================================================
   Arrêt si une erreur bloquante a été accumulée. Rien n'est écrit.
   ======================================================================= */
if (errors.length > 0) {
  console.error(`Build interrompu, ${errors.length} erreur(s) :`);
  errors.forEach((m) => console.error(`  - ${m}`));
  process.exit(1);
}

/* ==========================================================================
   Markup des projets. ligne() et visual() sont déplacées telles quelles
   depuis le script de la page (git show HEAD:index.html, lignes 1471 à
   1505), seule modification : p.theme devient p.client, et les valeurs
   insérées passent par escapeHtml. Le dégradé reste le seul contenu du
   visuel, aucune balise img n'est générée.
   ======================================================================= */
function visual(p, i) {
  return `
      <div class="visual" data-loading>
        <svg class="visual__img" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"
             role="img" aria-label="Visuel du projet ${escapeHtml(p.nom)}">
          <defs>
            <linearGradient id="pj-g${i}" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stop-color="${p.a}"/>
              <stop offset="60%" stop-color="${p.b}"/>
              <stop offset="100%" stop-color="${p.c}"/>
            </linearGradient>
          </defs>
          <rect width="160" height="100" fill="url(#pj-g${i})"/>
          <path d="M0 100 L34 58 L58 78 L92 40 L118 66 L160 24 L160 100 Z"
                fill="${p.c}" opacity="0.22"/>
          <circle cx="122" cy="26" r="11" fill="${p.a}" opacity="0.7"/>
        </svg>
      </div>`;
}

function ligne(p, i) {
  return `
      <div class="row__grid wrap">
        <div class="stack">
          <span class="f-date">${escapeHtml(p.date)}</span>
          <h3 class="f-name"><span class="f-name__u">${escapeHtml(p.nom)}</span></h3>
          <span class="f-theme">${escapeHtml(p.client)}</span>
        </div>
        ${visual(p, i)}
      </div>`;
}

function boutonProjet(p, i) {
  const label = `${escapeHtml(p.nom)}, ${escapeHtml(p.client)}, ${escapeHtml(p.date)}`;
  return `<button class="row" type="button" data-index="${i}" aria-label="${label}"><div class="row__inner">${ligne(p, i)}</div></button>`;
}

/* ==========================================================================
   Markup du parcours, reproduisant au caractère près la structure actuelle
   d'un <li class="xp"> (git show HEAD:index.html, lignes 1111 à 1125).
   ======================================================================= */
function ligneParcours(x) {
  const nom = escapeHtml(x.nom);
  return `<li class="xp" id="xp-${x.id}" data-id="${x.id}">
  <h3 style="margin:0">
    <button class="xp__head" type="button" aria-expanded="false" aria-controls="fold-${x.id}">
      <span class="xp__mark" aria-hidden="true"></span>
      <span class="xp__name">${nom}</span>
      <span class="xp__dates">${escapeHtml(x.dates)}</span>
      <span class="xp__role">${escapeHtml(x.role)}</span>
    </button>
  </h3>
  <div class="xp__fold" id="fold-${x.id}" role="region" aria-label="${nom}">
    <div class="xp__foldInner">
      <p class="xp__body">${escapeHtml(x.body)}</p>
    </div>
  </div>
</li>`;
}

/* ==========================================================================
   Injection dans le gabarit, en indentant le markup au niveau du repère.
   Échec si le repère est absent, échec si un repère survit dans la sortie.
   ======================================================================= */
function injecte(template, marker, blocs) {
  const lines = template.split('\n');
  const idx = lines.findIndex((l) => l.includes(marker));
  if (idx === -1) {
    console.error(`src/index.html : le repère ${marker} est absent du gabarit.`);
    process.exit(1);
  }
  const line = lines[idx];
  const indent = line.match(/^\s*/)[0];
  const innerIndent = `${indent}  `;
  const contenu = blocs
    .map((bloc) => bloc.split('\n').map((l) => innerIndent + l).join('\n'))
    .join('\n');
  lines[idx] = line.replace(marker, `\n${contenu}\n${indent}`);
  return lines.join('\n');
}

const templatePath = join(ROOT, 'src/index.html');
let template;
try {
  template = readFileSync(templatePath, 'utf8');
} catch (e) {
  console.error(`src/index.html : introuvable (${e.message}).`);
  process.exit(1);
}

let out = injecte(template, '<!-- projets -->', projets.map(boutonProjet));
out = injecte(out, '<!-- parcours -->', parcours.map(ligneParcours));

/* ==========================================================================
   Donnée injectée dans les deux modules de script qui lisent les projets,
   la section Projets et la page projet. Le markup est généré au-dessus,
   ces objets sont ce que le script lit ensuite : PROJETS pour les noms et
   les couleurs, PROJETS_CONTENU pour la page projet, indexé sur la position
   dans content/projets.json.

   Le script pose ces valeurs dans du innerHTML sans les échapper, donc elles
   sont échappées ici, avant de devenir du JSON.
   ======================================================================= */
function paragraphes(texte) {
  return String(texte).split(/\n+/).map((t) => t.trim()).filter(Boolean).map(escapeHtml);
}

const donneeProjets = projets.map((p) => ({
  date: escapeHtml(p.date),
  nom: escapeHtml(p.nom),
  theme: escapeHtml(p.client),
  a: p.a,
  b: p.b,
  c: p.c
}));

const donneePageProjet = {};
pageProjet.forEach((pp) => {
  const i = projets.findIndex((p) => p.id === pp.id);
  if (i === -1) return;
  const p = projets[i];
  const cap = pp.media && isNonEmptyString(pp.media.alt)
    ? escapeHtml(pp.media.alt)
    : `Visuel du projet ${escapeHtml(p.nom)}`;
  donneePageProjet[i] = {
    chapo: escapeHtml(pp.chapo),
    client: escapeHtml(p.client),
    media: { cap },
    blocs: [
      { h: 'Contexte', p: paragraphes(pp.contexte) },
      { h: 'Enjeu', callout: escapeHtml(pp.enjeu), perim: escapeHtml((pp.perimetre || []).join(', ')) },
      { h: 'Démarche', p: paragraphes(pp.demarche) },
      {
        h: 'Résultat',
        result: true,
        ...(Array.isArray(pp.chiffres) && pp.chiffres.length > 0
          ? { figs: pp.chiffres.map((f) => ({ n: escapeHtml(f.n.trim()), l: escapeHtml(f.l.trim()) })) }
          : {}),
        p: paragraphes(pp.resultat),
        ...(pp.lien ? { lien: { libelle: escapeHtml(pp.lien.libelle), url: escapeHtml(pp.lien.url.trim()) } } : {}),
        ...(pp.github ? { github: escapeHtml(pp.github.trim()) } : {})
      }
    ]
  };
});

function injecteDonnee(html, marker, valeur) {
  if (!html.includes(marker)) {
    console.error(`src/index.html : le repère ${marker} est absent du gabarit.`);
    process.exit(1);
  }
  return html.replace(marker, JSON.stringify(valeur, null, 2));
}

out = injecteDonnee(out, '[/* projets-data */]', donneeProjets);
out = injecteDonnee(out, '{/* page-projet-data */}', donneePageProjet);

if (out.includes('<!-- projets -->') || out.includes('<!-- parcours -->')
    || out.includes('projets-data') || out.includes('page-projet-data')) {
  console.error('src/index.html : un repère survit dans la sortie, écriture annulée.');
  process.exit(1);
}

/* ==========================================================================
   Écriture. Rien n'est écrit avant que toutes les validations soient
   passées.
   ======================================================================= */
const distDir = join(ROOT, 'dist');
/* Le dossier est refait de zéro : un fichier retiré de src/assets/ ne doit
   pas survivre dans la sortie d'un build précédent. */
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, 'index.html'), out, 'utf8');
cpSync(join(ROOT, 'src/assets'), join(distDir, 'assets'), { recursive: true });

/* ==========================================================================
   dist/apercu.html : la même page, dont la carte projet attend son contenu
   du dehors au lieu de le tenir du build.

   La page de saisie (skill contenu) vit sur claude.ai et ne voit pas ce
   dépôt. Elle charge donc ce fichier dans une iframe et lui envoie par
   postMessage ce que Mathieu est en train de taper, enregistré ou non. Le
   rendu est celui du site parce que c'est le fichier du site : même feuille
   de style, même fonction de rendu, aucune copie à resynchroniser.

   Ce qui arrive par message est du texte saisi ailleurs, donc échappé ici
   avant d'entrer dans le markup, exactement comme le build échappe le JSON.
   ======================================================================= */
const SHIM_APERCU = `<style>
  /* Un aperçu ne se referme pas : il n'y a rien derrière lui. */
  html[data-apercu] #pj-close { display: none; }
</style>
<script>
(function () {
  /* pageProjet est un const de premier niveau : il vit dans la portee lexicale
     globale, pas sur window, et se lit donc par son nom. */
  var pj = typeof pageProjet !== 'undefined' ? pageProjet : null;
  if (!pj || typeof pj.apercu !== 'function') return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function couleur(v, defaut) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(v || '').trim())
      ? String(v).trim() : defaut;
  }
  function adresse(u) {
    u = String(u == null ? '' : u).trim();
    return /^https?:\\/\\//i.test(u) ? esc(u) : '';
  }
  function paragraphes(t) {
    return String(t == null ? '' : t).split(/\\n+/)
      .map(function (x) { return x.trim(); })
      .filter(Boolean).map(esc);
  }
  function texte(v) { return esc(String(v == null ? '' : v).trim()); }

  function rendre(m) {
    var pr = m.projet || {};
    var pp = m.page || {};
    var p = {
      nom: texte(pr.nom) || 'Sans titre',
      date: texte(pr.date),
      a: couleur(pr.a, '#6b6257'),
      b: couleur(pr.b, '#8d8377'),
      c: couleur(pr.c, '#b3a898')
    };
    var per = (pp.perimetre || []).map(function (x) { return String(x || '').trim(); })
      .filter(Boolean).join(', ');
    var figs = (pp.chiffres || []).filter(function (f) {
      return f && String(f.n || '').trim() && String(f.l || '').trim();
    }).map(function (f) { return { n: texte(f.n), l: texte(f.l) }; });
    var resultat = {
      h: 'Résultat', result: true,
      p: paragraphes(pp.resultat)
    };
    if (figs.length) resultat.figs = figs;
    var lienUrl = adresse(pp.lien && pp.lien.url);
    if (lienUrl && String((pp.lien || {}).libelle || '').trim()) {
      resultat.lien = { libelle: texte(pp.lien.libelle), url: lienUrl };
    }
    var git = adresse(pp.github);
    if (git) resultat.github = git;

    var alt = String((pp.media || {}).alt || '').trim();
    var c = {
      chapo: texte(pp.chapo),
      client: texte(pr.client),
      media: { cap: alt ? esc(alt) : 'Visuel du projet ' + p.nom },
      blocs: [
        { h: 'Contexte', p: paragraphes(pp.contexte) },
        { h: 'Enjeu', callout: texte(pp.enjeu), perim: esc(per) },
        { h: 'Démarche', p: paragraphes(pp.demarche) },
        resultat
      ]
    };
    pj.apercu(p, c);
  }

  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'apercu-page-projet') return;
    try { rendre(d); } catch (err) { /* une saisie incomplète ne casse rien */ }
  });

  /* La page de saisie attend ce signal pour envoyer sa première donnée. */
  var hote = window.opener || (window.parent !== window ? window.parent : null);
  if (hote) hote.postMessage({ type: 'apercu-pret' }, '*');
}());
</script>
`;

writeFileSync(join(distDir, 'apercu.html'), out.replace('</body>', SHIM_APERCU + '</body>'), 'utf8');

console.log(`Build terminé : ${projets.length} projet(s), ${parcours.length} expérience(s), ${pageProjet.length} page(s) projet.`);
if (warnings.length > 0) {
  console.error(`${warnings.length} avertissement(s) :`);
  warnings.forEach((m) => console.error(`  - ${m}`));
}
