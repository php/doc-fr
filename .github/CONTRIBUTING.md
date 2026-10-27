# Documentation française de PHP

Ce document a pour but d'expliquer comment participer à la rédaction de la
documentation française de PHP.

Pour **lire** la documentation et non la rédiger, allez sur
https://www.php.net/manual/fr/

> [!NOTE]
> Si une erreur est présente dans la documentation, vérifiez qu'elle ne se
> trouve pas aussi dans la documentation anglaise. Si oui, corrigez celle-ci
> d'abord : la traduction française suivra.

## Démarrage rapide

1. Faites un fork de `php/doc-fr` et clonez-le (voir [Installation](#1-installation)).
2. Créez une branche à partir de `master`.
3. Modifiez le fichier XML en respectant le [coding style](#4-coding-style). Pour
   une mise à jour, changez aussi la clé de hachage `EN-Revision`
   ([Revision Tracking](#3-revision-tracking)).
4. [Vérifiez vos changements](#7-vérifier-ses-changements-avant-de-pousser).
5. Poussez la branche sur votre fork et ouvrez une pull request contre `php/doc-fr`
   ([Workflow git](#6-workflow-git)), avec des messages de commit en anglais.

## 1: Installation

Pour construire la documentation il faut posséder à minima les trois repository suivant :
 - ``php/doc-base`` : qui possède les outils pour construire la documentation
   trouvée sur ``github.com`` : https://github.com/php/doc-base
 - ``php/doc-en`` : la version anglaise de la documentation sur laquelle se rabattre quand
   la version française est inexistante pour une page : https://github.com/php/doc-en
 - ``php/doc-fr`` : la version française de la documentation : https://github.com/php/doc-fr

> Note : vous pouvez cloner à partir du miroir GitHub, mais le dossier où se situe la
> documentation anglaise *doit* être nommé ``en`` et celui de la documentation française
> *doit* être nommé ``fr`` afin de pouvoir construire la documentation.

## 2: Construire la documentation

Il est important de savoir construire la documentation pour s'assurer que les changements effectués
ne cassent pas le build, ce qui empêchera la publication de la dernière version de celle-ci sur php.net.

En imaginant qu'on se situe dans le dossier ``fr`` dans la structure de dossier suivante :

```
|
|- base
|- en
|- fr
 |- ...
```

Il suffit d'exécuter ``php ../base/configure.php --with-lang=fr``

Si tout se passe bien vous serez accueillis avec le message suivant :

```
All good. Saving .manual.xml... done.
All you have to do now is run 'phd -d /home/user/Dev/php-docs/base/.manual.xml'
If the script hangs here, you can abort with ^C.
         _ _..._ __
        \)`    (` /
         /      `\
        |  d  b   |
        =\  Y    =/--..-="````"-.
          '.=__.-'               `\
             o/                 /\ \
              |                 | \ \   / )
               \    .--""`\    <   \ '-' /
              //   |      ||    \   '---'
         jgs ((,,_/      ((,,___/

 (Run `nice php configure.php` next time!)
```

Sinon, vous avez une erreur XML Docbook qu'il faut corriger avant.


## 3: Revision Tracking

Pour s'assurer que la traduction française soit à jour avec la documentation anglaise,
un système de `rev-check` existe.

Ceci ce manifeste par le commentaire suivant en haut de chaque fichier XML :
```xml
<!-- EN-Revision: git-hash Maintainer: XXXX Status: YYYYY -->
```

Lors de la mise à jour d'un fichier pour répliquer les changements effectués sur la version
anglaise, il est primordial de mettre à jour la clé de hachage `git-hash` du commit anglais.

Le statut du rev-check peut actuellement être consulté sur le site des outils de la documentation
de PHP : http://doc.php.net/revcheck.php?p=filesummary&lang=fr

Pour voir les fichiers qui doivent être mise à jour, allez sur le lien "Outdated Files" qui
amène à : http://doc.php.net/revcheck.php?p=files&lang=fr

### Issues `[Sync EN]` automatiques

Chaque jour, un workflow ouvre une issue `[Sync EN]` (label `sync-en`) pour chaque
commit de `php/doc-en` qui touche un fichier traduit ou ajoute un fichier XML. Le corps
liste les fichiers FR à mettre à jour et les nouveaux fichiers EN. Les commits dont le
message contient `[skip-revcheck]` sont ignorés.

Pour en traiter une : reportez les changements, mettez à jour `EN-Revision`, puis
écrivez `Fixes: #numéro` dans la pull request.

## 4: Coding style
### Fichier XML

Le pas à respecter pour l'indentation est de 1.
Le caractère d'indentation est l'espace ` ` (aucune tabulation n'est admise dans les fichiers `.xml`).
Exemple :
```xml
<note>
_<para>
__<example>
___<title>
___</title>
__</example>
_</para>
</note>
```

De plus la soft-limit du nombre de caractères par ligne est de 80.

### Exemple PHP

Les exemples suivent le guide officiel de la documentation PHP, commun à toutes les
langues : https://doc.php.net/guide/cs-for-examples.md

## 5: Traduction, relectures et orthographe

Afin d'avoir un manuel en bon français, la traduction de certains termes techniques
se trouve dans le document ``TRADUCTIONS.txt``.

Il est aussi nécessaire de relire la traduction pour s'assurer que le texte
traduit ait du sens et soit en accord avec le texte anglais.

### Marqueurs périmés

Deux commentaires se rencontrent encore en tête des fichiers. Ils ne sont plus
utilisés, aucun outil ne les lit, et il ne faut plus en ajouter :

- ``<!-- Reviewed: no/yes -->``, qui suivait l'état de relecture d'un fichier ;
- ``<!-- CREDITS: ... -->``, qui listait les traducteurs successifs. L'historique
  git donne cette information de façon fiable.

Les retirer des fichiers que l'on modifie par ailleurs, sans en faire une
modification à part entière.

### Traduire une nouvelle page

La traduction d'une nouvelle page anglaise en français est relativement simple :
1. Copiez le fichier à traduire
2. Collez-le au même emplacement, mais dans votre dossier ``fr``
3. Ajoutez le commentaire de revision tracking avec la clé de hachage `git-hash` de la
version du fichier anglais que vous venez de copier

La clé de hachage `git-hash` permet de s'assurer que le fichier soit bien à jour après
que la traduction est faite.

Il est à noter que le fichier doit être *entièrement* (modulo les exemples) traduit
avant d'être ajouté au repo git officiel.

## 6: Workflow git

Essayez (dans la mesure du possible) de commiter répertoire par répertoire,
ou dans ``reference/`` extension par extension.

Pour les messages de logs des commits, on essayera de :
 - faire des messages en anglais (au cas où un non-francophone a besoin de comprendre les modifications)
 - faire des messages explicites (ne pas mettre "typo" quand on rajoute du texte...)

### Utilisateur lambda

Pour proposer une modification vous devez passer par une pull request contre le miroir GitHub
`doc-fr`, pour cela faire un fork du repository `doc-fr` de GitHub, créer une nouvelle branche
(feature branch), faire vos modifications, committer, puis `git push` la branche sur votre fork
afin d'ouvrir une pull request.

Si des remarques sont faites sur votre pull request, suivez-les.

En cas de conflit avec votre branche et la branche ``master``, il est préférable de faire
un ``git rebase`` de votre branche sur ``master`` au lieu de ``git merge`` la branche ``master``
dans la vôtre.

### Utilisateur ayant un accès VCS (c.à.d un compte @php.net, avec du karma sur doc-fr)

Il n'est pas nécessaire de passer par une pull request. Vous pouvez commit et
push directement sur la branche ``master`` du repo doc-fr sur https://github.com.

Évitez les "merge commit" et préférez un ``git rebase`` suivi d'un merge fast-forward.

Ne créez et pushez pas des branches différentes de ``master`` sur le repo git officiel.

## 7: Vérifier ses changements avant de pousser

Quatre vérifications automatiques tournent sur chaque pull request. Elles se
rejouent en local, ce qui évite un aller-retour avec la CI.

Deux d'entre elles comparent les fichiers à la documentation anglaise, mais
pas avec la même disposition. La vérification de structure se lance depuis le
répertoire qui contient `fr`, `en` et `doc-base` côte à côte, comme la
construction de la documentation. La vérification de l'`EN-Revision`, elle,
attend la documentation anglaise dans un dossier `en` **à la racine du dépôt**
`fr` (`.gitignore` le prévoit) ; si elle est ailleurs, un lien symbolique
suffit :

```shell
ln -s ../en en
```

### Style

Les termes proscrits sont listés dans `TRADUCTIONS.txt` (lignes `INTERDIT`), qui fait foi.

### Structure : l'ossature des blocs

Chaque fichier est comparé à la version anglaise **à la révision qu'il déclare
mirrorer** (`EN-Revision`), donc un fichier en retard ne produit pas de faux
positif.

Le script est celui de `doc-base`, partagé par toutes les traductions. Il se
lance depuis le répertoire qui contient `fr`, `en` et `doc-base` côte à côte,
comme la construction de la documentation :

```shell
git -C fr diff --name-only master...HEAD -- '*.xml' \
  | php doc-base/scripts/translation/check-structure.php --lang=fr
```

### EN-Revision : la clé de hachage

La clé de hachage déclarée doit être celle du **dernier** commit anglais du
fichier, pas simplement celle du commit que la traduction reprend :

```shell
git -C en log -1 --format=%H -- chemin/du/fichier.xml
```

### Espaces

```shell
git log --check master..HEAD
```

Aucun espace en fin de ligne, aucune tabulation, pas de ligne vide surnuméraire.

## 8: Commandes utiles

### Tester syntaxiquement tous les exemples dans le dossier `reference` :

Ici, on va lancer une analyse syntaxique de tous les fichiers dans
les répertoires "functions" de fr/reference/. La technique est simple,
on configure short_open_tag à Off en ligne de commande pour que PHP n'analyse
que les exemples commençants par `<?php`, puis on lance la moulinette :

```shell
cd reference
for i in $(find -name *.xml); do php -d "short_open_tag=Off" -l $i; done > syntax.txt
cat syntax.txt | grep -B1 Errors
```
