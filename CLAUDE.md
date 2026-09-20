# Règle typographique, stricte, sans exception

**Le tiret cadratin `—` est interdit.** Partout : contenu des pages, commentaires
de code, noms de fichiers, documentation, messages de commit, et les réponses
adressées à Mathieu.

Le remplacer par une **virgule** ou un **point**, selon ce que la phrase demande :

| Cas | Interdit | À écrire |
|---|---|---|
| Apposition, incise | `un blanc cassé — presque pur` | `un blanc cassé, presque pur` |
| Deux idées distinctes | `Bouton plein — action primaire` | `Bouton plein. Action primaire` |
| Titre et complément | `Audience Planning — Australie.GAD` | `Audience Planning, Australie.GAD` |
| Plage de dates | `Sept. 2024 — Juil. 2025` | `Sept. 2024 à Juil. 2025` |

Le tiret demi-cadratin `–` reste toléré **uniquement** entre deux bornes
numériques (`2020 – 2025`). Partout ailleurs, mêmes règles que ci-dessus.

# Tests dans le navigateur

Pour vérifier une page ou une interaction, utiliser le serveur MCP `playwright`
plutôt qu'une capture d'écran PNG. Préférer `browser_snapshot` (arbre
d'accessibilité) et `browser_evaluate` pour lire l'état réel du DOM, le texte
et les styles calculés. Ne prendre une capture (`browser_take_screenshot`)
qu'en dernier recours, pour un rendu visuel qui ne peut pas s'inspecter
autrement (une animation, un dégradé, une mise en page complexe).
