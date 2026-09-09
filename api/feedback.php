<?php

declare(strict_types=1);

require_once __DIR__ . '/feedback-lib.php';

function respond(int $status, array $payload): void
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
    respond(405, ['saved' => false, 'error' => 'Method not allowed']);
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > PRIVOZ_FEEDBACK_MAX_REPORT_BYTES) {
    respond(413, ['saved' => false, 'error' => 'Report is too large']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    respond(400, ['saved' => false, 'error' => 'Empty request body']);
}

if (strlen($raw) > PRIVOZ_FEEDBACK_MAX_REPORT_BYTES) {
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
if (!is_string($feedbackId) || !feedback_valid_id($feedbackId)) {
    respond(400, ['saved' => false, 'error' => 'Invalid feedback ID']);
}

try {
    $storageDir = feedback_ensure_storage();
} catch (Throwable $error) {
    respond(500, ['saved' => false, 'error' => 'Could not prepare feedback storage']);
}

$report['serverReceivedAt'] = gmdate('c');
$encoded = json_encode($report, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false) {
    respond(500, ['saved' => false, 'error' => 'Could not encode report']);
}

try {
    $filePath = feedback_file_path($storageDir, $feedbackId);
} catch (InvalidArgumentException $error) {
    respond(400, ['saved' => false, 'error' => 'Invalid feedback ID']);
}

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
