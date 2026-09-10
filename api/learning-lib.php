<?php

declare(strict_types=1);

const PRIVOZ_LEARNING_MAX_EVENT_BYTES = 32768; // 32 KiB
const PRIVOZ_LEARNING_MAX_GAME_BYTES = 1048576; // 1 MiB
const PRIVOZ_LEARNING_MAX_DECISIONS = 2000;

function learning_storage_dir(): string
{
    $configured = getenv('PRIVOZ_LEARNING_DIR');
    if (is_string($configured) && trim($configured) !== '') {
        return rtrim($configured, DIRECTORY_SEPARATOR);
    }

    return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . '.privoz-learning';
}

function learning_ensure_storage(): string
{
    $storageDir = learning_storage_dir();

    if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
        throw new RuntimeException('Could not create learning storage');
    }

    @chmod($storageDir, 0700);
    return $storageDir;
}

function learning_valid_game_id(string $gameId): bool
{
    return (bool)preg_match('/^GAME-[0-9]{8}-[A-Z0-9]{8,24}$/', $gameId);
}

function learning_valid_event_id(string $eventId): bool
{
    return (bool)preg_match('/^LE-[A-Za-z0-9_-]{3,160}$/', $eventId);
}

function learning_game_file_path(string $storageDir, string $gameId): string
{
    if (!learning_valid_game_id($gameId)) {
        throw new InvalidArgumentException('Invalid game ID');
    }

    return $storageDir . DIRECTORY_SEPARATOR . $gameId . '.json';
}

function learning_load_game(string $storageDir, string $gameId): ?array
{
    $filePath = learning_game_file_path($storageDir, $gameId);
    if (!is_file($filePath)) {
        return null;
    }

    $raw = @file_get_contents($filePath);
    if ($raw === false || $raw === '') {
        return null;
    }

    try {
        $game = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        return null;
    }

    return is_array($game) ? $game : null;
}

function learning_normalize_status(array $game): string
{
    $status = $game['status'] ?? '';
    if (is_string($status) && in_array($status, ['unused', 'used', 'eligible_for_deletion'], true)) {
        return $status;
    }

    $useCount = (int)($game['useCount'] ?? 0);
    return $useCount > 0 ? 'used' : 'unused';
}

function learning_summarize_game(string $filePath, array $game): array
{
    $gameId = pathinfo($filePath, PATHINFO_FILENAME);
    $decisions = is_array($game['decisions'] ?? null) ? $game['decisions'] : [];
    $humanDecisions = 0;
    $botDecisions = 0;
    $otherDecisions = 0;
    $policyVersions = [];

    foreach ($decisions as $decision) {
        if (!is_array($decision)) {
            $otherDecisions++;
            continue;
        }

        $actorType = $decision['actorType'] ?? null;
        if ($actorType === 'human') {
            $humanDecisions++;
        } elseif ($actorType === 'bot') {
            $botDecisions++;
        } else {
            $otherDecisions++;
        }

        $policyVersion = $decision['policyVersion'] ?? null;
        if ($actorType === 'bot' && is_string($policyVersion) && $policyVersion !== '') {
            $policyVersions[$policyVersion] = true;
        }
    }

    $storedPlayerCounts = is_array($game['playerCounts'] ?? null) ? $game['playerCounts'] : [];
    $modifiedAt = @filemtime($filePath);
    $bytes = @filesize($filePath);

    return [
        'gameId' => $gameId,
        'createdAt' => is_string($game['createdAt'] ?? null) ? $game['createdAt'] : null,
        'updatedAt' => is_string($game['updatedAt'] ?? null) ? $game['updatedAt'] : null,
        'modifiedAt' => $modifiedAt === false ? 0 : $modifiedAt,
        'status' => learning_normalize_status($game),
        'useCount' => max(0, (int)($game['useCount'] ?? 0)),
        'firstTrainingBatch' => is_string($game['firstTrainingBatch'] ?? null) ? $game['firstTrainingBatch'] : null,
        'lastTrainingBatch' => is_string($game['lastTrainingBatch'] ?? null) ? $game['lastTrainingBatch'] : null,
        'gameVersion' => is_string($game['gameVersion'] ?? null) ? $game['gameVersion'] : null,
        'gitCommit' => is_string($game['gitCommit'] ?? null) ? $game['gitCommit'] : null,
        'playersTotal' => max(0, (int)($storedPlayerCounts['total'] ?? 0)),
        'playersHuman' => max(0, (int)($storedPlayerCounts['human'] ?? 0)),
        'playersBot' => max(0, (int)($storedPlayerCounts['bot'] ?? 0)),
        'decisionsTotal' => count($decisions),
        'humanDecisions' => $humanDecisions,
        'botDecisions' => $botDecisions,
        'otherDecisions' => $otherDecisions,
        'policyVersions' => array_keys($policyVersions),
        'hasOutcome' => is_array($game['outcome'] ?? null),
        'bytes' => $bytes === false ? 0 : $bytes,
    ];
}

function learning_inventory(string $storageDir): array
{
    $games = [];
    $invalidFiles = [];
    $policyStats = [];
    $summary = [
        'totalGames' => 0,
        'unusedGames' => 0,
        'usedGames' => 0,
        'eligibleForDeletionGames' => 0,
        'invalidGames' => 0,
        'totalBytes' => 0,
        'totalDecisions' => 0,
        'humanDecisions' => 0,
        'botDecisions' => 0,
        'otherDecisions' => 0,
        'gamesWithOutcome' => 0,
    ];

    foreach (glob($storageDir . DIRECTORY_SEPARATOR . 'GAME-*.json') ?: [] as $filePath) {
        $bytes = @filesize($filePath);
        $summary['totalBytes'] += $bytes === false ? 0 : $bytes;

        $gameId = pathinfo($filePath, PATHINFO_FILENAME);
        if (!learning_valid_game_id($gameId)) {
            $invalidFiles[] = basename($filePath);
            continue;
        }

        $game = learning_load_game($storageDir, $gameId);
        if ($game === null) {
            $invalidFiles[] = basename($filePath);
            continue;
        }

        $item = learning_summarize_game($filePath, $game);
        $games[] = $item;
        $summary['totalGames']++;
        $summary['totalDecisions'] += $item['decisionsTotal'];
        $summary['humanDecisions'] += $item['humanDecisions'];
        $summary['botDecisions'] += $item['botDecisions'];
        $summary['otherDecisions'] += $item['otherDecisions'];

        if ($item['hasOutcome']) {
            $summary['gamesWithOutcome']++;
        }

        if ($item['status'] === 'unused') {
            $summary['unusedGames']++;
        } elseif ($item['status'] === 'eligible_for_deletion') {
            $summary['eligibleForDeletionGames']++;
        } else {
            $summary['usedGames']++;
        }

        $seenPoliciesInGame = [];
        $decisions = is_array($game['decisions'] ?? null) ? $game['decisions'] : [];
        foreach ($decisions as $decision) {
            if (!is_array($decision) || ($decision['actorType'] ?? null) !== 'bot') {
                continue;
            }

            $policyVersion = $decision['policyVersion'] ?? null;
            if (!is_string($policyVersion) || $policyVersion === '') {
                continue;
            }

            if (!isset($policyStats[$policyVersion])) {
                $policyStats[$policyVersion] = ['games' => 0, 'decisions' => 0];
            }

            $policyStats[$policyVersion]['decisions']++;
            $seenPoliciesInGame[$policyVersion] = true;
        }

        foreach (array_keys($seenPoliciesInGame) as $policyVersion) {
            $policyStats[$policyVersion]['games']++;
        }
    }

    $summary['invalidGames'] = count($invalidFiles);

    usort($games, static fn(array $a, array $b): int => $b['modifiedAt'] <=> $a['modifiedAt']);
    ksort($policyStats, SORT_NATURAL);

    return [
        'summary' => $summary,
        'games' => $games,
        'policyStats' => $policyStats,
        'invalidFiles' => $invalidFiles,
    ];
}

function learning_write_json_file(string $filePath, array $data): void
{
    $encoded = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );

    $tmpPath = $filePath . '.tmp-' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmpPath, $encoded, LOCK_EX) === false) {
        throw new RuntimeException('Could not write learning metadata');
    }

    @chmod($tmpPath, 0600);
    if (!@rename($tmpPath, $filePath)) {
        @unlink($tmpPath);
        throw new RuntimeException('Could not finalize learning metadata');
    }

    @chmod($filePath, 0600);
}

function learning_training_storage_dir(string $storageDir): string
{
    $dir = $storageDir . DIRECTORY_SEPARATOR . 'training-batches';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create training batch storage');
    }

    @chmod($dir, 0700);
    return $dir;
}

function learning_valid_training_batch_id(string $batchId): bool
{
    return (bool)preg_match('/^TRAINING-[0-9]{8}-[0-9]{6}-[A-F0-9]{6}$/', $batchId);
}

function learning_generate_training_batch_id(): string
{
    return 'TRAINING-' . gmdate('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));
}

function learning_training_manifest_path(string $storageDir, string $batchId): string
{
    if (!learning_valid_training_batch_id($batchId)) {
        throw new InvalidArgumentException('Invalid training batch ID');
    }

    return learning_training_storage_dir($storageDir) . DIRECTORY_SEPARATOR . $batchId . '.json';
}

function learning_load_training_batch(string $storageDir, string $batchId): ?array
{
    $path = learning_training_manifest_path($storageDir, $batchId);
    if (!is_file($path)) {
        return null;
    }

    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') {
        return null;
    }

    try {
        $batch = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        return null;
    }

    return is_array($batch) ? $batch : null;
}

function learning_training_game_payload(array $game): array
{
    return [
        'schemaVersion' => (int)($game['schemaVersion'] ?? 1),
        'gameId' => is_string($game['gameId'] ?? null) ? $game['gameId'] : null,
        'createdAt' => is_string($game['createdAt'] ?? null) ? $game['createdAt'] : null,
        'updatedAt' => is_string($game['updatedAt'] ?? null) ? $game['updatedAt'] : null,
        'gameVersion' => is_string($game['gameVersion'] ?? null) ? $game['gameVersion'] : null,
        'gitCommit' => is_string($game['gitCommit'] ?? null) ? $game['gitCommit'] : null,
        'playerCounts' => is_array($game['playerCounts'] ?? null) ? $game['playerCounts'] : null,
        'decisions' => is_array($game['decisions'] ?? null) ? $game['decisions'] : [],
        'outcome' => is_array($game['outcome'] ?? null) ? $game['outcome'] : null,
    ];
}

function learning_training_select_games(string $storageDir, int $newLimit, int $replayLimit): array
{
    $newLimit = max(0, min(500, $newLimit));
    $replayLimit = max(0, min(500, $replayLimit));
    $newCandidates = [];
    $replayCandidates = [];

    foreach (glob($storageDir . DIRECTORY_SEPARATOR . 'GAME-*.json') ?: [] as $filePath) {
        $gameId = pathinfo($filePath, PATHINFO_FILENAME);
        if (!learning_valid_game_id($gameId)) {
            continue;
        }

        $game = learning_load_game($storageDir, $gameId);
        if ($game === null) {
            continue;
        }

        $summary = learning_summarize_game($filePath, $game);
        if ($summary['decisionsTotal'] <= 0 || $summary['status'] === 'eligible_for_deletion') {
            continue;
        }

        $candidate = [
            'gameId' => $gameId,
            'game' => $game,
            'summary' => $summary,
        ];

        if ($summary['status'] === 'unused') {
            $newCandidates[] = $candidate;
        } elseif ($summary['status'] === 'used') {
            $replayCandidates[] = $candidate;
        }
    }

    // Process pending data oldest-first so a backlog cannot starve forever.
    usort($newCandidates, static function (array $a, array $b): int {
        return $a['summary']['modifiedAt'] <=> $b['summary']['modifiedAt'];
    });

    // Reuse the least-used historical games first, then the oldest ones.
    usort($replayCandidates, static function (array $a, array $b): int {
        $useCompare = $a['summary']['useCount'] <=> $b['summary']['useCount'];
        if ($useCompare !== 0) {
            return $useCompare;
        }

        return $a['summary']['modifiedAt'] <=> $b['summary']['modifiedAt'];
    });

    $selected = [];
    foreach (array_slice($newCandidates, 0, $newLimit) as $candidate) {
        $candidate['batchRole'] = 'new';
        $selected[] = $candidate;
    }

    foreach (array_slice($replayCandidates, 0, $replayLimit) as $candidate) {
        $candidate['batchRole'] = 'replay';
        $selected[] = $candidate;
    }

    return $selected;
}

function learning_training_batch_summary(array $selected): array
{
    $summary = [
        'games' => count($selected),
        'newGames' => 0,
        'replayGames' => 0,
        'gamesWithOutcome' => 0,
        'decisions' => 0,
        'humanDecisions' => 0,
        'botDecisions' => 0,
        'otherDecisions' => 0,
        'policyStats' => [],
    ];

    foreach ($selected as $candidate) {
        if (($candidate['batchRole'] ?? '') === 'replay') {
            $summary['replayGames']++;
        } else {
            $summary['newGames']++;
        }

        $item = $candidate['summary'];
        $summary['decisions'] += (int)$item['decisionsTotal'];
        $summary['humanDecisions'] += (int)$item['humanDecisions'];
        $summary['botDecisions'] += (int)$item['botDecisions'];
        $summary['otherDecisions'] += (int)$item['otherDecisions'];
        if ($item['hasOutcome']) {
            $summary['gamesWithOutcome']++;
        }

        $decisions = is_array($candidate['game']['decisions'] ?? null)
            ? $candidate['game']['decisions']
            : [];
        $seen = [];
        foreach ($decisions as $decision) {
            if (!is_array($decision) || ($decision['actorType'] ?? null) !== 'bot') {
                continue;
            }

            $policy = $decision['policyVersion'] ?? null;
            if (!is_string($policy) || $policy === '') {
                continue;
            }

            if (!isset($summary['policyStats'][$policy])) {
                $summary['policyStats'][$policy] = ['games' => 0, 'decisions' => 0];
            }
            $summary['policyStats'][$policy]['decisions']++;
            $seen[$policy] = true;
        }

        foreach (array_keys($seen) as $policy) {
            $summary['policyStats'][$policy]['games']++;
        }
    }

    ksort($summary['policyStats'], SORT_NATURAL);
    return $summary;
}

function learning_prepare_training_batch(string $storageDir, int $newLimit, int $replayLimit): array
{
    $selected = learning_training_select_games($storageDir, $newLimit, $replayLimit);
    if ($selected === []) {
        throw new RuntimeException('No learning games match this export selection');
    }

    $batchId = learning_generate_training_batch_id();
    $batchDir = learning_training_storage_dir($storageDir);
    $summary = learning_training_batch_summary($selected);
    $snapshots = [];
    $jsonl = '';

    foreach ($selected as $candidate) {
        $game = $candidate['game'];
        $gameSummary = $candidate['summary'];
        $snapshot = [
            'gameId' => $candidate['gameId'],
            'role' => $candidate['batchRole'],
            'sourceStatus' => $gameSummary['status'],
            'sourceUseCount' => $gameSummary['useCount'],
            'sourceUpdatedAt' => is_string($game['updatedAt'] ?? null) ? $game['updatedAt'] : null,
            'sourceDecisionCount' => count(is_array($game['decisions'] ?? null) ? $game['decisions'] : []),
        ];
        $snapshots[] = $snapshot;

        $line = [
            'batchRole' => $candidate['batchRole'],
            'sourceUseCount' => $gameSummary['useCount'],
            'game' => learning_training_game_payload($game),
        ];
        $jsonl .= json_encode($line, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
    }

    $manifest = [
        'schemaVersion' => 1,
        'batchId' => $batchId,
        'createdAt' => gmdate('c'),
        'status' => 'prepared',
        'confirmedAt' => null,
        'selection' => [
            'requestedNewGames' => max(0, min(500, $newLimit)),
            'requestedReplayGames' => max(0, min(500, $replayLimit)),
            'ordering' => 'pending-oldest-first; replay-lowest-use-count-first',
        ],
        'files' => [
            'manifest' => 'manifest.json',
            'games' => 'games.jsonl',
            'summary' => 'summary.json',
        ],
        'summary' => $summary,
        'games' => $snapshots,
        'archiveFilename' => null,
        'archiveBytes' => 0,
        'markResult' => null,
    ];

    $manifestJson = json_encode(
        $manifest,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );
    $summaryJson = json_encode(
        $summary,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );

    if (!class_exists('PharData')) {
        throw new RuntimeException('PHP PharData is required for training batch export');
    }

    $tarPath = $batchDir . DIRECTORY_SEPARATOR . $batchId . '.tar';
    $gzPath = $tarPath . '.gz';
    @unlink($tarPath);
    @unlink($gzPath);

    try {
        $archive = new PharData($tarPath);
        $archive->addFromString('manifest.json', $manifestJson);
        $archive->addFromString('games.jsonl', $jsonl);
        $archive->addFromString('summary.json', $summaryJson);
        unset($archive);

        $archiveFilename = basename($tarPath);
        $archivePath = $tarPath;

        try {
            $tar = new PharData($tarPath);
            $compressed = $tar->compress(Phar::GZ);
            unset($compressed, $tar);
            if (is_file($gzPath)) {
                @unlink($tarPath);
                $archiveFilename = basename($gzPath);
                $archivePath = $gzPath;
            }
        } catch (Throwable $compressionError) {
            // A plain TAR remains a valid training package fallback.
        }

        @chmod($archivePath, 0600);
        $archiveBytes = @filesize($archivePath);
        $manifest['archiveFilename'] = $archiveFilename;
        $manifest['archiveBytes'] = $archiveBytes === false ? 0 : $archiveBytes;
        learning_write_json_file(learning_training_manifest_path($storageDir, $batchId), $manifest);
    } catch (Throwable $error) {
        @unlink($tarPath);
        @unlink($gzPath);
        throw $error;
    }

    return $manifest;
}

function learning_training_archive_path(string $storageDir, array $batch): ?string
{
    $filename = $batch['archiveFilename'] ?? null;
    if (!is_string($filename) || $filename === '' || basename($filename) !== $filename) {
        return null;
    }

    $path = learning_training_storage_dir($storageDir) . DIRECTORY_SEPARATOR . $filename;
    return is_file($path) ? $path : null;
}

function learning_confirm_training_batch(string $storageDir, string $batchId): array
{
    $manifestPath = learning_training_manifest_path($storageDir, $batchId);
    $batch = learning_load_training_batch($storageDir, $batchId);
    if ($batch === null) {
        throw new RuntimeException('Training batch not found');
    }

    if (($batch['status'] ?? null) === 'confirmed') {
        return $batch;
    }

    if (($batch['status'] ?? null) !== 'prepared') {
        throw new RuntimeException('Training batch cannot be confirmed');
    }

    $results = [
        'markedGames' => 0,
        'pendingAgainGames' => 0,
        'missingOrInvalidGames' => 0,
    ];

    $snapshots = is_array($batch['games'] ?? null) ? $batch['games'] : [];
    foreach ($snapshots as $snapshot) {
        if (!is_array($snapshot)) {
            $results['missingOrInvalidGames']++;
            continue;
        }

        $gameId = $snapshot['gameId'] ?? '';
        if (!is_string($gameId) || !learning_valid_game_id($gameId)) {
            $results['missingOrInvalidGames']++;
            continue;
        }

        $filePath = learning_game_file_path($storageDir, $gameId);
        if (!is_file($filePath)) {
            $results['missingOrInvalidGames']++;
            continue;
        }

        $handle = @fopen($filePath, 'c+');
        if ($handle === false) {
            $results['missingOrInvalidGames']++;
            continue;
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Could not lock learning game');
            }

            rewind($handle);
            $raw = stream_get_contents($handle);
            $game = json_decode((string)$raw, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($game)) {
                throw new RuntimeException('Invalid learning game');
            }

            $useCount = max(0, (int)($game['useCount'] ?? 0)) + 1;
            $game['useCount'] = $useCount;
            if (!is_string($game['firstTrainingBatch'] ?? null) || $game['firstTrainingBatch'] === '') {
                $game['firstTrainingBatch'] = $batchId;
            }
            $game['lastTrainingBatch'] = $batchId;
            $game['lastTrainingDecisionCount'] = max(0, (int)($snapshot['sourceDecisionCount'] ?? 0));
            $game['lastTrainingUpdatedAt'] = is_string($snapshot['sourceUpdatedAt'] ?? null)
                ? $snapshot['sourceUpdatedAt']
                : null;

            $currentDecisionCount = count(is_array($game['decisions'] ?? null) ? $game['decisions'] : []);
            $currentUpdatedAt = is_string($game['updatedAt'] ?? null) ? $game['updatedAt'] : null;
            $snapshotDecisionCount = max(0, (int)($snapshot['sourceDecisionCount'] ?? 0));
            $snapshotUpdatedAt = is_string($snapshot['sourceUpdatedAt'] ?? null)
                ? $snapshot['sourceUpdatedAt']
                : null;

            $hasNewData = $currentDecisionCount !== $snapshotDecisionCount || $currentUpdatedAt !== $snapshotUpdatedAt;
            $game['status'] = $hasNewData ? 'unused' : 'used';
            if ($hasNewData) {
                $results['pendingAgainGames']++;
            }

            $encoded = json_encode(
                $game,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            );
            rewind($handle);
            if (!ftruncate($handle, 0)) {
                throw new RuntimeException('Could not truncate learning game');
            }
            $written = fwrite($handle, $encoded);
            if ($written === false || $written < strlen($encoded)) {
                throw new RuntimeException('Could not update learning game');
            }
            fflush($handle);
            flock($handle, LOCK_UN);
            fclose($handle);
            @chmod($filePath, 0600);
            $results['markedGames']++;
        } catch (Throwable $error) {
            @flock($handle, LOCK_UN);
            @fclose($handle);
            $results['missingOrInvalidGames']++;
        }
    }

    $archivePath = learning_training_archive_path($storageDir, $batch);
    if ($archivePath !== null) {
        @unlink($archivePath);
    }

    $batch['status'] = 'confirmed';
    $batch['confirmedAt'] = gmdate('c');
    $batch['markResult'] = $results;
    $batch['archiveDeletedAfterConfirmation'] = $archivePath !== null;
    learning_write_json_file($manifestPath, $batch);

    return $batch;
}

function learning_training_batch_inventory(string $storageDir): array
{
    $dir = learning_training_storage_dir($storageDir);
    $batches = [];
    $summary = [
        'preparedBatches' => 0,
        'confirmedBatches' => 0,
        'packageBytes' => 0,
    ];

    foreach (glob($dir . DIRECTORY_SEPARATOR . 'TRAINING-*.json') ?: [] as $manifestPath) {
        $batchId = pathinfo($manifestPath, PATHINFO_FILENAME);
        if (!learning_valid_training_batch_id($batchId)) {
            continue;
        }

        $batch = learning_load_training_batch($storageDir, $batchId);
        if ($batch === null) {
            continue;
        }

        $archivePath = learning_training_archive_path($storageDir, $batch);
        $archiveBytes = $archivePath !== null ? (@filesize($archivePath) ?: 0) : 0;
        $status = ($batch['status'] ?? null) === 'confirmed' ? 'confirmed' : 'prepared';
        if ($status === 'confirmed') {
            $summary['confirmedBatches']++;
        } else {
            $summary['preparedBatches']++;
        }
        $summary['packageBytes'] += $archiveBytes;

        $batches[] = [
            'batchId' => $batchId,
            'createdAt' => is_string($batch['createdAt'] ?? null) ? $batch['createdAt'] : null,
            'confirmedAt' => is_string($batch['confirmedAt'] ?? null) ? $batch['confirmedAt'] : null,
            'status' => $status,
            'summary' => is_array($batch['summary'] ?? null) ? $batch['summary'] : [],
            'archiveAvailable' => $archivePath !== null,
            'archiveBytes' => $archiveBytes,
            'markResult' => is_array($batch['markResult'] ?? null) ? $batch['markResult'] : null,
        ];
    }

    usort($batches, static function (array $a, array $b): int {
        return strcmp((string)$b['createdAt'], (string)$a['createdAt']);
    });

    return ['summary' => $summary, 'batches' => $batches];
}
