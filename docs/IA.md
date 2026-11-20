# Utilisation des agents IA

## Agents, outils et fichiers d'instructions

Lecteur visé : enseignant.

- **Claude Code** (extension VS Code) a servi d'orchestrateur. Il lisait le cahier des charges et les guides Next.js locaux (`node_modules/next/dist/docs/`), découpait le travail, déléguait à des sous-agents, intégrait leurs commits et relançait les tests.
- **Sous-agents spécialisés**, définis dans [`.claude/agents/`](../.claude/agents/) : `architecte`, `developpeur`, `product-manager`, `ux-designer`, `redacteur-doc` et `reviewer`. Les audits et les revues étaient en lecture seule ; seuls `developpeur` et `redacteur-doc` modifiaient le code ou la documentation. Les tâches indépendantes, comme le test de charge ou les corrections d'accessibilité, tournaient dans des copies de travail Git séparées.
- **Revue en trois cycles** : logique et sécurité, puis vérification des correctifs et cas limites, puis conventions, lisibilité et accessibilité. Chaque problème signalé était vérifié dans le code avant d'être confirmé, puis corrigé avec un test qui échoue sans le correctif.
- **Codex** a servi de second avis indépendant : revue du verrouillage du magasin de salons, recherche de secrets dans l'historique Git et rédaction de la démarche créative à partir de mes notes.
- **ChatGPT** a aidé à chercher des noms et à générer les propositions de logo. C'est décrit honnêtement dans [DEMARCHE-CREATIVE.md](DEMARCHE-CREATIVE.md) ; DES-01 et DES-02 sont donc déclarés « partiel ».
- **Fichiers d'instructions versionnés** : [`AGENTS.md`](../AGENTS.md), importé par [`CLAUDE.md`](../CLAUDE.md), et les définitions d'agents de `.claude/agents/`. Le bloc Next.js d'`AGENTS.md` est régénéré par `next dev`.

Validation : Jest et React Testing Library, TypeScript strict, compilation Next.js, Playwright (parcours, captures et styles calculés), un test de charge à 30 joueurs et la CI GitHub Actions.

<!-- À RELIRE PAR L'AUTRICE : vérifier que ces trois situations correspondent à ce que vous avez constaté et pouvez expliquer à l'oral. -->
## Trois erreurs détectées et corrigées

1. **Une optimisation qui perdait des résultats.** Pour tenir 30 joueurs, l'agent a remplacé le verrou global de la base par un verrou par salle et a regroupé les écritures simultanées d'une même salle dans une seule transaction. Le gain était réel : la latence médiane de progression est passée d'environ 1,7 s à 0,14 s. Mais les résultats n'étaient enregistrés qu'à partir de l'état final du lot. Si une course se terminait et qu'une revanche arrivait dans le même lot, les résultats disparaissaient de l'historique. **Détection** : la revue indépendante par Codex. **Vérification** : un test sur une vraie base PostgreSQL, qui donnait 0 résultat enregistré au lieu de 1. **Correction** : chaque état « terminé » atteint pendant le lot est conservé, puis enregistré (sans doublon grâce à la contrainte d'unicité).

2. **Une conclusion affirmée sans preuve.** En production, la création de salle répondait par une erreur 500. L'agent a d'abord affirmé que `AUTH_SECRET` était configuré, parce que le site démarrait. C'était faux : le serveur démarrait sans ce secret et n'échouait qu'à la première requête qui en avait besoin. **Détection** : en ajoutant une journalisation côté serveur des erreurs inattendues, puis en lisant les journaux Railway. **Correction** : la variable a été ajoutée. Ensuite, le serveur a été modifié pour **refuser de démarrer** en production sans ce secret, avec un test, afin que l'erreur apparaisse au déploiement et non chez l'utilisateur.

3. **Une consigne non respectée par les agents.** J'avais demandé qu'aucun commit ne porte de mention d'IA. Des sous-agents ont quand même ajouté une ligne `Co-Authored-By` à leurs commits. **Détection** : en relisant l'historique sur GitHub. **Correction** : l'historique a été réécrit pour retirer ces lignes, avec une poussée protégée (`--force-with-lease`) et des branches de sauvegarde locales. La consigne a ensuite été répétée explicitement dans chaque délégation, et chaque commit d'agent était vérifié avant d'être gardé.

## Réflexion

Les agents vont vite, mais une suite de tests verte sur un lot ne prouve pas que l'intégration est correcte. Ce qui a le plus servi : exiger un test qui échoue avant le correctif, vérifier moi-même chaque bug signalé avant de le faire corriger, et faire relire par un second outil. Les agents ont aussi tendance à conclure trop vite (« c'est configuré », « c'est instable »). J'ai appris à demander la preuve : un journal, une mesure, une reproduction. Enfin, le parallélisme a un coût : deux agents qui compilent dans le même dossier se gênent, et une machine chargée rend des tests instables. Les copies de travail séparées ont réglé ce problème.

Le bilan chiffré des tests et des mesures est dans [verification-fonctionnelle.md](verification-fonctionnelle.md) et [perf/course-30-joueurs.md](perf/course-30-joueurs.md). La mesure Lighthouse de l'accueil (PERF-01) est d'abord locale : performance 91 à 93, accessibilité, bonnes pratiques et SEO à 100. Elle sera refaite sur l'URL publique après le déploiement final.
