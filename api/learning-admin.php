<?php

declare(strict_types=1);

require_once __DIR__ . '/learning-lib.php';

header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

// Reuse the existing feedback-admin credential so production does not need a
// second admin secret for learning-data administration.
$configPath = __DIR__ . '/feedback-admin-config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Learning admin is not configured. Configure feedback-admin-config.php first.\n";
    exit;
}

$config = require $configPath;
$passwordHash = is_array($config) ? ($config['password_hash'] ?? '') : '';
if (!is_string($passwordHash) || $passwordHash === '') {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Learning admin password is not configured.\n";
    exit;
}

session_name('privoz_learning_admin');
session_set_cookie_params([
    'httponly' => true,
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'samesite' => 'Strict',
]);
session_start();

function learning_admin_h($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function learning_admin_is_authenticated(): bool
{
    return ($_SESSION['learning_admin_authenticated'] ?? false) === true;
}

function learning_admin_format_bytes(int $bytes): string
{
    if ($bytes < 1024) {
        return $bytes . ' B';
    }

    if ($bytes < 1024 * 1024) {
        return number_format($bytes / 1024, 1) . ' KB';
    }

    return number_format($bytes / (1024 * 1024), 2) . ' MB';
}

function learning_admin_status_label(string $status): string
{
    if ($status === 'eligible_for_deletion') {
        return 'eligible for deletion';
    }

    if ($status === 'unused') {
        return 'unused / pending';
    }

    return $status;
}

function learning_admin_csrf_token(): string
{
    $token = $_SESSION['learning_admin_csrf'] ?? '';
    if (!is_string($token) || strlen($token) < 32) {
        $token = bin2hex(random_bytes(24));
        $_SESSION['learning_admin_csrf'] = $token;
    }

    return $token;
}

function learning_admin_verify_csrf(): bool
{
    $expected = $_SESSION['learning_admin_csrf'] ?? '';
    $received = $_POST['csrf'] ?? '';
    return is_string($expected)
        && is_string($received)
        && $expected !== ''
        && hash_equals($expected, $received);
}

if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: learning-admin.php');
    exit;
}

$loginError = '';
if (!learning_admin_is_authenticated() && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $password = $_POST['password'] ?? '';
    if (is_string($password) && password_verify($password, $passwordHash)) {
        session_regenerate_id(true);
        $_SESSION['learning_admin_authenticated'] = true;
        header('Location: learning-admin.php');
        exit;
    }

    usleep(500000);
    $loginError = 'Неверный пароль.';
}

if (!learning_admin_is_authenticated()) {
    ?><!doctype html>
    <html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Privoz learning data</title>
        <style>
            body{font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:32px;color:#222}
            .card{max-width:420px;margin:10vh auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
            input,button{box-sizing:border-box;width:100%;padding:11px 12px;font:inherit}
            input{margin:8px 0 12px;border:1px solid #ccc;border-radius:8px}
            button{border:0;border-radius:8px;background:#222;color:#fff;cursor:pointer}
            .error{color:#a00;margin:0 0 10px}.hint{color:#666;font-size:.9rem}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Privoz learning data</h1>
            <p class="hint">Используется тот же пароль, что и для Feedback Admin.</p>
            <?php if ($loginError !== ''): ?><p class="error"><?= learning_admin_h($loginError) ?></p><?php endif; ?>
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
    $storageDir = learning_ensure_storage();
} catch (Throwable $error) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Could not open learning storage.\n";
    exit;
}

$csrfToken = learning_admin_csrf_token();
$actionError = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = $_POST['action'] ?? '';
    if (is_string($action) && $action !== '') {
        if (!learning_admin_verify_csrf()) {
            http_response_code(400);
            $actionError = 'CSRF validation failed.';
        } elseif ($action === 'prepare_export') {
            $newLimit = filter_var($_POST['new_limit'] ?? 100, FILTER_VALIDATE_INT);
            $replayLimit = filter_var($_POST['replay_limit'] ?? 0, FILTER_VALIDATE_INT);
            $newLimit = $newLimit === false ? 100 : max(0, min(500, $newLimit));
            $replayLimit = $replayLimit === false ? 0 : max(0, min(500, $replayLimit));

            if ($newLimit === 0 && $replayLimit === 0) {
                $actionError = 'Нужно выбрать хотя бы одну новую или replay-партию.';
            } else {
                try {
                    $batch = learning_prepare_training_batch($storageDir, $newLimit, $replayLimit);
                    header('Location: learning-admin.php?batch=' . rawurlencode($batch['batchId']) . '&prepared=1');
                    exit;
                } catch (Throwable $error) {
                    $actionError = $error->getMessage();
                }
            }
        } elseif ($action === 'confirm_batch') {
            $batchId = $_POST['batch_id'] ?? '';
            if (!is_string($batchId) || !learning_valid_training_batch_id($batchId)) {
                $actionError = 'Invalid training batch ID.';
            } else {
                try {
                    learning_confirm_training_batch($storageDir, $batchId);
                    header('Location: learning-admin.php?batch=' . rawurlencode($batchId) . '&confirmed=1');
                    exit;
                } catch (Throwable $error) {
                    $actionError = $error->getMessage();
                }
            }
        }
    }
}

$downloadBatchId = $_GET['download'] ?? '';
if (is_string($downloadBatchId) && $downloadBatchId !== '') {
    if (!learning_valid_training_batch_id($downloadBatchId)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Invalid training batch ID.\n";
        exit;
    }

    $batch = learning_load_training_batch($storageDir, $downloadBatchId);
    $archivePath = $batch === null ? null : learning_training_archive_path($storageDir, $batch);
    if ($batch === null || $archivePath === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Training package is not available.\n";
        exit;
    }

    $filename = basename($archivePath);
    $mime = substr($filename, -3) === '.gz' ? 'application/gzip' : 'application/x-tar';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string)filesize($archivePath));
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    readfile($archivePath);
    exit;
}

$requestedId = $_GET['id'] ?? '';
if (is_string($requestedId) && $requestedId !== '') {
    if (!learning_valid_game_id($requestedId)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Invalid game ID.\n";
        exit;
    }

    $game = learning_load_game($storageDir, $requestedId);
    if ($game === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Learning game log not found.\n";
        exit;
    }

    if (($_GET['format'] ?? '') === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($game, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $prettyJson = json_encode($game, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    ?><!doctype html>
    <html lang="ru">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?= learning_admin_h($requestedId) ?> - Privoz learning data</title>
        <style>
            body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f5;color:#222}
            main{max-width:1200px;margin:auto;padding:24px}a{color:#0645ad}
            .top{display:flex;gap:16px;justify-content:space-between;align-items:center;flex-wrap:wrap}
            pre{background:#111;color:#eee;padding:18px;border-radius:10px;overflow:auto;white-space:pre-wrap;word-break:break-word}
        </style>
    </head>
    <body><main>
        <div class="top">
            <div><a href="learning-admin.php">← Все партии</a> · <a href="?id=<?= learning_admin_h($requestedId) ?>&amp;format=json">JSON</a></div>
            <a href="?logout=1">Выйти</a>
        </div>
        <h1><?= learning_admin_h($requestedId) ?></h1>
        <pre><?= learning_admin_h($prettyJson ?: '{}') ?></pre>
    </main></body></html><?php
    exit;
}

$requestedBatchId = $_GET['batch'] ?? '';
$requestedBatch = null;
if (is_string($requestedBatchId) && $requestedBatchId !== '') {
    if (!learning_valid_training_batch_id($requestedBatchId)) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Invalid training batch ID.\n";
        exit;
    }

    $requestedBatch = learning_load_training_batch($storageDir, $requestedBatchId);
    if ($requestedBatch === null) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Training batch not found.\n";
        exit;
    }

    if (($_GET['format'] ?? '') === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($requestedBatch, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

$inventory = learning_inventory($storageDir);
$summary = $inventory['summary'];
$games = $inventory['games'];
$policyStats = $inventory['policyStats'];
$invalidFiles = $inventory['invalidFiles'];
$batchInventory = learning_training_batch_inventory($storageDir);
$batchSummary = $batchInventory['summary'];
$batches = $batchInventory['batches'];
?><!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Privoz learning data</title>
    <style>
        body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f5;color:#222}main{max-width:1280px;margin:auto;padding:24px}
        a{color:#0645ad}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
        .subtitle{color:#666}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}
        .stat,.panel,.game{background:#fff;border-radius:10px;box-shadow:0 3px 14px rgba(0,0,0,.05)}.stat{padding:16px}
        .stat strong{display:block;font-size:1.55rem;margin-top:4px}.stat span{color:#666;font-size:.9rem}.panel{padding:16px;margin:16px 0}
        table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #eee;vertical-align:top}th{font-size:.85rem;color:#666}
        .games{display:grid;gap:12px}.game{padding:16px}.game-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.id{font-weight:700}
        .meta{display:flex;gap:8px 18px;flex-wrap:wrap;margin-top:8px;color:#555;font-size:.9rem}.badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#eee;font-size:.8rem}
        .badge-unused{background:#fff3cd}.badge-used{background:#d1e7dd}.badge-eligible_for_deletion{background:#f8d7da}.badge-prepared{background:#cfe2ff}.badge-confirmed{background:#d1e7dd}.warning{color:#8a1c1c}
        .empty{background:#fff;padding:20px;border-radius:10px}.note{font-size:.9rem;color:#666;margin-top:20px}.success{background:#d1e7dd}.error{background:#f8d7da;color:#842029}
        .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end}.form-grid label{display:block;font-size:.9rem;color:#555;margin-bottom:5px}
        input[type=number]{box-sizing:border-box;width:100%;padding:9px;border:1px solid #bbb;border-radius:7px}button,.button{display:inline-block;padding:9px 13px;border:0;border-radius:7px;background:#222;color:#fff;text-decoration:none;cursor:pointer;font:inherit}.button-secondary{background:#555}
        form.inline{display:inline}.batch-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.small{font-size:.86rem;color:#666}
    </style>
</head>
<body><main>
    <div class="top">
        <div><h1>Learning Data</h1><div class="subtitle">Inventory · training batch export · explicit use tracking · no game-log cleanup yet</div></div>
        <div><a href="feedback-admin.php">Feedback Admin</a> · <a href="?logout=1">Выйти</a></div>
    </div>

    <?php if ($actionError !== ''): ?><section class="panel error"><?= learning_admin_h($actionError) ?></section><?php endif; ?>
    <?php if (isset($_GET['prepared'])): ?><section class="panel success">Training package подготовлен. Сначала скачайте его, затем подтвердите использование batch.</section><?php endif; ?>
    <?php if (isset($_GET['confirmed'])): ?><section class="panel success">Training batch подтверждён: useCount обновлён, временный archive удалён с сервера.</section><?php endif; ?>

    <section class="stats">
        <div class="stat"><span>Всего партий</span><strong><?= (int)$summary['totalGames'] ?></strong></div>
        <div class="stat"><span>Unused / pending</span><strong><?= (int)$summary['unusedGames'] ?></strong></div>
        <div class="stat"><span>Used</span><strong><?= (int)$summary['usedGames'] ?></strong></div>
        <div class="stat"><span>Decisions</span><strong><?= (int)$summary['totalDecisions'] ?></strong></div>
        <div class="stat"><span>Human decisions</span><strong><?= (int)$summary['humanDecisions'] ?></strong></div>
        <div class="stat"><span>Bot decisions</span><strong><?= (int)$summary['botDecisions'] ?></strong></div>
        <div class="stat"><span>Game logs</span><strong><?= learning_admin_h(learning_admin_format_bytes((int)$summary['totalBytes'])) ?></strong></div>
        <div class="stat"><span>Draft packages</span><strong><?= (int)$batchSummary['preparedBatches'] ?></strong></div>
        <div class="stat"><span>Package storage</span><strong><?= learning_admin_h(learning_admin_format_bytes((int)$batchSummary['packageBytes'])) ?></strong></div>
        <div class="stat"><span>With outcome</span><strong><?= (int)$summary['gamesWithOutcome'] ?></strong></div>
    </section>

    <section class="panel">
        <h2>Prepare training batch</h2>
        <p>Пакет содержит <code>manifest.json</code>, <code>games.jsonl</code> и <code>summary.json</code>. Подготовка пакета сама по себе не меняет <code>useCount</code>.</p>
        <form method="post">
            <input type="hidden" name="csrf" value="<?= learning_admin_h($csrfToken) ?>">
            <input type="hidden" name="action" value="prepare_export">
            <div class="form-grid">
                <div><label for="new_limit">Unused / pending games</label><input id="new_limit" name="new_limit" type="number" min="0" max="500" value="<?= min(100, max(0, (int)$summary['unusedGames'])) ?>"></div>
                <div><label for="replay_limit">Replay used games</label><input id="replay_limit" name="replay_limit" type="number" min="0" max="500" value="0"></div>
                <div><button type="submit">Prepare export</button></div>
            </div>
        </form>
        <p class="small">Pending выбираются от старых к новым. Replay выбирается среди used-партий с минимальным useCount. Максимум 500 + 500 за один batch.</p>
    </section>

    <?php if (is_array($requestedBatch)): ?>
        <?php $rbSummary = is_array($requestedBatch['summary'] ?? null) ? $requestedBatch['summary'] : []; ?>
        <section class="panel">
            <div class="game-head">
                <div><h2 style="margin:0"><?= learning_admin_h($requestedBatch['batchId'] ?? '') ?></h2></div>
                <span class="badge badge-<?= learning_admin_h($requestedBatch['status'] ?? 'prepared') ?>"><?= learning_admin_h($requestedBatch['status'] ?? 'prepared') ?></span>
            </div>
            <div class="meta">
                <span>games: <?= (int)($rbSummary['games'] ?? 0) ?></span>
                <span>new: <?= (int)($rbSummary['newGames'] ?? 0) ?></span>
                <span>replay: <?= (int)($rbSummary['replayGames'] ?? 0) ?></span>
                <span>decisions: <?= (int)($rbSummary['decisions'] ?? 0) ?></span>
                <span>human: <?= (int)($rbSummary['humanDecisions'] ?? 0) ?></span>
                <span>bot: <?= (int)($rbSummary['botDecisions'] ?? 0) ?></span>
                <span>with outcome: <?= (int)($rbSummary['gamesWithOutcome'] ?? 0) ?></span>
            </div>
            <div class="batch-actions">
                <a class="button button-secondary" href="?batch=<?= learning_admin_h($requestedBatch['batchId']) ?>&amp;format=json">Manifest</a>
                <?php if (($requestedBatch['status'] ?? null) === 'prepared' && learning_training_archive_path($storageDir, $requestedBatch) !== null): ?>
                    <a class="button" href="?download=<?= learning_admin_h($requestedBatch['batchId']) ?>">Download package</a>
                    <form class="inline" method="post">
                        <input type="hidden" name="csrf" value="<?= learning_admin_h($csrfToken) ?>">
                        <input type="hidden" name="action" value="confirm_batch">
                        <input type="hidden" name="batch_id" value="<?= learning_admin_h($requestedBatch['batchId']) ?>">
                        <button type="submit">Confirm used</button>
                    </form>
                <?php endif; ?>
            </div>
            <?php if (($requestedBatch['status'] ?? null) === 'prepared'): ?>
                <p class="note"><strong>Важно:</strong> сначала скачайте пакет. Только потом нажимайте Confirm used. После подтверждения archive удаляется с сервера, а маленький manifest остаётся как история training batch.</p>
            <?php else: ?>
                <?php $mark = is_array($requestedBatch['markResult'] ?? null) ? $requestedBatch['markResult'] : []; ?>
                <p class="note">Marked: <?= (int)($mark['markedGames'] ?? 0) ?> · pending again because game changed after snapshot: <?= (int)($mark['pendingAgainGames'] ?? 0) ?> · missing/invalid: <?= (int)($mark['missingOrInvalidGames'] ?? 0) ?></p>
            <?php endif; ?>
        </section>
    <?php endif; ?>

    <section class="panel">
        <h2>Training batches</h2>
        <?php if ($batches === []): ?>
            <p>Training batches пока нет.</p>
        <?php else: ?>
            <table>
                <thead><tr><th>Batch</th><th>Status</th><th>Games</th><th>New / replay</th><th>Decisions</th><th>Package</th></tr></thead>
                <tbody>
                <?php foreach (array_slice($batches, 0, 30) as $batchItem): ?>
                    <?php $bs = is_array($batchItem['summary'] ?? null) ? $batchItem['summary'] : []; ?>
                    <tr>
                        <td><a href="?batch=<?= learning_admin_h($batchItem['batchId']) ?>"><?= learning_admin_h($batchItem['batchId']) ?></a></td>
                        <td><?= learning_admin_h($batchItem['status']) ?></td>
                        <td><?= (int)($bs['games'] ?? 0) ?></td>
                        <td><?= (int)($bs['newGames'] ?? 0) ?> / <?= (int)($bs['replayGames'] ?? 0) ?></td>
                        <td><?= (int)($bs['decisions'] ?? 0) ?></td>
                        <td><?= $batchItem['archiveAvailable'] ? learning_admin_h(learning_admin_format_bytes((int)$batchItem['archiveBytes'])) : '-' ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </section>

    <section class="panel">
        <h2>Policy versions</h2>
        <?php if ($policyStats === []): ?>
            <p>Bot policy data пока нет.</p>
        <?php else: ?>
            <table>
                <thead><tr><th>Policy</th><th>Games</th><th>Decisions</th></tr></thead>
                <tbody>
                <?php foreach ($policyStats as $policyVersion => $stats): ?>
                    <tr><td><?= learning_admin_h($policyVersion) ?></td><td><?= (int)$stats['games'] ?></td><td><?= (int)$stats['decisions'] ?></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    </section>

    <?php if ($summary['eligibleForDeletionGames'] > 0): ?>
        <section class="panel"><strong>Eligible for deletion:</strong> <?= (int)$summary['eligibleForDeletionGames'] ?>. Удаление игровых логов на этом этапе намеренно не реализовано.</section>
    <?php endif; ?>

    <?php if ($invalidFiles !== []): ?>
        <section class="panel warning"><strong>Некорректные learning-файлы: <?= count($invalidFiles) ?></strong><br><?= learning_admin_h(implode(', ', $invalidFiles)) ?></section>
    <?php endif; ?>

    <h2>Игры</h2>
    <?php if ($games === []): ?>
        <div class="empty">Сохранённых learning logs пока нет.</div>
    <?php else: ?>
        <div class="games">
        <?php foreach ($games as $item): ?>
            <article class="game">
                <div class="game-head">
                    <div class="id"><a href="?id=<?= learning_admin_h($item['gameId']) ?>"><?= learning_admin_h($item['gameId']) ?></a></div>
                    <span class="badge badge-<?= learning_admin_h($item['status']) ?>"><?= learning_admin_h(learning_admin_status_label($item['status'])) ?></span>
                </div>
                <div class="meta">
                    <span><?= learning_admin_h($item['updatedAt'] ?? $item['createdAt'] ?? 'unknown time') ?></span>
                    <span>useCount: <?= (int)$item['useCount'] ?></span>
                    <span>players: <?= (int)$item['playersTotal'] ?> (H <?= (int)$item['playersHuman'] ?> / B <?= (int)$item['playersBot'] ?>)</span>
                    <span>decisions: <?= (int)$item['decisionsTotal'] ?> (H <?= (int)$item['humanDecisions'] ?> / B <?= (int)$item['botDecisions'] ?>)</span>
                    <span>policies: <?= learning_admin_h($item['policyVersions'] === [] ? '-' : implode(', ', $item['policyVersions'])) ?></span>
                    <span>outcome: <?= $item['hasOutcome'] ? 'yes' : 'no' ?></span>
                    <span><?= learning_admin_h(learning_admin_format_bytes((int)$item['bytes'])) ?></span>
                </div>
                <div style="margin-top:10px"><a href="?id=<?= learning_admin_h($item['gameId']) ?>">Посмотреть</a> · <a href="?id=<?= learning_admin_h($item['gameId']) ?>&amp;format=json">JSON</a></div>
            </article>
        <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <p class="note"><strong>unused / pending</strong> означает, что в логе есть данные, ещё не включённые в последний подтверждённый training snapshot. Если использованная партия получает новые решения, она автоматически становится pending снова, не теряя useCount.</p>
    <p class="note">Cleanup игровых логов остаётся отдельным следующим этапом. Confirm used удаляет только временный export archive; исходные game logs не удаляются.</p>
</main></body></html>
