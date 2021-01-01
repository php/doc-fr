$Revision: 331053 $

But : Ce fichier a pour but de définir les règles à respecter lors de vos traductions/mises à jour de fichiers.

Structure :

I    - Indentation
II   - Coding Standards
III  - Revision tracking
IV   - Commentaires dans les fichiers
V    - Commits et messages de log
VI   - Commandes utiles
VII  - Traductions de quelques mots
VIII - Orthographe et relectures

I - Indentation :

Le pas à respecter pour l'indentation est de 1. Exemple :
<note>
_<para>
__<example>
___<title>
___</title>
__</example>
_</para>
</note>

Le caractère d'indentation est une espace (aucune tabulation n'est admise dans les fichiers .xml)



II - Coding standards :

Le groupe de documentation PHP a choisi d'utiliser les coding standards de PEAR, vous les trouverez ici :
  http://pear.php.net/manual/fr/standards.php
Merci donc de les lire et de les appliquer.

Le code source PHP commence à la colonne zéro de l'exemple :

<?php
ca_commence_ici(); // bien
  ca_commence_ici(); // pas bien
?>

On notera aussi qu'on privilégie les echo à print (echo sans parenthèses).
Tout le code est censé être compatible avec error_reporting(E_ALL) et register_globals = Off.



III - Revision tracking.

Vers la fin février, la documentation française a adopté la méthode de Revision Tracking par balises :
   http://fr.php.net/manual/howto/translation-revtrack.html (9.4.2).

Dans un premier temps, nous avons rajouté la balise suivante dans tous les fichiers :
<!-- EN-Revision: 1.1 Maintainer: nobody Status: partial -->

Pourquoi avons-nous fait cela ?

L'adoption de cette méthode permet de mieux suivre les différences entre la
documentation anglaise et française.
Vous pourrez le constater en utilisant le script revcheck.php (dans
phpdoc-fr/scripts/) ou en visitant http://doc.php.net/php/fr/revcheck.php



IV - Commentaires dans les fichiers

Les seuls commentaires qui doivent figurer en début de fichier sont :

<!-- $Revision: 331053 $ -->
<!-- EN-Revision: 1.5 Maintainer: XXXX Status: YYYYY -->
<!-- Reviewed: ZZZ -->

Le dernier tag permet de spécifier si le document a été relu ou non. ZZZ vaut 'yes' s'il l'a été, 'no' sinon.

Et bien sûr, les commentaires des traducteurs (<!-- ne touchez pas ce fichier svp, utilisateur -->)



V - Commits et messages de log

Essayez (dans la mesure du possible) de commiter répertoire par répertoire.
Dans fr/reference/ commitez extension par extension.

En ce qui concerne les messages de logs pour les commits, on essayera de :
 - faire des messages en anglais (au cas où un non-francophone a besoin de comprendre les modifications)
 - faire des messages explicites (ne pas mettre "typo" quand on rajoute du texte...)

Bon, évidemment, on n'est pas chez les scouts, les écarts seront tolérés.



VI - Commandes utiles

(On suppose par la suite qu'on est d'office dans le répertoire racine du module de la doc française)
Voici quelques commandes utiles lors de vos traductions/commits :

1 - Commiter de grosses modifications dans fr/reference/
si vous avez modifié plusieurs fichiers dans plusieurs extensions :

cd reference
for i in $(ls); do cvs ci -m "message de log" $i; done

2 - Tester syntaxiquement tous les exemples sous fr/reference :

Ici, on va lancer une analyse syntaxique de tous les fichiers dans
les répertoires "functions" de fr/reference/. La technique est simple,
on configure short_open_tag à Off en ligne de commande pour que PHP n'analyse
que les exemples commençant par <?php, puis on lance la moulinette :

cd reference
for i in $(find -name *.xml); do php -d "short_open_tag=Off" -l $i; done > syntax.txt
cat syntax.txt | grep -B1 Errors



VII  - Traductions de quelques mots

Voir le fichier TRADUCTIONS.txt



VIII - Orthographe et relectures

Afin d'avoir un manuel en bon français, nous avons des relecteurs.
Les relecteurs ne font presque jamais de traductions (ils ne changent jamais le tag EN-Revision)
Ils doivent par contre changer (ou ajouter) le tag <!-- Reviewed: no/yes -->
Quand un relecteur valide un document, il doit passer la valeur de Reviewed à "yes".
Quand un traducteur met à jour un fichier, il doit passer la valeur de Reviewed à "no".
Nous mettrons bientôt à disposition une interface graphique permettant aux relecteurs de voir les fichiers à valider.
