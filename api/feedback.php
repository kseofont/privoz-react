<?php

declare(strict_types=1);

const MAX_REPORT_BYTES = 131072; // 128 KiB
const RETENTION_SECONDS = 259200; // 3 days

function respond(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
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
    respond(405, ['saved' => false, 'error' => 'Method not allowed']);
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > MAX_REPORT_BYTES) {
    respond(413, ['saved' => false, 'error' => 'Report is too large']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    respond(400, ['saved' => false, 'error' => 'Empty request body']);
}

if (strlen($raw) > MAX_REPORT_BYTES) {
    respond(413, ['saved' => false, 'error' => 'Report is too large']);
}

try {
    $report = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    respond(400, ['saved' => false, 'error' => 'Invalid JSON']);
}

if (!is_array($report)) {
    respond(400, ['saved' => false, 'error' => 'Invalid report']);
}

$feedbackId = $report['feedbackId'] ?? '';
if (!is_string($feedbackId) || !preg_match('/^FB-[0-9]{8}-[A-Z0-9]{6,16}$/', $feedbackId)) {
    respond(400, ['saved' => false, 'error' => 'Invalid feedback ID']);
}

// Local default: /tmp/privoz-feedback.
// On production set PRIVOZ_FEEDBACK_DIR to a private writable directory outside the public web root.
$storageDir = getenv('PRIVOZ_FEEDBACK_DIR') ?: sys_get_temp_dir() . '/privoz-feedback';

if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
    respond(500, ['saved' => false, 'error' => 'Could not create feedback storage']);
}

// Opportunistic cleanup: every new report removes JSON files older than 72 hours.
$cutoff = time() - RETENTION_SECONDS;
foreach (glob($storageDir . '/FB-*.json') ?: [] as $oldFile) {
    $modifiedAt = @filemtime($oldFile);
    if ($modifiedAt !== false && $modifiedAt < $cutoff) {
        @unlink($oldFile);
    }
}

$report['serverReceivedAt'] = gmdate('c');
$encoded = json_encode($report, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false) {
    respond(500, ['saved' => false, 'error' => 'Could not encode report']);
}

$filePath = $storageDir . '/' . $feedbackId . '.json';
$result = file_put_contents($filePath, $encoded, LOCK_EX);
if ($result === false) {
    respond(500, ['saved' => false, 'error' => 'Could not save report']);
}

@chmod($filePath, 0600);

respond(201, [
    'saved' => true,
    'feedbackId' => $feedbackId,
    'serverReceivedAt' => $report['serverReceivedAt'],
]);
