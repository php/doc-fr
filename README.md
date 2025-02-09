# Documentation française de PHP

Ce document a pour but d'expliquer comment participer à la rédaction de la
documentation française de PHP.

Si vous voulez lire la documentation et non la rédiger aller voir le site PHP.net :
https://www.php.net/manual/fr/

De plus, si une erreur est présente dans la documentation vérifiez qu'elle ne se
trouve pas non plus dans la documentation anglaise, si oui corrigez celle-ci d'abord.
La traduction française suivra la modification faite dans la documentation anglaise.

# Sommaire

 1. Installation
 2. Construire la documentation
 3. Revision Tracking
 4. Coding Standard
 5. Traduction, relectures et orthographe
 6. Workflow git
 7. Commandes utiles


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

En s'imaginant qu'on se situe dans le dossier ``fr`` dans la structure de dossier suivante :

```
|
|- base
|- en
|- fr
 |- ...
```

Il suffit d'exécuter ``php ../base/configure.php --with-lang=fr``

Si tout ce passe bien vous serez accueillis avec le message suivant :

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
anglaise il est primordial de mettre à jour la clé de hachage `git-hash` du commit anglais.

Le statut du rev-check peut actuellement être consulté sur le site des outils de la documentation
de PHP : http://doc.php.net/revcheck.php?p=filesummary&lang=fr

Pour voir les fichiers qui doivent être mise à jour, allez sur le lien "Outdated Files" qui
amène à : http://doc.php.net/revcheck.php?p=files&lang=fr

> Normalement le rev-check se trouve sur le site https://doc.php.net, mais à cause de la
> migration récente de la documentation de SVN à git il se trouve là-bas actuellement.

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
Officiellement le groupe de documentation PHP a choisi d'utiliser les coding standards de PEAR,
vous les trouverez ici : http://pear.php.net/manual/en/standards.php

> En pratique néanmoins le coding style est un mélange entre PEAR et PSR-2/12,
> essayez donc de suivre le style dans lequel la page a été écrite, ou celui de la documentation anglaise.

Le code source PHP commence à la colonne zéro de l'exemple :
```php
<?php
ca_commence_ici(); // bien
  ca_commence_ici(); // pas bien
?>
```

On notera aussi qu'on privilégie les `echo` à `print` (`echo` sans parenthèses).
Tout le code est censé être compatible avec `error_reporting(E_ALL)`

## 5: Traduction, relectures et orthographe

Afin d'avoir un manuel en bon français, la traduction de certains termes techniques
se trouve dans le document ``TRADUCTIONS.txt``.

Il est aussi nécessaire de relire la traduction pour s'assurer que le texte
traduit ait du sens et soit en accordance avec le texte anglais.

Après la relecture d'une traduction le tag/commentaire suivant
``<!-- Reviewed: no/yes -->`` doit avoir la valeur `yes`.
Lors d'une modification d'un fichier relu ce tag doit passer à la valeur ``no``,
sauf lors de modifications mineures/changements purement XML (e.g. changement d'un élément
`<methodsynopsis>`).

### Traduire une nouvelle page

La traduction d'une nouvelle page anglaise en français est relativement simple:
1. Copier le fichier à traduire
2. Coller-le au même emplacement, mais dans votre dossier ``fr``
3. Ajouter le commentaire de revision tracking avec la clé de hachage `git-hash` de la
version du fichier anglais que vous venez de copier

La clé de hachage `git-hash` permet de s'assurer que le fichier soit bien à jour après
que la traduction soit faite.

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

Si des remarques sont faites sur votre pull request suivez-les.

En cas de conflit avec votre branche et la branche ``master``, il est préférable de faire
un ``git rebase`` de votre branche sur ``master`` au lieu de ``git merge`` la branche ``master``
dans la vôtre.

### Utilisateur ayant un accès VCS (c.à.d un compte @php.net, avec du karma sur doc-fr)

Il n'est pas nécessaire de passer par une pull request. Vous pouvez commit et
push directement sur la branche ``master`` du repo doc-fr sur https://github.com.

Éviter les "merge commit" et préférez un ``git rebase`` suivi d'un merge fast-forward.

Ne créer et pusher pas des branches différentes de ``master`` sur le repo git officiel.


## 7: Commandes utiles

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
