<?php
declare(strict_types=1);

require_once __DIR__ . '/../framework/CController.php';
require_once __DIR__ . '/../protected/controllers/SessionController.php';

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$normalizedPath = preg_replace('#^/yii-legacy#', '', $uri) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('Content-Type: application/json');

if ($normalizedPath === '/health') {
    http_response_code(200);
    echo json_encode([
        'status' => 'ok',
        'service' => 'legacy-yii-simulator',
        'timestamp' => gmdate(DATE_ATOM),
    ], JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'GET' && preg_match('#^/session/(\d+)$#', $normalizedPath, $matches) === 1) {
    $controller = new SessionController();
    $controller->actionView((int) $matches[1]);
    exit;
}

if ($method === 'POST' && preg_match('#^/session/(\d+)/snapshot$#', $normalizedPath, $matches) === 1) {
    $controller = new SessionController();
    $controller->actionSyncSnapshot((int) $matches[1]);
    exit;
}

http_response_code(404);
echo json_encode([
    'error' => 'Not Found',
    'path' => $normalizedPath,
], JSON_PRETTY_PRINT);
