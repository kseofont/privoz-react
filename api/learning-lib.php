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
