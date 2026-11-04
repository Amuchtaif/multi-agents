<?php
/**
 * Database Connection & Migration Helper
 * Kantor Virtual HQ
 */

header('Content-Type: application/json; charset=utf-8');

$host = '127.0.0.1';
$port = '3306';
$dbName = 'kantor_virtual_hq';
$username = 'amuchtaif';
$password = 'qurmutun';

try {
    // Connect to MySQL server first
    $pdo = new PDO("mysql:host={$host};port={$port};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Ensure database exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$dbName}`");

    // Ensure tables exist
    ensureTables($pdo);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}

/**
 * Ensures all required tables and initial seed data exist
 */
function ensureTables(PDO $pdo) {
    static $alreadyChecked = false;
    if ($alreadyChecked) return;

    try {
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'agents'")->fetch();
        if ($tableCheck && !isset($_GET['migrate'])) {
            $alreadyChecked = true;
            return;
        }
    } catch (Exception $e) {}

    $alreadyChecked = true;

    // 1. Agents table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `agents` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `role` VARCHAR(100) NOT NULL,
        `department` VARCHAR(100) NOT NULL,
        `working_directory` VARCHAR(500) NULL,
        `desk_x` FLOAT NOT NULL DEFAULT 0,
        `desk_z` FLOAT NOT NULL DEFAULT 0,
        `desk_rotation` FLOAT NOT NULL DEFAULT 0,
        `status` ENUM('KERJA', 'IDLE', 'PAUSED') NOT NULL DEFAULT 'IDLE',
        `current_task` VARCHAR(255) DEFAULT 'Menunggu instruksi tugas',
        `avatar_color` VARCHAR(20) DEFAULT '#3b82f6',
        `model` VARCHAR(50) DEFAULT 'gemini-3-flash-preview',
        `temperature` FLOAT DEFAULT 0.7,
        `system_prompt` TEXT,
        `action_count` INT DEFAULT 0,
        `token_usage` INT DEFAULT 0,
        `context_memory` INT DEFAULT 4096,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 2. Agent configs table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `agent_configs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `agent_id` INT NOT NULL,
        `functions_json` TEXT,
        `parameters_json` TEXT,
        `api_endpoint` VARCHAR(255) DEFAULT '/api/v1/agent',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (`agent_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 3. Tasks table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `tasks` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `category` ENUM('deadline_dekat', 'nunggu_owner', 'ide_nanti') NOT NULL DEFAULT 'ide_nanti',
        `assigned_agent_id` INT NULL,
        `status` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
        `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        `due_date` DATE NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (`assigned_agent_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 4. Logs table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `agent_logs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `agent_id` INT NULL,
        `log_type` VARCHAR(50) NOT NULL DEFAULT 'action',
        `message` TEXT NOT NULL,
        `details_json` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (`agent_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 5. System settings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `system_settings` (
        `key_name` VARCHAR(100) PRIMARY KEY,
        `key_value` TEXT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Migration updates for existing installations
    try {
        $pdo->exec("ALTER TABLE `agent_logs` MODIFY COLUMN `log_type` VARCHAR(50) NOT NULL DEFAULT 'action'");
    } catch (Exception $e) {}

    try {
        $pdo->exec("ALTER TABLE `tasks` ADD COLUMN `result_text` TEXT NULL AFTER `due_date`");
    } catch (Exception $e) {}

    try {
        $pdo->exec("ALTER TABLE `agents` ADD COLUMN `working_directory` VARCHAR(500) NULL AFTER `department`");
    } catch (Exception $e) {}

    // Auto-fix any deprecated or invalid Gemini model names in database
    try {
        $pdo->exec("UPDATE `system_settings` SET `key_value` = 'gemini-3-flash-preview' WHERE `key_name` = 'default_model' AND (`key_value` LIKE '%2.5%' OR `key_value` = 'gemini-1.5-flash')");
        $pdo->exec("UPDATE `agents` SET `model` = 'gemini-3-flash-preview' WHERE `model` LIKE '%2.5%' OR `model` = 'gemini-1.5-flash'");
    } catch (Exception $e) {}

    // Seed default settings if empty
    $chkSettings = $pdo->query("SELECT COUNT(*) FROM `system_settings`");
    if ((int)$chkSettings->fetchColumn() === 0) {
        $defaults = [
            'ai_provider' => 'gemini',
            'gemini_api_key' => '',
            'openai_api_key' => '',
            'groq_api_key' => '',
            'openrouter_api_key' => '',
            'ollama_base_url' => 'http://localhost:11434/v1',
            'default_model' => 'gemini-3-flash-preview',
            'real_ai_enabled' => '1',
            'auto_execution' => '0'
        ];
        $ins = $pdo->prepare("INSERT INTO `system_settings` (`key_name`, `key_value`) VALUES (?, ?)");
        foreach ($defaults as $k => $v) {
            $ins->execute([$k, $v]);
        }
    }

    // Check if initial seeding is needed (ONLY on brand-new fresh installation)
    // IMPORTANT: If user intentionally deletes all agents, they MUST NEVER be auto-reseeded!
    $isSeeded = getSystemSetting($pdo, 'system_seeded', '0');
    if ($isSeeded !== '1') {
        $stmt = $pdo->query("SELECT COUNT(*) FROM `agents`");
        $agentCount = (int) $stmt->fetchColumn();

        if ($agentCount === 0) {
            seedInitialData($pdo);
        }
        setSystemSetting($pdo, 'system_seeded', '1');
    }
}

/**
 * Seeds initial mock data if empty
 */
function seedInitialData(PDO $pdo) {
    $pdo->exec("INSERT INTO `agents` (`id`, `name`, `role`, `department`, `desk_x`, `desk_z`, `desk_rotation`, `status`, `current_task`, `avatar_color`, `model`, `temperature`, `system_prompt`, `action_count`, `token_usage`, `context_memory`) VALUES
    (1, 'Budi Santoso', 'Frontend Specialist', 'Frontend Engineering', -4.5, -2.5, 0, 'IDLE', 'Optimasi Three.js isometric rendering & shader performance', '#3b82f6', 'gemini-3-flash-preview', 0.6, 'Kamu adalah AI Agent Frontend Engineer yang ahli dalam UI 3D, WebGL, Three.js, dan Tailwind CSS. Fokus pada responsivitas dan visual fidelity.', 142, 48920, 12400),
    (2, 'Siti Nurhaliza', 'Backend Architect', 'Core Platform & API', -4.5, 2.5, 0, 'IDLE', 'Integrasi WebSocket stream & broker subagent delegation', '#10b981', 'gemini-3-flash-preview', 0.5, 'Kamu adalah AI Agent Backend Architect yang bertugas mendesain skema database relasional, API RESTful, dan real-time event pipeline berkecepatan tinggi.', 218, 95400, 38200),
    (3, 'Dimas Pratama', 'QA Automation Engineer', 'Quality Assurance', 4.5, -2.5, 3.14159, 'IDLE', 'Automated E2E multi-agent regression test suite', '#8b5cf6', 'gemini-3-flash-preview', 0.4, 'Kamu adalah AI Agent QA Engineer yang memverifikasi integritas sistem, mendeteksi bug fungsional, dan melakukan automated stress testing.', 85, 23150, 8192),
    (4, 'Maya Putri', 'AI & Research Scientist', 'Research & Intelligence', 4.5, 2.5, 3.14159, 'IDLE', 'Benchmarking context window efficiency pada LLM routing', '#f59e0b', 'claude-3-7-sonnet', 0.8, 'Kamu adalah AI Agent Researcher yang menganalisis efisiensi komputasi token LLM, context window retrieval, dan prompt engineering tingkat lanjut.', 173, 64200, 24500)");

    $pdo->exec("INSERT INTO `agent_configs` (`agent_id`, `functions_json`, `parameters_json`, `api_endpoint`) VALUES
    (1, '[\"web_search\", \"code_analysis\", \"file_io\"]', '{\"max_output_tokens\": 4096, \"top_p\": 0.95}', '/api/v1/agent/budi'),
    (2, '[\"database_query\", \"shell_execution\", \"file_io\"]', '{\"max_output_tokens\": 8192, \"top_p\": 0.9}', '/api/v1/agent/siti'),
    (3, '[\"shell_execution\", \"code_analysis\"]', '{\"max_output_tokens\": 4096, \"top_p\": 0.8}', '/api/v1/agent/dimas'),
    (4, '[\"web_search\", \"code_analysis\", \"knowledge_retrieval\"]', '{\"max_output_tokens\": 8192, \"top_p\": 0.95}', '/api/v1/agent/maya')");

    $pdo->exec("INSERT INTO `tasks` (`title`, `category`, `assigned_agent_id`, `status`, `priority`, `due_date`) VALUES
    ('Deploy v2.0 ke staging cluster XAMPP', 'deadline_dekat', 2, 'in_progress', 'urgent', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)),
    ('Fix memory leak pada Three.js texture disposal', 'deadline_dekat', 1, 'in_progress', 'high', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY)),
    ('Automasi coverage report Playwright 100%', 'deadline_dekat', 3, 'pending', 'high', DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY)),
    ('Review anggaran budget token mingguan ($500 limit)', 'nunggu_owner', 4, 'pending', 'high', DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY)),
    ('Approval eksekusi shell command sudo di worker node', 'nunggu_owner', 2, 'pending', 'urgent', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY)),
    ('Eksplorasi sound effects 8-bit untuk event agent (keyboard clatter, ping)', 'ide_nanti', 1, 'pending', 'low', DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY)),
    ('Integrasi Discord / Slack webhook untuk critical alerts', 'ide_nanti', 3, 'pending', 'medium', DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY)),
    ('Implementasi multi-floor virtual office (Elevator & Room switcher)', 'ide_nanti', 4, 'pending', 'low', DATE_ADD(CURRENT_DATE, INTERVAL 21 DAY))");

    $pdo->exec("INSERT INTO `agent_logs` (`agent_id`, `log_type`, `message`, `details_json`, `created_at`) VALUES
    (1, 'system', 'Agent Budi Santoso diinisialisasi pada Stasiun Frontend Engineering', '{\"status\": \"online\"}', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
    (1, 'tool_call', 'execute: npm run build -- --mode=production', '{\"tool\": \"shell_execution\", \"duration_ms\": 1420}', DATE_SUB(NOW(), INTERVAL 12 MINUTE)),
    (1, 'thought', 'Menganalisis bundle size: Three.js r128 terkompresi dengan baik, rendering 60 FPS stabil.', '{\"fps\": 60}', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
    (2, 'action', 'Mengkonfigurasi Server-Sent Events (SSE) stream endpoint untuk broadcast update state', '{\"channel\": \"agent_stream\"}', DATE_SUB(NOW(), INTERVAL 8 MINUTE)),
    (2, 'tool_call', 'db_query: SELECT COUNT(*) FROM agents WHERE status = \"KERJA\"', '{\"records_affected\": 3}', DATE_SUB(NOW(), INTERVAL 6 MINUTE)),
    (4, 'thought', 'Evaluasi perbandingan token throughput antara gemini-2.5-flash dan pro untuk high-concurrency dispatch.', '{\"savings\": \"42%\"}', DATE_SUB(NOW(), INTERVAL 4 MINUTE)),
    (4, 'tool_call', 'web_search: \"Antigravity multi-agent communication protocol latency\"', '{\"results_count\": 8}', DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
    (3, 'action', 'Menunggu pemicu pengujian integrasi selanjutnya (Status: IDLE di stasiun QA)', '{\"idle_since\": \"10m\"}', DATE_SUB(NOW(), INTERVAL 1 MINUTE))");
}

/**
 * Standard JSON Response Sender
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Get Request JSON Body
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Get setting value with fallback
 */
function getSystemSetting(PDO $pdo, string $key, string $default = ''): string {
    // Check environment variable first
    $envKey = strtoupper($key);
    $envVal = getenv($envKey);
    if ($envVal !== false && $envVal !== '') {
        return $envVal;
    }

    try {
        $stmt = $pdo->prepare("SELECT `key_value` FROM `system_settings` WHERE `key_name` = ?");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        return ($val !== false && $val !== null) ? (string)$val : $default;
    } catch (Exception $e) {
        return $default;
    }
}

/**
 * Set setting value
 */
function setSystemSetting(PDO $pdo, string $key, string $value): bool {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO `system_settings` (`key_name`, `key_value`) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE `key_value` = VALUES(`key_value`)
        ");
        return $stmt->execute([$key, $value]);
    } catch (Exception $e) {
        return false;
    }
}

