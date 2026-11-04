-- Kantor Virtual HQ: Database Schema & Seed Data
-- 3D Isometric AI Agent Monitoring & Orchestration Dashboard

CREATE DATABASE IF NOT EXISTS `kantor_virtual_hq` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `kantor_virtual_hq`;

-- 1. Agents Table
CREATE TABLE IF NOT EXISTS `agents` (
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
    `model` VARCHAR(50) DEFAULT 'gemini-2.5-flash',
    `temperature` FLOAT DEFAULT 0.7,
    `system_prompt` TEXT,
    `action_count` INT DEFAULT 0,
    `token_usage` INT DEFAULT 0,
    `context_memory` INT DEFAULT 4096,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Agent Configs Table (Parameters, tools & functions)
CREATE TABLE IF NOT EXISTS `agent_configs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `agent_id` INT NOT NULL,
    `functions_json` TEXT,
    `parameters_json` TEXT,
    `api_endpoint` VARCHAR(255) DEFAULT '/api/v1/agent',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_agent_config` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `category` ENUM('deadline_dekat', 'nunggu_owner', 'ide_nanti') NOT NULL DEFAULT 'ide_nanti',
    `assigned_agent_id` INT NULL,
    `status` ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `due_date` DATE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_task_agent` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Agent Activity Logs Table
CREATE TABLE IF NOT EXISTS `agent_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `agent_id` INT NULL,
    `log_type` ENUM('action', 'tool_call', 'thought', 'communication', 'system') NOT NULL DEFAULT 'action',
    `message` TEXT NOT NULL,
    `details_json` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_log_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed Default Agents
INSERT INTO `agents` (`id`, `name`, `role`, `department`, `desk_x`, `desk_z`, `desk_rotation`, `status`, `current_task`, `avatar_color`, `model`, `temperature`, `system_prompt`, `action_count`, `token_usage`, `context_memory`) VALUES
(1, 'Budi Santoso', 'Frontend Specialist', 'Frontend Engineering', -4.5, -2.5, 0, 'KERJA', 'Optimasi Three.js isometric rendering & shader performance', '#3b82f6', 'gemini-2.5-flash', 0.6, 'Kamu adalah AI Agent Frontend Engineer yang ahli dalam UI 3D, WebGL, Three.js, dan Tailwind CSS. Fokus pada responsivitas dan visual fidelity.', 142, 48920, 12400),
(2, 'Siti Nurhaliza', 'Backend Architect', 'Core Platform & API', -4.5, 2.5, 0, 'KERJA', 'Integrasi WebSocket stream & broker subagent delegation', '#10b981', 'gemini-2.5-pro', 0.5, 'Kamu adalah AI Agent Backend Architect yang bertugas mendesain skema database relasional, API RESTful, dan real-time event pipeline berkecepatan tinggi.', 218, 95400, 38200),
(3, 'Dimas Pratama', 'QA Automation Engineer', 'Quality Assurance', 4.5, -2.5, 3.14159, 'IDLE', 'Automated E2E multi-agent regression test suite', '#8b5cf6', 'gemini-2.5-flash', 0.4, 'Kamu adalah AI Agent QA Engineer yang memverifikasi integritas sistem, mendeteksi bug fungsional, dan melakukan automated stress testing.', 85, 23150, 8192),
(4, 'Maya Putri', 'AI & Research Scientist', 'Research & Intelligence', 4.5, 2.5, 3.14159, 'KERJA', 'Benchmarking context window efficiency pada LLM routing', '#f59e0b', 'claude-3-7-sonnet', 0.8, 'Kamu adalah AI Agent Researcher yang menganalisis efisiensi komputasi token LLM, context window retrieval, dan prompt engineering tingkat lanjut.', 173, 64200, 24500);

-- 6. Seed Agent Configurations
INSERT INTO `agent_configs` (`agent_id`, `functions_json`, `parameters_json`, `api_endpoint`) VALUES
(1, '["web_search", "code_analysis", "file_io"]', '{"max_output_tokens": 4096, "top_p": 0.95}', '/api/v1/agent/budi'),
(2, '["database_query", "shell_execution", "file_io"]', '{"max_output_tokens": 8192, "top_p": 0.9}', '/api/v1/agent/siti'),
(3, '["shell_execution", "code_analysis"]', '{"max_output_tokens": 4096, "top_p": 0.8}', '/api/v1/agent/dimas'),
(4, '["web_search", "code_analysis", "knowledge_retrieval"]', '{"max_output_tokens": 8192, "top_p": 0.95}', '/api/v1/agent/maya');

-- 7. Seed Categorized Tasks
INSERT INTO `tasks` (`title`, `category`, `assigned_agent_id`, `status`, `priority`, `due_date`) VALUES
('Deploy v2.0 ke staging cluster XAMPP', 'deadline_dekat', 2, 'in_progress', 'urgent', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)),
('Fix memory leak pada Three.js texture disposal', 'deadline_dekat', 1, 'in_progress', 'high', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY)),
('Automasi coverage report Playwright 100%', 'deadline_dekat', 3, 'pending', 'high', DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY)),
('Review anggaran budget token mingguan ($500 limit)', 'nunggu_owner', 4, 'pending', 'high', DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY)),
('Approval eksekusi shell command sudo di worker node', 'nunggu_owner', 2, 'pending', 'urgent', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY)),
('Eksplorasi sound effects 8-bit untuk event agent (keyboard clatter, ping)', 'ide_nanti', 1, 'pending', 'low', DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY)),
('Integrasi Discord / Slack webhook untuk critical alerts', 'ide_nanti', 3, 'pending', 'medium', DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY)),
('Implementasi multi-floor virtual office (Elevator & Room switcher)', 'ide_nanti', 4, 'pending', 'low', DATE_ADD(CURRENT_DATE, INTERVAL 21 DAY));

-- 8. Seed Initial Activity Logs
INSERT INTO `agent_logs` (`agent_id`, `log_type`, `message`, `details_json`, `created_at`) VALUES
(1, 'system', 'Agent Budi Santoso diinisialisasi pada Stasiun Frontend Engineering', '{"status": "online"}', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
(1, 'tool_call', 'execute: npm run build -- --mode=production', '{"tool": "shell_execution", "duration_ms": 1420}', DATE_SUB(NOW(), INTERVAL 12 MINUTE)),
(1, 'thought', 'Menganalisis bundle size: Three.js r128 terkompresi dengan baik, rendering 60 FPS stabil.', '{"fps": 60}', DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(2, 'action', 'Mengkonfigurasi Server-Sent Events (SSE) stream endpoint untuk broadcast update state', '{"channel": "agent_stream"}', DATE_SUB(NOW(), INTERVAL 8 MINUTE)),
(2, 'tool_call', 'db_query: SELECT COUNT(*) FROM agents WHERE status = "KERJA"', '{"records_affected": 3}', DATE_SUB(NOW(), INTERVAL 6 MINUTE)),
(4, 'thought', 'Evaluasi perbandingan token throughput antara gemini-2.5-flash dan pro untuk high-concurrency dispatch.', '{"savings": "42%"}', DATE_SUB(NOW(), INTERVAL 4 MINUTE)),
(4, 'tool_call', 'web_search: "Antigravity multi-agent communication protocol latency"', '{"results_count": 8}', DATE_SUB(NOW(), INTERVAL 2 MINUTE)),
(3, 'action', 'Menunggu pemicu pengujian integrasi selanjutnya (Status: IDLE di stasiun QA)', '{"idle_since": "10m"}', DATE_SUB(NOW(), INTERVAL 1 MINUTE));

