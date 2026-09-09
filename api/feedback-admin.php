<?php

declare(strict_types=1);

require_once __DIR__ . '/feedback-lib.php';

header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

$configPath = __DIR__ . '/feedback-admin-config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Feedback admin is not configured.\n";
    exit;
}

$config = require $configPath;
$passwordHash = is_array($config) ? ($config['password_hash'] ?? '') : '';
if (!is_string($passwordHash) || $passwordHash === '') {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Feedback admin password is not configured.\n";
    exit;
}

session_name('privoz_feedback_admin');
session_set_cookie_params([
    'httponly' => true,
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'samesite' => 'Strict',
]);
session_start();

function h(mixed $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function admin_is_authenticated(): bool
{
    return ($_SESSION['feedback_admin_authenticated'] ?? false) === true;
}

if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: feedback-admin.php');
    exit;
}

$loginError = '';
if (!admin_is_authenticated() && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $password = $_POST['password'] ?? '';
    if (is_string($password) && password_verify($password, $passwordHash)) {
        session_regenerate_id(true);
        $_SESSION['feedback_admin_authenticated'] = true;
        header('Location: feedback-admin.php');
        exit;
    }

    usleep(500000);
    $loginError = 'Неверный пароль.';
}

if (!admin_is_authenticated()) {
    ?><!doctype html>
    <html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Privoz feedback</title>
        <style>
            body{font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:32px;color:#222}
            .card{max-width:420px;margin:10vh auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
            input,button{box-sizing:border-box;width:100%;padding:11px 12px;font:inherit}
            input{margin:8px 0 12px;border:1px solid #ccc;border-radius:8px}
            button{border:0;border-radius:8px;background:#222;color:#fff;cursor:pointer}
            .error{color:#a00;margin:0 0 10px}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Privoz feedback</h1>
            <?php if ($loginError !== ''): ?><p class="error"><?= h($loginError) ?></p><?php endif; ?>
            <form method="post" autocomplete="off">
                <label for="password">Пароль администратора</label>
                <input id="password" name="password" type="password" required autofocus>
                <button type="submit">Войти</button>
            </form>
        </div>
    </body>
    </html><?php
    exit;
}

try {
    $storageDir = feedback_ensure_storage();
    feedback_cleanup($storageDir);
} catch (Throwable $error) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Could not open feedback storage.\n";
    exit;
}

$requestedId = $_GET['id'] ?? '';
if (is_string($requestedId) && $requestedId !== '') {
    if (!feedback_valid_id($requestedId)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Invalid feedback ID.\n";
        exit;
    }

    $report = feedback_load_report($storageDir, $requestedId);
    if ($report === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Feedback report not found.\n";
        exit;
    }

    if (($_GET['format'] ?? '') === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $prettyJson = json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ?><!doctype html>
    <html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?= h($requestedId) ?> - Privoz feedback</title>
        <style>
            body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f5;color:#222}
            main{max-width:1100px;margin:auto;padding:24px}
            a{color:#0645ad}.top{display:flex;gap:16px;justify-content:space-between;align-items:center;flex-wrap:wrap}
            pre{background:#111;color:#eee;padding:18px;border-radius:10px;overflow:auto;white-space:pre-wrap;word-break:break-word}
        </style>
    </head>
    <body><main>
        <div class="top">
            <div><a href="feedback-admin.php">← Все отчёты</a> · <a href="?id=<?= h($requestedId) ?>&amp;format=json">JSON</a></div>
            <a href="?logout=1">Выйти</a>
        </div>
        <h1><?= h($requestedId) ?></h1>
        <pre><?= h($prettyJson ?: '{}') ?></pre>
    </main></body></html><?php
    exit;
}

$reports = feedback_list_reports($storageDir);
?><!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privoz feedback</title>
    <style>
        body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f5;color:#222}
        main{max-width:1100px;margin:auto;padding:24px}
        a{color:#0645ad}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
        .report{background:#fff;border-radius:10px;padding:16px;margin:12px 0;box-shadow:0 3px 14px rgba(0,0,0,.05)}
        .meta{display:flex;gap:12px 20px;flex-wrap:wrap;color:#555;font-size:.92rem}.comment{margin:12px 0;white-space:pre-wrap}
        .empty{background:#fff;padding:20px;border-radius:10px}.id{font-weight:700}
    </style>
</head>
<body><main>
    <div class="top">
        <div><h1>Feedback reports</h1><div>Хранятся 72 часа · всего <?= count($reports) ?></div></div>
        <a href="?logout=1">Выйти</a>
    </div>

    <?php if ($reports === []): ?>
        <div class="empty">За последние 3 дня отчётов нет.</div>
    <?php else: ?>
        <?php foreach ($reports as $item): ?>
            <article class="report">
                <div class="id"><a href="?id=<?= h($item['feedbackId']) ?>"><?= h($item['feedbackId']) ?></a></div>
                <div class="meta">
                    <span><?= h(date('Y-m-d H:i:s', (int)$item['modifiedAt'])) ?></span>
                    <?php if ($item['myUserId'] !== null): ?><span>Player: <?= h($item['myUserId']) ?></span><?php endif; ?>
                    <?php if ($item['role'] !== null): ?><span><?= h($item['role']) ?></span><?php endif; ?>
                    <?php if ($item['round'] !== null): ?><span>Round: <?= h($item['round']) ?></span><?php endif; ?>
                    <?php if ($item['phase'] !== null): ?><span>Phase: <?= h($item['phase']) ?></span><?php endif; ?>
                    <span><?= h(number_format(((int)$item['bytes']) / 1024, 1)) ?> KB</span>
                </div>
                <?php if ($item['comment'] !== ''): ?><div class="comment"><?= h($item['comment']) ?></div><?php endif; ?>
                <div><a href="?id=<?= h($item['feedbackId']) ?>">Посмотреть</a> · <a href="?id=<?= h($item['feedbackId']) ?>&amp;format=json">JSON</a></div>
            </article>
        <?php endforeach; ?>
    <?php endif; ?>
</main></body></html>
