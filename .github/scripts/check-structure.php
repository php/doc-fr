<?php
/**
 * check-structure.php — Compare l'ossature (les éléments « bloc ») d'un fichier
 * de traduction à celle du fichier doc-en correspondant, pour détecter une
 * dérive de structure (un <note> en trop, une liste devenue paragraphe, etc.).
 *
 * Ce qu'on NE compare PAS : la prose inline (le texte d'un <para>, d'un <title>…),
 * qui diverge légitimement d'une langue à l'autre. On s'arrête donc au bord des
 * conteneurs de texte.
 *
 * Point clé : on compare au fichier doc-en *à la révision que la traduction dit
 * mirrorer* (commentaire « EN-Revision: <hash> »), récupérée via `git show`.
 * Conséquence : un fichier en retard de synchro ne déclenche pas de faux
 * positif, puisqu'on le compare à l'anglais qu'il a réellement traduit.
 *
 * Layout attendu : le dépôt de traduction est à la racine (répertoire courant),
 * doc-en est dans le sous-répertoire `en/`.
 *
 * Usage (depuis la CI) :
 *   git diff --name-only … | php .github/scripts/check-structure.php
 *     STDIN  un chemin .xml par ligne (relatif à la racine du dépôt)
 * La sortie est en annotations GitHub Actions (::error) ; le script sort en code
 * non nul si au moins une divergence est trouvée.
 */

// --- Vocabulaire DocBook --------------------------------------------------

// Attributs qui font partie de la « structure » : on les inclut dans la
// signature d'un élément (un role= ou un xml:id qui change = dérive).
const STRUCTURAL_ATTRIBUTES = ['role', 'choice', 'class', 'xml:id', 'rep'];

// Éléments dont le contenu est du texte (inline). On enregistre l'élément
// lui-même mais on NE descend PAS dedans : sa prose est l'affaire du traducteur.
const TEXT_CONTAINERS = [
    'para', 'simpara', 'term', 'title', 'titleabbrev', 'refpurpose', 'refname',
    'member', 'entry', 'literallayout', 'programlisting', 'screen', 'seg',
    'segtitle', 'synopsis',
];

// --- Construction du squelette --------------------------------------------

/**
 * Remplace toute entité nommée (&reftitle.intro;, &warn.foo;, …) par un simple
 * texte « E ». Deux raisons :
 *   1. sans ça, le DOM refuse de parser (entités non déclarées hors DTD) ;
 *   2. c'est symétrique — EN et traduction ont les mêmes entités aux mêmes
 *      endroits, donc les remplacer pareil des deux côtés ne crée aucune
 *      différence artificielle.
 * On laisse intactes les entités prédéfinies XML (&amp; &lt; …) et numériques.
 */
function entitiesToPlaceholder(string $xml): string
{
    $namedEntity = '/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)[\w.:-]+;/';
    return preg_replace($namedEntity, 'E', $xml);
}

/**
 * Signature d'un élément : son nom suivi de ses attributs structurels.
 * Ex. : <refsect1 role="description"> donne "refsect1(role=description)".
 */
function elementSignature(DOMElement $element): string
{
    $attributes = [];
    foreach (STRUCTURAL_ATTRIBUTES as $name) {
        $value = $element->getAttribute($name);
        if ($value !== '') {
            $attributes[] = "$name=$value";
        }
    }

    if ($attributes === []) {
        return $element->nodeName;
    }
    return $element->nodeName . '(' . implode(',', $attributes) . ')';
}

/**
 * Parcourt l'arbre en profondeur et ajoute la signature de chaque élément
 * (préfixée par sa profondeur, en espaces) dans $skeleton. On s'arrête au bord
 * des conteneurs de texte : on enregistre le conteneur mais pas son contenu.
 */
function collectSkeleton(DOMElement $element, string $depth, array &$skeleton): void
{
    // Les crédits traducteurs sont propres à la traduction (absents de doc-en) :
    // on les ignore pour ne pas signaler une fausse dérive.
    $isTranslatorCredits = $element->nodeName === 'authorgroup'
        && str_starts_with($element->getAttribute('xml:id'), 'translators');
    if ($isTranslatorCredits) {
        return;
    }

    $skeleton[] = $depth . elementSignature($element);

    // Conteneur de texte : on n'entre pas dedans (sa prose peut diverger).
    if (in_array($element->nodeName, TEXT_CONTAINERS, true)) {
        return;
    }

    foreach ($element->childNodes as $child) {
        if ($child->nodeType === XML_ELEMENT_NODE) {
            collectSkeleton($child, $depth . ' ', $skeleton);
        }
    }
}

/**
 * Squelette d'un document XML donné en chaîne : la liste à plat des signatures
 * de ses éléments bloc. Renvoie ['<<INVALIDE>>'] si le XML est illisible.
 */
function buildSkeleton(string $xml): array
{
    $document = new DOMDocument();
    libxml_use_internal_errors(true); // on gère nous-mêmes les erreurs de parse
    $parsed = $document->loadXML(entitiesToPlaceholder($xml), LIBXML_NONET);
    libxml_clear_errors();

    if (!$parsed || !$document->documentElement) {
        return ['<<INVALIDE>>'];
    }

    $skeleton = [];
    collectSkeleton($document->documentElement, '', $skeleton);
    return $skeleton;
}

// --- Accès à doc-en et comparaison ----------------------------------------

/**
 * Contenu d'un fichier doc-en à une révision donnée (`git show <hash>:<chemin>`),
 * ou null si le fichier n'existait pas à cette révision.
 */
function docEnFileAtRevision(string $enRepo, string $hash, string $relativePath): ?string
{
    $command = sprintf(
        'git -C %s show %s:%s 2>/dev/null',
        escapeshellarg($enRepo),
        escapeshellarg($hash),
        escapeshellarg($relativePath)
    );
    $content = shell_exec($command);
    return ($content === null || $content === '') ? null : $content;
}

/**
 * Première position où deux squelettes diffèrent, sous la forme
 * [ligneEN, ligneTraduction], ou null s'ils sont identiques. Une ligne absente
 * (squelette plus court) est représentée par « (rien) ».
 */
function firstDivergence(array $enSkeleton, array $translationSkeleton): ?array
{
    $length = max(count($enSkeleton), count($translationSkeleton));
    for ($i = 0; $i < $length; $i++) {
        $enLine = $enSkeleton[$i] ?? '';
        $translationLine = $translationSkeleton[$i] ?? '';
        if ($enLine !== $translationLine) {
            return [
                trim($enSkeleton[$i] ?? '(rien)'),
                trim($translationSkeleton[$i] ?? '(rien)'),
            ];
        }
    }
    return null;
}

// --- Entrée / sortie ------------------------------------------------------

/** Lit les chemins (.xml) fournis sur l'entrée standard, un par ligne. */
function readPathsFromStdin(): array
{
    $paths = [];
    foreach (explode("\n", stream_get_contents(STDIN)) as $line) {
        $path = trim($line);
        if ($path !== '' && str_ends_with($path, '.xml')) {
            $paths[] = $path;
        }
    }
    return $paths;
}

/**
 * Émet chaque divergence en annotation GitHub Actions (::error). Le chemin est
 * relatif à la racine du dépôt de traduction, pour que l'annotation tombe sur
 * le bon fichier dans la PR.
 */
function printAnnotations(array $violations): void
{
    foreach ($violations as [$file, $enLine, $translationLine, $enCount, $translationCount]) {
        $message = sprintf(
            'structure diffère de doc-en (EN: %s | trad: %s) [blocs EN=%d trad=%d]',
            $enLine, $translationLine, $enCount, $translationCount
        );
        printf("::error file=%s::%s\n", $file, $message);
    }
}

// --- Programme principal --------------------------------------------------
//
// Layout attendu : le dépôt de traduction est à la racine (répertoire courant),
// doc-en est dans le sous-répertoire `en/`.

$workspace = getcwd();
$enRepo = "$workspace/en";

$violations = [];   // chaque entrée : [chemin, ligneEN, ligneTrad, nbBlocsEN, nbBlocsTrad]
$checkedCount = 0;

foreach (readPathsFromStdin() as $relativePath) {
    $translationPath = "$workspace/$relativePath";
    if (!is_file($translationPath)) {
        continue;
    }
    $translationXml = file_get_contents($translationPath);

    // De quelle révision EN cette traduction se réclame-t-elle ?
    if (!preg_match('/EN-Revision:\s*([0-9a-f]{40})/', $translationXml, $match)) {
        continue; // pas de hash : on ne sait pas à quoi comparer
    }
    $enRevision = $match[1];

    $enXml = docEnFileAtRevision($enRepo, $enRevision, $relativePath);
    if ($enXml === null) {
        continue; // fichier absent côté EN à ce hash (nouveau, renommé…)
    }

    $checkedCount++;
    $enSkeleton = buildSkeleton($enXml);
    $translationSkeleton = buildSkeleton($translationXml);

    $divergence = firstDivergence($enSkeleton, $translationSkeleton);
    if ($divergence === null) {
        continue; // structures identiques : rien à signaler
    }

    [$enLine, $translationLine] = $divergence;
    $violations[] = [
        $relativePath, $enLine, $translationLine,
        count($enSkeleton), count($translationSkeleton),
    ];
}

printAnnotations($violations);
fprintf(STDERR, "vérifiés=%d divergents=%d\n", $checkedCount, count($violations));

exit($violations ? 1 : 0);
