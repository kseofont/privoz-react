<?php

declare(strict_types=1);

const PRIVOZ_FEEDBACK_RETENTION_SECONDS = 259200; // 72 hours
const PRIVOZ_FEEDBACK_MAX_REPORT_BYTES = 131072; // 128 KiB

function feedback_storage_dir(): string
{
    $configured = getenv('PRIVOZ_FEEDBACK_DIR');
    if (is_string($configured) && trim($configured) !== '') {
        return rtrim($configured, DIRECTORY_SEPARATOR);
    }

    // api/ lives inside the public app directory. Three levels up normally lands
    // in the hosting account/project parent, outside the Privoz public web root.
    return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . '.privoz-feedback';
}

function feedback_ensure_storage(): string
{
    $storageDir = feedback_storage_dir();

    if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
        throw new RuntimeException('Could not create feedback storage');
    }

    @chmod($storageDir, 0700);
    return $storageDir;
}

function feedback_cleanup(string $storageDir): int
{
    $deleted = 0;
    $cutoff = time() - PRIVOZ_FEEDBACK_RETENTION_SECONDS;

    foreach (glob($storageDir . DIRECTORY_SEPARATOR . 'FB-*.json') ?: [] as $file) {
        $modifiedAt = @filemtime($file);
        if ($modifiedAt !== false && $modifiedAt < $cutoff && @unlink($file)) {
            $deleted++;
        }
    }

    return $deleted;
}

function feedback_valid_id(string $feedbackId): bool
{
    return (bool)preg_match('/^FB-[0-9]{8}-[A-Z0-9]{6,16}$/', $feedbackId);
}

function feedback_file_path(string $storageDir, string $feedbackId): string
{
    if (!feedback_valid_id($feedbackId)) {
        throw new InvalidArgumentException('Invalid feedback ID');
    }

    return $storageDir . DIRECTORY_SEPARATOR . $feedbackId . '.json';
}

function feedback_load_report(string $storageDir, string $feedbackId): ?array
{
    $filePath = feedback_file_path($storageDir, $feedbackId);
    if (!is_file($filePath)) {
        return null;
    }

    $raw = @file_get_contents($filePath);
    if ($raw === false) {
        return null;
    }

    try {
        $report = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        return null;
    }

    return is_array($report) ? $report : null;
}

function feedback_list_reports(string $storageDir): array
{
    $items = [];

    foreach (glob($storageDir . DIRECTORY_SEPARATOR . 'FB-*.json') ?: [] as $file) {
        $modifiedAt = @filemtime($file);
        if ($modifiedAt === false) {
            continue;
        }

        $feedbackId = pathinfo($file, PATHINFO_FILENAME);
        if (!feedback_valid_id($feedbackId)) {
            continue;
        }

        $report = feedback_load_report($storageDir, $feedbackId);
        if ($report === null) {
            continue;
        }

        $game = is_array($report['game'] ?? null) ? $report['game'] : [];
        $items[] = [
            'feedbackId' => $feedbackId,
            'modifiedAt' => $modifiedAt,
            'serverReceivedAt' => $report['serverReceivedAt'] ?? null,
            'comment' => is_string($report['comment'] ?? null) ? $report['comment'] : '',
            'myUserId' => $game['myUserId'] ?? ($report['myUserId'] ?? null),
            'role' => $game['role'] ?? null,
            'round' => $game['round'] ?? ($report['round'] ?? null),
            'phase' => $game['phase'] ?? ($report['phase'] ?? null),
            'bytes' => @filesize($file) ?: 0,
        ];
    }

    usort($items, static fn(array $a, array $b): int => $b['modifiedAt'] <=> $a['modifiedAt']);
    return $items;
}
