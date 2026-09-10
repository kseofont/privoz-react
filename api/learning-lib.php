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
