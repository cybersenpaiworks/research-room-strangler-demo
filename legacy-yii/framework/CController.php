<?php
declare(strict_types=1);

abstract class CController
{
    private ?PDO $connection = null;

    protected function db(): PDO
    {
        if ($this->connection instanceof PDO) {
            return $this->connection;
        }

        $host = getenv('MYSQL_HOST') ?: 'mysql';
        $port = getenv('MYSQL_PORT') ?: '3306';
        $database = getenv('MYSQL_DATABASE') ?: 'research_sessions';
        $user = getenv('MYSQL_USER') ?: 'research_user';
        $password = getenv('MYSQL_PASSWORD') ?: 'research_password';

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);

        $this->connection = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return $this->connection;
    }

    protected function json(int $statusCode, array $payload): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_PRETTY_PRINT);
    }

    protected function jsonInput(): array
    {
        $raw = file_get_contents('php://input');

        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    protected function simulatedDelayMs(): int
    {
        $delay = (int) (getenv('LEGACY_SIMULATED_DELAY_MS') ?: '1200');
        return max($delay, 0);
    }
}
