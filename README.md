# Constructeur de scénarios (façon Jeedom) pour Home Assistant

> Tu viens de migrer de **Jeedom** vers **Home Assistant** et le constructeur de
> scénarios te manque ? Ce plugin te le rend — les mêmes blocs, les mêmes couleurs,
> la même façon de faire — **mais il génère de vraies automatisations Home Assistant**.

Un panneau **« Scénarios »** s'ajoute dans la barre latérale. Tu construis tes scénarios
avec des blocs **SI / ALORS / SINON**, **ACTION**, **DANS**, **POUR**, **VARIABLE**,
en choisissant **Pièce → Équipement → Commande** comme sur Jeedom. Chaque scénario est
**compilé en automatisation Home Assistant native**, visible dans *Réglages →
Automatisations* et **éditable en YAML**.

## Ce que ça fait

- 🧩 **Blocs façon Jeedom** : SI/ALORS/SINON, ACTION, DANS, POUR (boucle), VARIABLE, YAML brut.
- 🏠 **Sélection par pièce** : Pièce → Équipement → Commande, alimentée par tes zones,
  appareils et services Home Assistant.
- 🧮 **Éditeur de conditions complet** : expression libre avec **opérateurs**
  (`== != > < >= <= && || !`) et une palette de **fonctions** (`time`, `value`,
  `trigger`, `average`, `tendance`, `variable`, `stateDuration`, `sun`…).
- 🔁 **Ouvre et modifie l'existant** : importe n'importe quelle automatisation HA
  (ou colle son YAML) → elle devient des blocs éditables. Ce qui n'a pas d'équivalent
  bloc (`wait_for_trigger`, `parallel`, `device`…) est conservé **verbatim** dans un
  bloc **« YAML brut »** et réinjecté à l'identique à l'enregistrement.
- 💾 **100 % natif** : aucune dépendance à l'exécution. Le plugin ne fait qu'**écrire**
  des automatisations HA standard ; tes automatisations YAML existantes continuent de
  fonctionner, rien n'est écrasé.

## Installation (via HACS)

1. HACS → menu ⋮ → **Dépôts personnalisés** → ajoute l'URL de ce dépôt, catégorie
   **Intégration**.
2. Installe **« Constructeur de scénarios (façon Jeedom) »**, puis **redémarre** Home Assistant.
3. **Réglages → Appareils et services → Ajouter une intégration →** cherche
   *Constructeur de scénarios*. (Aucun réglage à saisir.)
4. L'entrée **« Scénarios »** apparaît dans la barre latérale. 🎉

## Notes pour les migrants Jeedom

- Les **fonctions** sont proposées comme sur Jeedom ; les plus courantes sont traduites
  en template Jinja à la compilation. Une fonction exotique peut demander un petit
  ajustement du template généré (toujours éditable ensuite).
- Le bloc **« Code »** de Jeedom correspond ici à une **condition template** (`{{ … }}`)
  et au bloc **YAML brut** pour les actions avancées.

## Statut

Projet communautaire, early-access (`0.1.0`). Retours et PR bienvenus — l'objectif est
d'aider la communauté Jeedom qui migre vers Home Assistant.

## Licence

MIT.
