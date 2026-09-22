# Médias des projets

Les visuels référencés par `content/projets.json` et `content/page-projet.json`
se déposent ici. Le chemin écrit dans `media.src` est relatif à `src/`, donc
un fichier posé à `src/assets/media/scan-avis.png` s'écrit :

```json
"media": {
  "type": "image",
  "src": "assets/media/scan-avis.png",
  "w": 1600,
  "h": 1000,
  "alt": "Description du visuel"
}
```

Le build vérifie que le fichier existe et que `w` et `h` correspondent aux
dimensions réelles (PNG, JPEG et WebP sont lus, les autres formats passent
avec un avertissement).

Pour une vidéo, acceptée seulement dans `content/page-projet.json`, ajouter un
`poster` déposé ici lui aussi. Vidéo et poster réunis : 3 Mo déclenchent un
avertissement, 5 Mo interrompent le build.

Ce fichier existe pour que le dossier soit versionné même vide.
