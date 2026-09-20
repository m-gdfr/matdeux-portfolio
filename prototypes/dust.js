/*
 * dust.js
 * Moteur de poussière lumineuse pour l'écran Parcours.
 * Canvas 2D, vanilla, aucune dépendance, aucun build.
 *
 * ===========================================================================
 * CONTRAT
 * ===========================================================================
 *
 *   var dust = createDust(canvas, { mode: 'condense' | 'orbit' | 'disperse' });
 *   dust.setState({ range: [a, b] | null, phase: 'rest' | 'preview' | 'selected' });
 *   dust.resize();
 *   dust.destroy();
 *
 * `range` : deux fractions de [0, 1], bornes de la part désignée dans l'ordre
 * chronologique du parcours. [0, 0.36] est l'expérience la plus récente.
 *
 * ===========================================================================
 * LA GEOMETRIE, COMMUNE AUX TROIS MODES
 * ===========================================================================
 *
 * ATTENTION, la géométrie décrite ci-dessous a été amendée après coup.
 * L'appartenance à une part n'est plus la latitude : c'est un tirage
 * aléatoire (permutation de valeurs stratifiées, tableau `appart`). Une part
 * ne forme donc plus une bande, elle est dispersée dans toute la sphère.
 * Ce qui reste vrai : la proportion est exacte, 36 % de part = 36 % des
 * particules. Ce qui est perdu : la part n'est plus une région, donc deux
 * parts voisines en taille ne se distinguent plus à l'oeil. Décision produit
 * assumée, la lecture passe entièrement par la densité lumineuse globale.
 *
 * Chaque particule porte une fraction u de [0, 1], sa place dans le parcours.
 * u est stratifié : la particule d'indice i reçoit u = (i + aléa) / N. Une
 * part [a, b] contient donc exactement (b - a) * N particules, à une unité
 * près. La proportion n'est pas approchée, elle est construite.
 *
 * u se lit comme une LATITUDE : z = 1 - 2u, azimut libre. u = 0 est le pôle
 * haut, u = 1 le pôle bas. Une part est une bande horizontale de la sphère.
 *
 * Pourquoi la latitude, et pas un quartier ni un anneau :
 *
 * 1. Théorème d'Archimède. L'aire d'une bande sphérique ne dépend que de sa
 *    hauteur en z, pas de sa latitude. Une bande de 36 % en u couvre donc
 *    exactement 36 % de la surface de la sphère, où qu'elle se trouve. Aucune
 *    autre découpe simple n'a cette propriété : un quartier vertical est
 *    exact en aire mais sa moitié arrière est cachée, un anneau concentrique
 *    se déforme en projection. La bande est la seule découpe dont l'aire, le
 *    nombre de particules et la fraction annoncée coïncident.
 * 2. La liste à gauche se lit de haut en bas, le plus récent en premier. La
 *    sphère se lit de haut en bas, le plus récent en haut. Survoler la
 *    première ligne allume le haut de la sphère : la correspondance est
 *    spatiale, elle n'a pas à être apprise.
 * 3. La rotation du champ se fait autour de l'axe vertical, c'est-à-dire
 *    autour de l'axe des pôles. Les bandes sont invariantes par cette
 *    rotation : la poussière tourne en permanence sans qu'une part ne dérive
 *    jamais de sa place. C'est ce qui rend le mouvement continu compatible
 *    avec une lecture stable.
 *
 * La sphère n'est pas une coque : chaque particule a un rayon propre entre
 * 0.68 et 1.0, plus un décalage aléatoire fixe qui donne son volume au nuage.
 * Environ 58 % des particules sont regroupées en 30 filaments, arcs courts
 * confinés dans une plage de 0.035 en u, donc sans jamais franchir plus d'une
 * frontière de part. C'est la structure filamentaire de la référence.
 *
 * ===========================================================================
 * LES TROIS MODES, VALEURS EXACTES
 * ===========================================================================
 *
 * Toutes les transitions utilisent la même mécanique : une approche
 * exponentielle amortie, indépendante de la fréquence d'images :
 *
 *     valeur += (cible - valeur) * (1 - exp(-dt / tau))
 *
 * C'est le seul schéma qui tienne la règle "chaque particule repart de son
 * état courant à l'écran". Il n'a pas d'état de départ mémorisé, donc pas de
 * file d'attente, pas de saut, pas de re-déclenchement. On peut changer de
 * part au milieu d'un mouvement, trente fois de suite, sans artefact. Une
 * cubic-bezier serait ici un défaut : elle a besoin d'un point de départ figé
 * et d'une horloge par particule, donc d'une file.
 *
 * L'équivalence avec une durée : 95 % du chemin est parcouru en 3 * tau. La
 * courbe est un ease-out pur, exactement le profil voulu pour une arrivée
 * (départ vif, fin longue et douce), et jamais un ease-in.
 *
 *   TAU_PREVIEW  = 55 ms   soit 165 ms perçus
 *   TAU_SELECTED = 75 ms   soit 225 ms perçus
 *   TAU_REST     = 110 ms  soit 330 ms perçus
 *
 * Pourquoi le survol n'est PAS instantané. Un basculement instantané sur
 * 3000 particules produit un clignotement : l'oeil voit une image changer,
 * pas une matière se déplacer, et un balayage de trois lignes en une seconde
 * devient un stroboscope. 165 ms est sous le seuil où l'on attend quelque
 * chose, et au-dessus du seuil où l'on voit une direction. Un survol chassé
 * par un autre après 120 ms se retourne proprement à mi-chemin, puisque la
 * particule repart de là où elle est.
 *
 * Pourquoi la sélection est plus lente que le survol. Elle est définitive et
 * accompagne le dépliage de la fiche, qui dure 220 ms. 225 ms cale la
 * poussière sur la fiche, à 5 ms près. Le survol, lui, doit devancer la main.
 *
 * Pourquoi le retour au repos est plus lent que l'aller. Rien ne dépend de
 * l'état de repos : on n'y attend aucune information. Un retour au même
 * rythme que l'aller se lit comme un claquement. 330 ms laisse le nuage se
 * redétendre. C'est le seul endroit où le budget de 300 ms est dépassé, et il
 * l'est sur une disparition d'information, pas sur son apparition.
 *
 * Le survol produit 72 % du contraste de la sélection (FORCE_PREVIEW = 0.72).
 * L'aperçu est le même geste, moins affirmé. La sélection reste l'état le
 * plus contrasté, ce qui est demandé.
 *
 * ---------------------------------------------------------------------------
 * MODE 1, `condense` : l'information est la DENSITE
 * ---------------------------------------------------------------------------
 *   Rotation globale        0.012 rad/s (un tour en 8 min 43 s)
 *   Houle par particule     0.045 à 0.10 Hz, amplitude 0.012 unité sphère
 *   Dispersion au repos     0.085 R  (le nuage est lâche)
 *   Dispersion de la part   0.010 R  (elle se resserre à 12 % de son volume)
 *   Dispersion du reste     0.115 R  (il se délite)
 *   Taille part             x 1.62   Taille reste  x 0.82
 *   Opacité part            x 1.55   Opacité reste x 0.20
 *   Halo part               une passe unique, alpha 0.055, taille x 2.8
 *
 *   La part ne se déplace pas dans la sphère, elle se rassemble sur sa propre
 *   position exacte. Le reste reste visible à 20 % : il faut un témoin pour
 *   qu'une proportion se lise, un rapport a besoin de ses deux termes.
 *
 * ---------------------------------------------------------------------------
 * MODE 2, `orbit` : l'information est le MOUVEMENT
 * ---------------------------------------------------------------------------
 *   Rotation au repos       0.100 rad/s (un tour en 62.8 s), tout le champ
 *                           d'un bloc, chaque particule à la même vitesse
 *   Vitesse de la part      x 1.12 de la vitesse de repos
 *   Vitesse du reste        x 0.02, soit un arrêt visuel complet
 *   Houle du reste          x 0.05, sinon l'arrêt n'est pas un arrêt
 *   Opacité part            x 1.35   Opacité reste x 0.16
 *   Taille part             x 1.28   Taille reste  x 0.80
 *   La vitesse angulaire est amortie avec le même tau que le reste, donc la
 *   décélération dure 165 ms en survol et 225 ms en sélection.
 *
 *   L'angle est intégré par particule, pas dérivé. Une particule ralentie
 *   s'immobilise là où elle se trouve, et repart de là quand on relâche : le
 *   champ garde la trace des désignations passées, comme un disque qu'on
 *   freine à la main. C'est le seul des trois modes où l'arrêt porte le sens.
 *
 * ---------------------------------------------------------------------------
 * MODE 3, `disperse` : l'information est la PLACE
 * ---------------------------------------------------------------------------
 *   Rotation globale        0.020 rad/s (un tour en 5 min 14 s)
 *   Poussée du reste        + 0.95 R en rayon, profil en puissance 1.4
 *   Opacité du reste        (1 - neg) puissance 1.5, jusqu'à zéro
 *   Opacité part            x 1.40   Taille part x 1.30
 *   Houle de la part        x 0.35   (la part se plante, sans s'arrêter)
 *   Vague de départ         tau local multiplié par 1.0 à 1.9 selon la
 *                           distance en u au bord de la part (normalisée sur
 *                           0.45). Le plus loin part en premier, le plus
 *                           proche en dernier : la vague se retire VERS la
 *                           part et s'arrête net à sa frontière, ce qui
 *                           dessine le bord au lieu de le laisser deviner.
 *                           Pire cas : 3 * 75 * 1.9 = 427 ms en sélection.
 *                           Même ordre de grandeur que les 487 ms de la
 *                           cascade DOM, et pour la même raison : c'est une
 *                           onde à vitesse constante, pas une durée fixe.
 *
 *   La vague est obtenue en modulant tau par particule, pas par un retard.
 *   Un retard exigerait une horloge par particule, donc une file, donc un
 *   saut quand on change de part en plein mouvement.
 *
 * ===========================================================================
 * PERFORMANCE
 * ===========================================================================
 *   3000 particules par défaut. Une seule boucle requestAnimationFrame.
 *   Aucun shadowBlur. Aucune ombre. Aucun gradient par particule.
 *   Le rendu range les particules dans 12 paliers d'opacité, puis trace un
 *   seul chemin par palier : 12 changements de globalAlpha et 12 fill() par
 *   image au lieu de 3000. Le halo de la part est une 13e passe.
 *   devicePixelRatio plafonné à 2.
 *   Dégradation automatique : si la moyenne de 120 images dépasse 19 ms, le
 *   moteur passe à 2250 particules, puis à 1700, jamais en dessous, et ne
 *   remonte jamais (une hystérésis qui oscille est pire que le ralentissement
 *   qu'elle corrige). Le sous-ensemble est tiré au hasard indépendamment de
 *   u, donc la proportion reste juste.
 *   La boucle s'arrête quand l'onglet est caché et quand le canvas sort du
 *   viewport. Au réveil, dt est plafonné à 33 ms pour qu'aucun saut ne se
 *   produise.
 *
 * ===========================================================================
 * MOUVEMENT REDUIT
 * ===========================================================================
 *   Sous prefers-reduced-motion: reduce, la dérive s'arrête, la rotation
 *   s'arrête, et les transitions d'état deviennent instantanées : une image
 *   est tracée à chaque setState, la boucle reste éteinte. La media query est
 *   surveillée à chaud, dans les deux sens.
 */

(function (global) {
  'use strict';

  // --- Constantes partagées ------------------------------------------------

  var COULEUR = '#fffdf6';

  var N_DEFAUT = 3000;
  var PALIERS = [1, 0.75, 0.5667];   // facteurs de dégradation successifs
  var SEUIL_DEGRADATION = 19;        // ms de moyenne sur 120 images
  var FENETRE_MESURE = 120;

  var TAU_PREVIEW = 55;
  var TAU_SELECTED = 75;
  var TAU_REST = 110;
  var FORCE_PREVIEW = 0.72;

  var NB_NIVEAUX = 12;               // paliers d'opacité pour le lot de tracé
  var FOV = 2.8;                     // profondeur de la projection perspective
  var P_LOIN = FOV / (FOV + 1);      // 0.7368
  var P_PRES = FOV / (FOV - 1);      // 1.5556
  var P_AMPLI = P_PRES - P_LOIN;

  var NB_FILAMENTS = 30;
  var PART_FILAMENTEE = 0.58;
  var ETALEMENT_FILAMENT = 0.035;    // en u, donc toujours dans une seule part

  var DISPERSION_REPOS = 0.085;      // volume du nuage, en unités de rayon

  // Réglages propres à chaque mode. Tout ce qui distingue les trois
  // comportements est ici ou dans `appliquerMode`.
  var MODES = {
    condense: { rotation: 0.012, houle: 1.00 },
    orbit:    { rotation: 0.100, houle: 0.85 },
    disperse: { rotation: 0.020, houle: 1.00 }
  };

  function serrer(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  // --- Le moteur -----------------------------------------------------------

  function createDust(canvas, options) {
    if (!canvas || !canvas.getContext) {
      throw new Error('createDust : canvas manquant');
    }
    var opts = options || {};
    var mode = MODES[opts.mode] ? opts.mode : 'condense';
    var reglage = MODES[mode];

    var ctx = canvas.getContext('2d', { alpha: true });

    // -- État demandé par la page ------------------------------------------
    var rangeA = 0, rangeB = 0, aUnePart = false;
    var phase = 'rest';

    // -- Géométrie du canvas -----------------------------------------------
    var largeur = 0, hauteur = 0, cx = 0, cy = 0, R = 0, dpr = 1;

    // -- Données des particules --------------------------------------------
    // Un tableau typé par grandeur. Tout est alloué une fois.
    var N = opts.count || N_DEFAUT;
    var niveauDegradation = 0;
    var fraction = 1;                // part des particules réellement tracées

    var u = new Float32Array(N);     // latitude, 0 en haut, 1 en bas
    /* Appartenance à une part. Découplée de la latitude : c'est une
       permutation aléatoire des mêmes valeurs stratifiées. La proportion
       reste donc exacte au grain près, mais les particules désignées sont
       dispersées dans toute la sphère au lieu de former une bande. */
    var appart = new Float32Array(N);
    var phi0 = new Float32Array(N);  // azimut de base
    var rayon = new Float32Array(N); // rayon propre, 0.68 à 1
    var jx = new Float32Array(N);    // décalage fixe qui donne son volume au nuage
    var jy = new Float32Array(N);
    var jz = new Float32Array(N);
    var tailleBase = new Float32Array(N);
    var alphaBase = new Float32Array(N);
    var freqU = new Float32Array(N); // houle, trois axes désynchronisés
    var freqP = new Float32Array(N);
    var freqR = new Float32Array(N);
    var phaseU = new Float32Array(N);
    var phaseP = new Float32Array(N);
    var phaseR = new Float32Array(N);
    var tirage = new Float32Array(N); // rang aléatoire, sert à la dégradation

    // Grandeurs animées, elles seules portent l'état visible.
    var gain = new Float32Array(N);   // -1 exclu, 0 repos, +1 désigné
    var vitesse = new Float32Array(N);// mode orbit seulement
    var angle = new Float32Array(N);  // mode orbit seulement, angle intégré

    // Tampons de tracé : un par palier d'opacité, x / y / taille.
    var lots = [], compteurs = new Int32Array(NB_NIVEAUX);
    var halo = null, nHalo = 0;

    function allouerTampons() {
      lots = [];
      for (var k = 0; k < NB_NIVEAUX; k++) lots.push(new Float32Array(N * 3));
      halo = new Float32Array(N * 3);
    }

    function semer() {
      // Filaments : des arcs courts, confinés en latitude.
      var fu = new Float32Array(NB_FILAMENTS);
      var fp = new Float32Array(NB_FILAMENTS);
      var fl = new Float32Array(NB_FILAMENTS);
      for (var f = 0; f < NB_FILAMENTS; f++) {
        fu[f] = Math.random();
        fp[f] = Math.random() * Math.PI * 2;
        fl[f] = 0.5 + Math.random() * 1.6;   // longueur d'arc en radians
      }

      for (var i = 0; i < N; i++) {
        // u stratifié : la proportion est exacte par construction.
        var base = (i + Math.random()) / N;

        if (Math.random() < PART_FILAMENTEE) {
          // Rattaché à un filament, mais ramené vers son u stratifié pour ne
          // pas casser la contiguïté des parts.
          var f2 = (Math.random() * NB_FILAMENTS) | 0;
          var t = Math.random();
          var du = (fu[f2] - base);
          // On ne suit le filament que dans une fenêtre étroite autour de u.
          if (du > ETALEMENT_FILAMENT) du = ETALEMENT_FILAMENT;
          if (du < -ETALEMENT_FILAMENT) du = -ETALEMENT_FILAMENT;
          u[i] = serrer(base + du * 0.6, 0, 0.999999);
          phi0[i] = fp[f2] + (t - 0.5) * fl[f2] + (Math.random() - 0.5) * 0.10;
          rayon[i] = 0.80 + Math.random() * 0.20;
        } else {
          u[i] = base;
          phi0[i] = Math.random() * Math.PI * 2;
          rayon[i] = 0.68 + Math.pow(Math.random(), 0.55) * 0.32;
        }

        // Décalage fixe, tiré dans une boule, qui épaissit le nuage.
        var a1 = Math.random() * Math.PI * 2;
        var c1 = Math.random() * 2 - 1;
        var s1 = Math.sqrt(1 - c1 * c1);
        var m1 = Math.pow(Math.random(), 0.4);
        jx[i] = Math.cos(a1) * s1 * m1;
        jy[i] = c1 * m1;
        jz[i] = Math.sin(a1) * s1 * m1;

        // Poussière fine : la loi de puissance garde la majorité des
        // particules dans le bas de la plage, quelques-unes seulement sont
        // grosses. Un tirage uniforme donnerait des billes.
        tailleBase[i] = 0.80 + Math.pow(Math.random(), 2.2) * 1.20;
        alphaBase[i] = 0.30 + Math.random() * 0.42;

        freqU[i] = 0.045 + Math.random() * 0.055;
        freqP[i] = 0.045 + Math.random() * 0.055;
        freqR[i] = 0.040 + Math.random() * 0.045;
        phaseU[i] = Math.random() * Math.PI * 2;
        phaseP[i] = Math.random() * Math.PI * 2;
        phaseR[i] = Math.random() * Math.PI * 2;

        tirage[i] = Math.random();
        gain[i] = 0;
        vitesse[i] = reglage.rotation;
        angle[i] = 0;
      }

      /* Appartenance : valeurs stratifiées, puis mélange de Fisher et Yates.
         Stratifier avant de mélanger garantit que la part [a, b] contient
         exactement (b - a) * N particules ; mélanger garantit qu'elles ne
         forment aucune région. Les deux propriétés sont indépendantes. */
      for (var q = 0; q < N; q++) appart[q] = (q + Math.random()) / N;
      for (var q2 = N - 1; q2 > 0; q2--) {
        var q3 = (Math.random() * (q2 + 1)) | 0;
        var tmp = appart[q2]; appart[q2] = appart[q3]; appart[q3] = tmp;
      }
    }

    allouerTampons();
    semer();

    // -- Mouvement réduit ---------------------------------------------------
    var mq = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    var mouvementReduit = mq ? mq.matches : false;

    function surChangementMq(e) {
      mouvementReduit = e.matches;
      if (mouvementReduit) {
        arreterBoucle();
        poserEtatFinal();
        dessiner();
      } else {
        relancerSiPossible();
      }
    }
    if (mq) {
      if (mq.addEventListener) mq.addEventListener('change', surChangementMq);
      else if (mq.addListener) mq.addListener(surChangementMq);
    }

    // -- Horloges -----------------------------------------------------------
    var frame = 0;
    var dernierT = 0;
    var tempsVie = 0;       // horloge de la houle, ne tourne pas en repos forcé
    var rotationGlobale = 0;
    var detruit = false;

    // Mesure pour la dégradation automatique.
    var cumul = 0, images = 0;

    // -- Visibilité ---------------------------------------------------------
    var ongletVisible = !global.document || !global.document.hidden;
    var dansViewport = true;

    function surVisibilite() {
      ongletVisible = !global.document.hidden;
      if (ongletVisible) relancerSiPossible(); else arreterBoucle();
    }
    if (global.document) {
      global.document.addEventListener('visibilitychange', surVisibilite);
    }

    var io = null;
    if (global.IntersectionObserver) {
      io = new global.IntersectionObserver(function (entrees) {
        dansViewport = entrees[0].isIntersecting;
        if (dansViewport) relancerSiPossible(); else arreterBoucle();
      }, { threshold: 0 });
      io.observe(canvas);
    }

    var ro = null;
    if (global.ResizeObserver) {
      ro = new global.ResizeObserver(function () { resize(); });
      ro.observe(canvas);
    }

    // -- Dimensionnement ----------------------------------------------------

    function resize() {
      if (detruit) return;
      var rect = canvas.getBoundingClientRect();
      var w = Math.round(rect.width) || canvas.clientWidth || 0;
      var h = Math.round(rect.height) || canvas.clientHeight || 0;
      if (w <= 0 || h <= 0) return;

      dpr = Math.min(global.devicePixelRatio || 1, 2);
      largeur = w;
      hauteur = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;
      // Rayon tel que le limbe le plus proche reste dans le cadre.
      R = Math.min(w, h) * 0.40;
      if (mouvementReduit || !frame) dessiner();
    }

    // -- État demandé -------------------------------------------------------

    function setState(etat) {
      if (detruit) return;
      etat = etat || {};

      if (Object.prototype.hasOwnProperty.call(etat, 'range')) {
        var r = etat.range;
        if (r && r.length === 2 && isFinite(r[0]) && isFinite(r[1])) {
          var a = serrer(Math.min(r[0], r[1]), 0, 1);
          var b = serrer(Math.max(r[0], r[1]), 0, 1);
          aUnePart = b > a;
          rangeA = a;
          rangeB = b;
        } else {
          aUnePart = false;
        }
      }
      if (etat.phase) phase = etat.phase;

      if (mouvementReduit) {
        // Transitions instantanées : on pose l'état final et on trace une
        // image unique. Aucune boucle n'est relancée.
        poserEtatFinal();
        dessiner();
      } else {
        relancerSiPossible();
      }
    }

    function forceCourante() {
      if (!aUnePart || phase === 'rest') return 0;
      return phase === 'selected' ? 1 : FORCE_PREVIEW;
    }

    function tauCourant() {
      if (!aUnePart || phase === 'rest') return TAU_REST;
      return phase === 'selected' ? TAU_SELECTED : TAU_PREVIEW;
    }

    function cibleGain(i, force) {
      if (force === 0) return 0;
      return (appart[i] >= rangeA && appart[i] < rangeB) ? force : -force;
    }

    function poserEtatFinal() {
      var force = forceCourante();
      for (var i = 0; i < N; i++) {
        gain[i] = cibleGain(i, force);
        if (mode === 'orbit') vitesse[i] = 0;
      }
    }

    // -- Intégration --------------------------------------------------------

    function avancer(dt) {
      var force = forceCourante();
      var tau = tauCourant();
      var k = 1 - Math.exp(-dt / tau);

      var i, cible;

      if (mode === 'disperse' && force !== 0) {
        // Vague : tau modulé par la distance en u au bord de la part. Le plus
        // loin part en premier, le plus proche en dernier.
        for (i = 0; i < N; i++) {
          if (tirage[i] >= fraction) continue;   // particule retirée par la dégradation
          var ui = appart[i];
          var d = ui < rangeA ? (rangeA - ui) : (ui > rangeB ? ui - rangeB : 0);
          var proche = 1 - serrer(d / 0.45, 0, 1);
          var kl = 1 - Math.exp(-dt / (tau * (1 + 0.9 * proche)));
          cible = cibleGain(i, force);
          gain[i] += (cible - gain[i]) * kl;
        }
      } else {
        for (i = 0; i < N; i++) {
          if (tirage[i] >= fraction) continue;
          cible = cibleGain(i, force);
          gain[i] += (cible - gain[i]) * k;
        }
      }

      if (mode === 'orbit') {
        // La vitesse est amortie, l'angle est intégré : une particule
        // freinée s'arrête là où elle est, et y reste.
        var w0 = reglage.rotation;
        for (i = 0; i < N; i++) {
          if (tirage[i] >= fraction) continue;
          var g = gain[i];
          var pos = g > 0 ? g : 0;
          var neg = g < 0 ? -g : 0;
          var vc = w0 * (1 + 0.12 * pos) * (1 - 0.98 * neg);
          vitesse[i] += (vc - vitesse[i]) * k;
          angle[i] += vitesse[i] * dt * 0.001;
        }
      } else {
        rotationGlobale += reglage.rotation * dt * 0.001;
      }

      tempsVie += dt * 0.001;
    }

    // -- Rendu --------------------------------------------------------------

    function dessiner() {
      if (largeur === 0) return;
      ctx.clearRect(0, 0, largeur, hauteur);

      for (var k = 0; k < NB_NIVEAUX; k++) compteurs[k] = 0;
      nHalo = 0;

      var limite = fraction;
      var i;

      for (i = 0; i < N; i++) {
        if (tirage[i] >= limite) continue;

        var g = gain[i];
        var pos = g > 0 ? g : 0;
        var neg = g < 0 ? -g : 0;

        // --- Facteurs propres au mode ---------------------------------
        var ampJitter, facTaille, facAlpha, facHoule, facRayon;

        if (mode === 'condense') {
          // La densité porte l'information : la part se resserre sur sa
          // position exacte, le reste se délite.
          ampJitter = DISPERSION_REPOS * (1 - 0.88 * pos + 0.35 * neg);
          facTaille = 1 + 0.62 * pos - 0.18 * neg;
          facAlpha = (1 + 0.55 * pos) * (1 - 0.80 * neg);
          facHoule = 1 - 0.70 * pos;
          facRayon = 1;
        } else if (mode === 'orbit') {
          // Le mouvement porte l'information : le reste s'immobilise et
          // s'éteint, mais ne disparaît pas. Il reste le témoin du tout.
          ampJitter = DISPERSION_REPOS;
          facTaille = 1 + 0.28 * pos - 0.20 * neg;
          facAlpha = (1 + 0.35 * pos) * (1 - 0.84 * neg);
          facHoule = 1 - 0.95 * neg;
          facRayon = 1;
        } else {
          // La place porte l'information : le reste est soufflé vers
          // l'extérieur, la part ne bouge pas.
          ampJitter = DISPERSION_REPOS * (1 + 0.6 * neg);
          facTaille = 1 + 0.30 * pos - 0.10 * neg;
          facAlpha = (1 + 0.40 * pos) * Math.pow(1 - neg, 1.5);
          facHoule = 1 - 0.65 * pos;
          facRayon = 1 + 0.95 * Math.pow(neg, 1.4);
        }

        if (facAlpha <= 0.004) continue;

        // --- Position dans la sphère -----------------------------------
        var t = tempsVie;
        var amplitudeHoule = 0.012 * reglage.houle * facHoule;

        var zz = 1 - 2 * u[i]
          + amplitudeHoule * Math.sin(freqU[i] * 6.2831853 * t + phaseU[i]);
        if (zz > 1) zz = 1; else if (zz < -1) zz = -1;
        var rho = Math.sqrt(1 - zz * zz);

        var az = phi0[i]
          + (mode === 'orbit' ? angle[i] : rotationGlobale)
          + amplitudeHoule * 1.8 * Math.sin(freqP[i] * 6.2831853 * t + phaseP[i]);

        var rr = rayon[i] * facRayon
          * (1 + amplitudeHoule * 0.9 * Math.sin(freqR[i] * 6.2831853 * t + phaseR[i]));

        var x3 = rr * rho * Math.cos(az) + jx[i] * ampJitter;
        var y3 = rr * zz + jy[i] * ampJitter;
        var z3 = rr * rho * Math.sin(az) + jz[i] * ampJitter;

        // --- Projection -------------------------------------------------
        var p = FOV / (FOV + z3);
        var sx = cx + x3 * R * p;
        var sy = cy - y3 * R * p;

        if (sx < -8 || sx > largeur + 8 || sy < -8 || sy > hauteur + 8) continue;

        var profondeur = (p - P_LOIN) / P_AMPLI;   // 0 au fond, 1 devant
        var taille = tailleBase[i] * facTaille * (0.72 + 0.50 * profondeur);
        if (taille < 0.55) taille = 0.55;
        else if (taille > 2.60) taille = 2.60;

        var alpha = alphaBase[i] * facAlpha * (0.32 + 0.68 * profondeur);
        if (alpha > 1) alpha = 1;

        // --- Rangement par palier d'opacité -----------------------------
        var niv = (alpha * NB_NIVEAUX) | 0;
        if (niv >= NB_NIVEAUX) niv = NB_NIVEAUX - 1;
        var lot = lots[niv];
        var c = compteurs[niv] * 3;
        lot[c] = sx - taille * 0.5;
        lot[c + 1] = sy - taille * 0.5;
        lot[c + 2] = taille;
        compteurs[niv]++;

        // Halo de la part. Pas de shadowBlur : une seule passe de rectangles
        // larges et très pâles, uniquement sur les particules désignées.
        if (pos > 0.45) {
          var ch = nHalo * 3;
          var th = taille * 2.8;
          halo[ch] = sx - th * 0.5;
          halo[ch + 1] = sy - th * 0.5;
          halo[ch + 2] = th;
          nHalo++;
        }
      }

      ctx.fillStyle = COULEUR;

      if (nHalo > 0) {
        ctx.globalAlpha = 0.055;
        ctx.beginPath();
        for (i = 0; i < nHalo; i++) {
          var h3 = i * 3;
          ctx.rect(halo[h3], halo[h3 + 1], halo[h3 + 2], halo[h3 + 2]);
        }
        ctx.fill();
      }

      for (var n = 0; n < NB_NIVEAUX; n++) {
        var nb = compteurs[n];
        if (nb === 0) continue;
        ctx.globalAlpha = (n + 0.5) / NB_NIVEAUX;
        ctx.beginPath();
        var buf = lots[n];
        for (i = 0; i < nb; i++) {
          var b3 = i * 3;
          ctx.rect(buf[b3], buf[b3 + 1], buf[b3 + 2], buf[b3 + 2]);
        }
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }

    // -- Boucle -------------------------------------------------------------

    function boucle(t) {
      if (detruit) return;
      var dt = dernierT ? t - dernierT : 16.7;
      dernierT = t;
      if (dt > 33) dt = 33;    // réveil d'onglet, changement d'écran
      if (dt < 0) dt = 16.7;

      avancer(dt);
      dessiner();

      // Mesure de charge. On regarde le temps réellement écoulé entre deux
      // images, pas le temps de calcul : c'est la fréquence tenue qui compte.
      cumul += dt;
      images++;
      if (images >= FENETRE_MESURE) {
        if (cumul / images > SEUIL_DEGRADATION
            && niveauDegradation < PALIERS.length - 1) {
          niveauDegradation++;
          fraction = PALIERS[niveauDegradation];
        }
        cumul = 0;
        images = 0;
      }

      frame = global.requestAnimationFrame(boucle);
    }

    function relancerSiPossible() {
      if (detruit || frame || mouvementReduit) return;
      if (!ongletVisible || !dansViewport) return;
      dernierT = 0;
      cumul = 0;
      images = 0;
      frame = global.requestAnimationFrame(boucle);
    }

    function arreterBoucle() {
      if (frame) {
        global.cancelAnimationFrame(frame);
        frame = 0;
      }
      dernierT = 0;
    }

    function destroy() {
      if (detruit) return;
      detruit = true;
      arreterBoucle();
      if (global.document) {
        global.document.removeEventListener('visibilitychange', surVisibilite);
      }
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener('change', surChangementMq);
        else if (mq.removeListener) mq.removeListener(surChangementMq);
      }
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      lots = null;
      halo = null;
    }

    // -- Démarrage ----------------------------------------------------------

    resize();
    if (mouvementReduit) {
      poserEtatFinal();
      dessiner();
    } else {
      relancerSiPossible();
    }

    return {
      setState: setState,
      resize: resize,
      destroy: destroy,
      mode: mode
    };
  }

  // Pas de build sur ce projet : on expose en global. Pour un usage en module
  // ESM, remplacer cette ligne par `export { createDust };`.
  global.createDust = createDust;

})(typeof window !== 'undefined' ? window : this);
