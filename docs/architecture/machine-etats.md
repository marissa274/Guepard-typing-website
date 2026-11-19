# Machine à états du salon

Les transitions courantes et les règles de sécurité sont détaillées dans [l’architecture](../ARCHITECTURE.md). La fermeture supprime le salon ; `closed` est un état conceptuel. Correspondance avec l’énoncé : EN_ATTENTE = `waiting`, DÉCOMPTE = `countdown`, EN_COURSE = `running`, RÉSULTATS = `finished`, FERMÉE = `closed` (ligne supprimée). `reset` et `rematch` exigent la phase `finished` ; il n’existe pas de retour direct de `countdown` ou `running` vers `waiting`. Un salon de plus de 24 h est aussi considéré fermé.

```mermaid
stateDiagram-v2
    [*] --> waiting: création par un compte
    waiting --> countdown: start (hôte, 2 joueurs dont 1 humain)
    countdown --> running: heure serveur de départ atteinte (3 s)
    running --> finished: tous terminés ou abandonnés
    running --> finished: échéance atteinte
    finished --> waiting: reset (hôte)
    finished --> countdown: rematch (hôte)
    waiting --> closed: close, hôte parti sans successeur, 24 h
    countdown --> closed: close, hôte parti sans successeur, 24 h
    running --> closed: close, hôte parti sans successeur, 24 h
    finished --> closed: close, hôte parti sans successeur, 24 h
    closed --> [*]
```

Une nouvelle entrée est refusée pendant le décompte et la course. Un membre existant peut se reconnecter ; après trente secondes sans présence réseau, le serveur enregistre son abandon. L’absence de frappe seule ne constitue pas une déconnexion. Le départ de l’hôte transfère son rôle au plus ancien humain authentifié admissible ; la fermeture est une action distincte.

Les bots suivent une grille temporelle serveur déterministe. Les bonus, la limite de durée et les heures individuelles de fin ou d’abandon sont calculés côté serveur. Un seul concurrent actif peut continuer jusqu’à son arrivée, son abandon ou l’échéance.
