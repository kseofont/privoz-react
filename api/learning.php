<?php

declare(strict_types=1);

require_once __DIR__ . '/learning-lib.php';

function learning_respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === 'http://localhost:3000' || $origin === 'http://127.0.0.1:3000') {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    learning_respond(405, ['saved' => false, 'error' => 'Method not allowed']);
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > PRIVOZ_LEARNING_MAX_EVENT_BYTES) {
    learning_respond(413, ['saved' => false, 'error' => 'Learning event is too large']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    learning_respond(400, ['saved' => false, 'error' => 'Empty request body']);
}

if (strlen($raw) > PRIVOZ_LEARNING_MAX_EVENT_BYTES) {
    learning_respond(413, ['saved' => false, 'error' => 'Learning event is too large']);
}

try {
    $event = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    learning_respond(400, ['saved' => false, 'error' => 'Invalid JSON']);
}

if (!is_array($event)) {
    learning_respond(400, ['saved' => false, 'error' => 'Invalid learning event']);
}

$gameId = $event['gameId'] ?? '';
$eventId = $event['eventId'] ?? '';

if (!is_string($gameId) || !learning_valid_game_id($gameId)) {
    learning_respond(400, ['saved' => false, 'error' => 'Invalid game ID']);
}

if (!is_string($eventId) || !learning_valid_event_id($eventId)) {
    learning_respond(400, ['saved' => false, 'error' => 'Invalid event ID']);
}

try {
    $storageDir = learning_ensure_storage();
    $filePath = learning_game_file_path($storageDir, $gameId);
} catch (Throwable $error) {
    learning_respond(500, ['saved' => false, 'error' => 'Could not prepare learning storage']);
}

$handle = @fopen($filePath, 'c+');
if ($handle === false) {
    learning_respond(500, ['saved' => false, 'error' => 'Could not open learning log']);
}

try {
    if (!flock($handle, LOCK_EX)) {
        throw new RuntimeException('Could not lock learning log');
    }

    rewind($handle);
    $existingRaw = stream_get_contents($handle);
    $game = null;

    if (is_string($existingRaw) && trim($existingRaw) !== '') {
        try {
            $decoded = json_decode($existingRaw, true, 512, JSON_THROW_ON_ERROR);
            if (is_array($decoded)) {
                $game = $decoded;
            }
        } catch (JsonException $error) {
            throw new RuntimeException('Existing learning log is invalid');
        }
    }

    if (!is_array($game)) {
        $game = [
            'schemaVersion' => 1,
            'gameId' => $gameId,
            'createdAt' => gmdate('c'),
            'updatedAt' => gmdate('c'),
            'status' => 'unused',
            'useCount' => 0,
            'firstTrainingBatch' => null,
            'lastTrainingBatch' => null,
            'gameVersion' => $event['gameVersion'] ?? null,
            'gitCommit' => $event['gitCommit'] ?? null,
            'playerCounts' => $event['playerCounts'] ?? null,
            'decisions' => [],
            'outcome' => null,
        ];
    }

    $decisions = is_array($game['decisions'] ?? null) ? $game['decisions'] : [];

    foreach ($decisions as $savedDecision) {
        if (is_array($savedDecision) && ($savedDecision['eventId'] ?? null) === $eventId) {
            flock($handle, LOCK_UN);
            fclose($handle);

            learning_respond(200, [
                'saved' => true,
                'duplicate' => true,
                'gameId' => $gameId,
                'eventId' => $eventId,
            ]);
        }
    }

    if (count($decisions) >= PRIVOZ_LEARNING_MAX_DECISIONS) {
        throw new RuntimeException('Learning log decision limit reached');
    }

    $event['serverReceivedAt'] = gmdate('c');
    $decisions[] = $event;
    $game['decisions'] = $decisions;
    $game['updatedAt'] = gmdate('c');

    // If a previously trained game receives another accepted decision, the
    // game contains new data that has not yet been included in a confirmed
    // training batch. Keep useCount/history, but mark it pending again.
    if ((int)($game['useCount'] ?? 0) > 0) {
        $game['status'] = 'unused';
    }

    $encoded = json_encode($game, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        throw new RuntimeException('Could not encode learning log');
    }

    if (strlen($encoded) > PRIVOZ_LEARNING_MAX_GAME_BYTES) {
        throw new RuntimeException('Learning log game size limit reached');
    }

    rewind($handle);
    if (!ftruncate($handle, 0)) {
        throw new RuntimeException('Could not truncate learning log');
    }

    $written = fwrite($handle, $encoded);
    if ($written === false || $written < strlen($encoded)) {
        throw new RuntimeException('Could not save learning log');
    }

    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    @chmod($filePath, 0600);
} catch (Throwable $error) {
    @flock($handle, LOCK_UN);
    @fclose($handle);
    learning_respond(500, ['saved' => false, 'error' => $error->getMessage()]);
}

learning_respond(201, [
    'saved' => true,
    'duplicate' => false,
    'gameId' => $gameId,
    'eventId' => $eventId,
]);
