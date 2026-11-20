# Démarche créative : nom et logo

**Repère de lecture :** le nom et le logo existaient déjà en octobre 2026. Les dates des échanges retrouvés indiquent des traces conservées, pas le début de la conception. Le 20 novembre correspond à la rédaction et à la recherche documentaire, pas à la création.

Ce document retrace comment le nom **Guépard** et le logo du projet ont été trouvés. Il documente les exigences DES-01 (nom) et DES-02 (logo) de la [matrice d'exigences](EXIGENCES.md).

## 1. Point de départ : le thème

L'interface du jeu est construite sur le thème de la **jungle** : décor de forêt, panneaux en bois, animaux qui courent sur les pistes (voir la [direction artistique](design/direction-artistique.md) et le [moodboard](design/moodboard.md)).

Le nom devait donc venir de cet univers et dire en un mot ce que fait le site : une **course de frappe**, où la vitesse compte.

## 2. Le nom : Guépard

**Démarche.** J'ai cherché un animal de la jungle et de la savane connu pour courir vite. Le guépard est l'animal terrestre le plus rapide : il fait le lien direct entre le thème (les animaux) et le but du jeu (taper vite).

**Variantes envisagées.**

| Nom | Retenu ? | Raison |
|---|---|---|
| Guépard Type | Non | Plus explicite sur la frappe, mais plus long et mélange français et anglais |
| **Guépard** | **Oui** | Court, facile à retenir, en français, et l'image de vitesse suffit à évoquer la course |

Les deux noms ci-dessus sont ceux cités dans mon explication rétrospective. Aucun autre nom envisagé n’a été retrouvé dans les conversations locales consultées.

**Vérification d'originalité.**

Recherche documentaire effectuée le **20 novembre 2026**, lors de la rédaction de ce document, avec les requêtes « Guépard jeu de frappe », « Guepard typing game », « Guépard dactylographie » et `site:github.com "guepard" "typing game"`.

Aucun jeu portant exactement le nom **Guépard** n'a été identifié dans les résultats consultés. En revanche, le rapprochement entre guépard et vitesse de frappe existe déjà : [Animal Typing - Lite](https://play.google.com/store/apps/details?hl=fr&id=com.coq.animaltyping.lite), de Corentin Faucher, utilise cet animal comme récompense de rapidité et de précision. Le nom Guepard est également employé sur GitHub par [Guepard-Corp/gfs](https://github.com/Guepard-Corp/gfs), un projet de gestion de versions de bases de données, sans rapport avec la dactylographie.

Cette recherche limitée ne démontre donc pas l'unicité du nom ni du concept. Les registres de marques et la disponibilité des noms de domaine n'ont pas été vérifiés.

## 3. Le logo : un guépard endormi sur un clavier

**Idée.** J'ai d'abord dessiné un clavier. En le regardant, j'ai eu l'idée d'y installer le guépard : **le guépard dort sur le clavier**.

**Symbolique.**
- **Le guépard** représente la rapidité.
- **Le clavier** représente la frappe, le cœur du jeu.
- **Le guépard endormi** ajoute de l'humour : l'animal le plus rapide se repose, comme s'il attendait la prochaine course. Il rappelle le ton ludique et accueillant du site.

Le logo final est intégré dans l'en-tête du site ([guepard-logo.png](../public/assets/guepard-logo.png)).

**Croquis.**

Dans mon explication rétrospective, je décris un croquis de clavier, puis l’idée d’y faire dormir le guépard. La photo et la date de réalisation de ce croquis n’ont pas été retrouvées dans l’historique local consulté. Le logo final fourni le 1er octobre ne constitue pas une photo du croquis.

<!-- À COMPLÉTER : insérer la photo originale du croquis et sa date lorsqu’elles sont retrouvées. -->

**Du croquis au logo final.**

Mon idée de départ associe le clavier, qui représente la frappe, au guépard, qui représente la rapidité. Dans le brief du **1er octobre 2026**, je demande un guépard endormi sur un clavier, dans un style papier, crayon et feutre, et je joins déjà une image intitulée « Guépard endormi sur clavier(2).png ». Dans l’échange suivant, j’insiste pour utiliser le logo fourni. L’image intégrée au site est une copie du fichier fourni `guepard.png`.

ChatGPT a aidé à rédiger le brief et à explorer l’univers visuel, comme l’indique la direction artistique. Toutefois, les échanges retrouvés ne montrent pas la fabrication du logo joint ni le passage du croquis à cette image. Ils ne permettent donc pas d’établir si une IA a généré ou retouché le logo lui-même, ni de présenter celui-ci comme entièrement dessiné à la main.

<!-- À COMPLÉTER : confirmer le logiciel et le rôle exact d’une éventuelle IA dans la réalisation du logo, à partir de l’échange de création ou du fichier source. -->

## 4. Chronologie

| Date | Étape |
|---|---|
| Au plus tard le 1er octobre 2026 | Thème jungle explicitement demandé dans le brief de 19 h 46 (heure de Toronto) |
| Au plus tard le 1er octobre 2026 | Nom Guépard déjà employé dans le brief ; choix effectué auparavant |
| Date du croquis non retrouvée | Croquis évoqué rétrospectivement ; idée du guépard endormi déjà présente dans le brief du 1er octobre |
| Au plus tard le 2 octobre 2026 | Logo déjà intégré dans l’en-tête du premier commit (`24333c3`, `src/components/Chrome.jsx`) ; la date exacte de création reste à confirmer |

Les dates de conception ne sont pas déduites des dates de modification des fichiers. La présence du logo dans le premier commit atteste son intégration à cette date, sans dater le croquis ni sa réalisation.

## 5. Sources de la reconstitution

- Conversation du 1er octobre 2026, brief de 19 h 46 et demande de 20 h 02 d’utiliser le logo fourni (heure de Toronto).
- Explication personnelle du 20 novembre 2026 sur les variantes du nom et le croquis du clavier.
- Premier commit `24333c3` du 2 octobre 2026 : logo présent dans `public/assets/guepard-logo.png` et utilisé dans `src/components/Chrome.jsx`.
- Recherche documentaire du 20 novembre 2026, sources liées dans la section sur l’originalité.

## 6. Régénérer le PDF

La source HTML et le script Playwright sont archivés dans le commentaire ci-dessous pour conserver le style sans dépendre du dossier temporaire. Extraire les blocs `SOURCE_HTML` et `SCRIPT_RENDU` dans `demarche.html` et `render.mjs`, puis lancer :

```sh
CHROME_EXE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node render.mjs "$PWD/demarche.html" "$PWD/demarche.pdf" "$PWD/preview.png"
```

Les chemins des images, des polices et de Playwright correspondent à l’emplacement local du projet ; les adapter si celui-ci est déplacé.

<!-- ARCHIVE_REGENERATION
SOURCE_HTML
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Démarche créative — Guépard</title>
<style>
@font-face{font-family:'DM Sans';font-weight:400;src:url(file:///Users/marissabellebindeki/Downloads/Guepard/public/fonts/dm-sans-400-latin.woff2) format('woff2')}
@font-face{font-family:'DM Sans';font-weight:400;src:url(file:///Users/marissabellebindeki/Downloads/Guepard/public/fonts/dm-sans-400-latin-ext.woff2) format('woff2');unicode-range:U+0100-024F}
@font-face{font-family:'Nunito';font-weight:700;src:url(file:///Users/marissabellebindeki/Downloads/Guepard/public/fonts/nunito-700-latin.woff2) format('woff2')}
@font-face{font-family:'Nunito';font-weight:700;src:url(file:///Users/marissabellebindeki/Downloads/Guepard/public/fonts/nunito-700-latin-ext.woff2) format('woff2');unicode-range:U+0100-024F}
@font-face{font-family:'Kalam';font-weight:400;src:url(file:///Users/marissabellebindeki/Downloads/Guepard/public/fonts/kalam-400-latin.woff2) format('woff2')}
@font-face{font-family:'Kalam';font-weight:700;src:url(file:///Users/marissabellebindeki/Downloads/Guepard/public/fonts/kalam-700-latin.woff2) format('woff2')}
:root{--sable:#F7E7C6;--parchemin:#FFF4D8;--feuille:#5BAE4A;--foret:#2F6B3D;--canopee:#24432D;--mangue:#F28C28;--soleil:#F6C445;--encre:#3c351c;--bois:#a48c5d;--muted:#6b624c}
@page{size:Letter;margin:0}
*{box-sizing:border-box}
html,body{margin:0}
body{font-family:'DM Sans',sans-serif;font-size:10.5pt;line-height:1.55;color:var(--encre);background:var(--parchemin);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;position:relative;padding:1.3in .75in .7in;background:
 radial-gradient(circle at 12% 88%,#5bae4a14 0 18%,transparent 19%),
 radial-gradient(circle at 92% 70%,#f6c44518 0 14%,transparent 15%),
 var(--parchemin);page-break-after:always;overflow:hidden}
.page:last-child{page-break-after:auto}
.branch{position:absolute;top:-.62in;left:-.3in;width:9.1in}
.leaf-foot{position:absolute;bottom:0;left:0;right:0;height:.42in;background:var(--foret);color:var(--sable);font-family:'Nunito';font-weight:700;font-size:8.5pt;display:flex;justify-content:space-between;align-items:center;padding:0 .75in;letter-spacing:.04em}
.cover{margin-top:.42in;display:grid;grid-template-columns:1fr 2.6in;gap:.35in;align-items:center;margin-bottom:.25in}
.eyebrow{font-family:'Kalam';font-weight:700;color:var(--mangue);font-size:14pt;margin:0}
h1{font-family:'Nunito';font-weight:700;color:var(--foret);font-size:29pt;line-height:1.02;margin:.04in 0 .12in;letter-spacing:-.01em}
.lead{font-size:11.5pt;margin:0}
.logo{width:100%;border-radius:15px;border:4px solid #fff;box-shadow:0 0 0 2px var(--bois),0 10px 0 #78512d38;display:block}
.logo-cap{font-family:'Kalam';text-align:center;font-size:10pt;color:var(--muted);margin-top:.08in}
section{margin-top:.17in;break-inside:avoid}
h2{display:inline-block;font-family:'Nunito';font-weight:700;font-size:15pt;color:#fff4d8;margin:0 0 .1in;padding:.05in .2in .06in;border-radius:9px;transform:rotate(-1deg);
 background:linear-gradient(180deg,#9a6a3c,#7a4f29);box-shadow:0 4px 0 #5a3a1d;text-shadow:0 1px 0 #5a3a1d}
h2 .n{color:var(--soleil);margin-right:.08in}
p{margin:.06in 0}
strong{color:var(--canopee)}
.card{background:#fffaf0;border:1.5px solid #e2d3b0;border-radius:15px;padding:.14in .2in;margin:.1in 0}
table{width:100%;border-collapse:separate;border-spacing:0;margin:.08in 0;font-size:10pt;border:1.5px solid #e2d3b0;border-radius:12px;overflow:hidden;background:#fffaf0}
th{background:var(--foret);color:var(--sable);font-family:'Nunito';text-align:left;padding:.07in .12in}
td{padding:.07in .12in;border-top:1px solid #eadfc4;vertical-align:top}
tr.win td{background:#5bae4a1f}
.tag{display:inline-block;font-family:'Nunito';font-weight:700;font-size:8.5pt;padding:1px 8px;border-radius:30px}
.yes{background:var(--feuille);color:#fff}.no{background:#e9dcc0;color:var(--muted)}
.symbols{display:grid;grid-template-columns:repeat(3,1fr);gap:.14in;margin:.1in 0}
.sym{background:#fffaf0;border:1.5px solid #e2d3b0;border-radius:15px;padding:.12in .14in;text-align:center}
.sym b{display:block;font-family:'Nunito';color:var(--foret);font-size:12pt;margin-bottom:.03in}
.sym .ico{font-size:20pt;line-height:1}
.todo{border:2px dashed var(--mangue);background:#f28c2812;border-radius:12px;padding:.1in .16in;margin:.1in 0;font-family:'Kalam';font-size:11pt;color:#8a4d12}
.todo::before{content:'À compléter — ';font-weight:700}
.quote{font-family:'Kalam';font-size:15pt;color:var(--foret);text-align:center;margin:.12in 0;line-height:1.3}
.cover{margin-top:.32in;margin-bottom:.15in;grid-template-columns:1fr 2.35in}
h1{font-size:27pt}.lead{font-size:10.5pt}section{margin-top:.12in}
.page:nth-child(2){padding-top:1.25in;font-size:10pt;line-height:1.4}
.page:nth-child(2) .sym{padding:.08in .12in}
.page:nth-child(2) td{font-size:9pt;padding:.05in .1in}
</style>
</head>
<body>

<div class="page">
 <img class="branch" src="file:///Users/marissabellebindeki/Downloads/Guepard/public/assets/header-branch.png" alt="">
 <div class="cover">
  <div>
   <p class="eyebrow">Démarche créative</p>
   <h1>Le nom et le logo de Guépard</h1>
   <p class="lead">Nom et logo déjà présents en <strong>octobre 2026</strong>. Les dates retrouvées ne datent pas le début de la conception. Démarche liée aux exigences <strong>DES-01</strong> (nom) et <strong>DES-02</strong> (logo).</p>
  </div>
  <div>
   <img class="logo" src="file:///Users/marissabellebindeki/Downloads/Guepard/public/assets/guepard-logo.png" alt="Logo de Guépard : un guépard endormi sur un clavier">
   <div class="logo-cap">Le logo final</div>
  </div>
 </div>

 <section>
  <h2><span class="n">1</span>Le point de départ : la jungle</h2>
  <p>L'interface du jeu est construite sur le thème de la <strong>jungle</strong> : décor de forêt, panneaux en bois, animaux qui courent sur les pistes.</p>
  <p>Le nom devait donc venir de cet univers et dire en un mot ce que fait le site : une <strong>course de frappe</strong>, où la vitesse compte.</p>
 </section>

 <section>
  <h2><span class="n">2</span>Le nom : Guépard</h2>
  <p>J'ai cherché un animal connu pour courir vite. Le <strong>guépard</strong> est l'animal terrestre le plus rapide : il fait le lien direct entre le thème (les animaux) et le but du jeu (taper vite).</p>
  <table>
   <tr><th>Nom envisagé</th><th>Retenu ?</th><th>Raison</th></tr>
   <tr><td>Guépard Type</td><td><span class="tag no">Non</span></td><td>Plus explicite sur la frappe, mais plus long, et il mélange français et anglais.</td></tr>
   <tr class="win"><td><strong>Guépard</strong></td><td><span class="tag yes">Oui</span></td><td>Court, facile à retenir, en français ; l'image de vitesse suffit à évoquer la course.</td></tr>
  </table>
  <p style="font-size:9pt">Deux noms retrouvés dans mon explication rétrospective ; les recherches antérieures ne sont pas encore reconstituées.</p>
  <p><strong>Vérification d'originalité.</strong></p>
  <div class="card" style="font-size:9pt;line-height:1.4"><strong>Recherche du 20 novembre 2026.</strong> Requêtes : « Guépard jeu de frappe », « Guepard typing game », « Guépard dactylographie » et recherche web ciblant GitHub.<br>Aucun jeu nommé exactement <strong>Guépard</strong> identifié dans les résultats consultés. Cependant, <a href="https://play.google.com/store/apps/details?hl=fr&amp;id=com.coq.animaltyping.lite">Animal Typing - Lite</a> (Corentin Faucher) associe déjà le guépard à la vitesse et à la précision. <a href="https://github.com/Guepard-Corp/gfs">Guepard-Corp/gfs</a> utilise aussi ce nom, dans un autre domaine.<br>Recherche limitée : l'unicité du nom et du concept n'est pas démontrée ; marques et domaines non vérifiés.</div>
 </section>
 <div class="leaf-foot"><span>GUÉPARD · Courses de frappe multijoueurs</span><span>1 / 2</span></div>
</div>

<div class="page">
 <img class="branch" src="file:///Users/marissabellebindeki/Downloads/Guepard/public/assets/header-branch.png" alt="">

 <section style="margin-top:0">
  <h2><span class="n">3</span>Le logo : un guépard endormi sur un clavier</h2>
  <p>J'ai d'abord dessiné un clavier. En le regardant, j'ai eu l'idée d'y installer le guépard :</p>
  <p class="quote">« Le guépard dort sur le clavier. »</p>
  <div class="symbols">
   <div class="sym"><span class="ico">🐆</span><b>Le guépard</b>la rapidité</div>
   <div class="sym"><span class="ico">⌨️</span><b>Le clavier</b>la frappe, le cœur du jeu</div>
   <div class="sym"><span class="ico">💤</span><b>Le sommeil</b>l'humour : le plus rapide se repose en attendant la prochaine course</div>
  </div>
  <p>Ensemble, ces trois éléments résument le projet : un jeu de <strong>vitesse</strong>, autour du <strong>clavier</strong>, au ton <strong>ludique et accueillant</strong>.</p>
 </section>

 <section>
  <h2><span class="n">4</span>Le croquis</h2>
  <div class="todo">photo originale et date non retrouvées dans l’historique local. Un croquis de clavier est décrit rétrospectivement ; le logo final fourni n’est pas une photo du croquis.</div>
 </section>

 <section>
  <h2><span class="n">5</span>Du croquis au logo final</h2>
  <div class="card" style="font-size:9pt;line-height:1.4">Dans le brief du <strong>1er octobre 2026</strong>, je demande un guépard endormi sur un clavier, dans un style papier, crayon et feutre, et joins déjà le logo. J’insiste ensuite pour utiliser cette image fournie, reprise dans le site.<br><strong>ChatGPT</strong> a aidé à rédiger le brief et à explorer l’univers visuel. Les échanges retrouvés ne montrent toutefois pas la fabrication de ce logo : le passage du croquis à l’image et le rôle exact de l’IA restent à confirmer.</div>
 </section>

 <section>
  <h2><span class="n">6</span>Chronologie</h2>
  <table>
   <tr><th style="width:28%">Date</th><th>Étape</th></tr>
   <tr><td>Au plus tard le<br>1er octobre 2026</td><td>Thème jungle explicitement demandé dans le brief.</td></tr>
   <tr><td>Au plus tard le<br>1er octobre 2026</td><td>Nom Guépard déjà utilisé ; choix effectué auparavant.</td></tr>
   <tr><td>Date non retrouvée</td><td>Croquis évoqué rétrospectivement ; idée déjà présente le 1er octobre.</td></tr>
   <tr><td>Au plus tard le<br>2 octobre 2026</td><td>Logo déjà intégré dans l’en-tête du premier commit (<strong>24333c3</strong>). Date de création à confirmer.</td></tr>
  </table>
  <p style="font-size:9pt;color:var(--muted)">La présence du logo dans le premier commit atteste son intégration, sans dater le croquis ni sa réalisation.</p>
 </section>
 <div class="leaf-foot"><span>GUÉPARD · Courses de frappe multijoueurs</span><span>2 / 2</span></div>
</div>

</body>
</html>

FIN_SOURCE_HTML
SCRIPT_RENDU
import {chromium} from '/Users/marissabellebindeki/Downloads/Guepard/node_modules/@playwright/test/index.mjs';
const [html,pdf,png]=process.argv.slice(2);
const b=await chromium.launch({executablePath:process.env.CHROME_EXE,args:['--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:816,height:1056}});
await p.goto('file://'+html,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
await p.pdf({path:pdf,format:'Letter',printBackground:true,preferCSSPageSize:true});
await p.screenshot({path:png,fullPage:true});
console.log('pages:',await p.evaluate(()=>document.querySelectorAll('.page').length),'height',await p.evaluate(()=>document.body.scrollHeight));
await b.close();

FIN_SCRIPT_RENDU
ARCHIVE_REGENERATION -->
