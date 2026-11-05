<?php
/**
 * Scheduled Tasks & Recurring Jobs API (Autonomous Cron)
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

switch ($method) {
    case 'GET':
        handleGetSchedules($pdo);
        break;

    case 'POST':
        $action = $input['action'] ?? ($_GET['action'] ?? '');
        if ($action === 'run_now') {
            handleRunScheduleNow($pdo, $input);
            break;
        }
        if ($action === 'run_due') {
            handleRunDueSchedules($pdo);
            break;
        }
        if ($action === 'preset') {
            handleCreatePresetSchedule($pdo, $input);
            break;
        }
        handleCreateSchedule($pdo, $input);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdateSchedule($pdo, $input);
        break;

    case 'DELETE':
        handleDeleteSchedule($pdo);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: List all scheduled jobs
 */
function handleGetSchedules(PDO $pdo) {
    $stmt = $pdo->query("
        SELECT s.*, 
               COALESCE(a.name, 'Otomatis Sesuai Departemen') as agent_name,
               COALESCE(a.role, '') as agent_role,
               COALESCE(a.avatar_color, '#6366f1') as agent_avatar_color
        FROM scheduled_tasks s
        LEFT JOIN agents a ON s.assigned_agent_id = a.id
        ORDER BY s.is_active DESC, s.next_run_at ASC, s.id DESC
    ");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate nice relative time descriptions
    foreach ($items as &$it) {
        $it['schedule_display'] = formatScheduleDisplay($it['schedule_type'], $it['schedule_time'], $it['day_of_week']);
    }

    sendJsonResponse([
        'success' => true,
        'total' => count($items),
        'data' => $items
    ]);
}

/**
 * Helper: Format schedule string
 */
function formatScheduleDisplay(string $type, string $time, ?int $dow): string {
    $timeSnippet = substr($time, 0, 5);
    $days = [1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu', 4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu', 7 => 'Minggu'];

    switch ($type) {
        case 'weekdays':
            return "Setiap Hari Kerja (Sen-Jum), {$timeSnippet} WIB";
        case 'daily':
            return "Setiap Hari, {$timeSnippet} WIB";
        case 'weekly':
            $dayName = $days[$dow] ?? 'Senin';
            return "Setiap {$dayName}, {$timeSnippet} WIB";
        case 'hourly':
            return "Setiap 1 Jam Sekali";
        default:
            return "{$timeSnippet} WIB";
    }
}

/**
 * Helper: Compute next run datetime
 */
function calculateNextRun(string $type, string $time, ?int $dow): string {
    $now = new DateTime();
    $timeParts = explode(':', $time);
    $targetHour = (int)($timeParts[0] ?? 8);
    $targetMinute = (int)($timeParts[1] ?? 30);

    $next = new DateTime();
    $next->setTime($targetHour, $targetMinute, 0);

    if ($type === 'hourly') {
        $next = (new DateTime())->modify('+1 hour');
        return $next->format('Y-m-d H:i:s');
    }

    if ($type === 'daily') {
        if ($next <= $now) {
            $next->modify('+1 day');
        }
        return $next->format('Y-m-d H:i:s');
    }

    if ($type === 'weekdays') {
        if ($next <= $now) {
            $next->modify('+1 day');
        }
        while ((int)$next->format('N') > 5) {
            $next->modify('+1 day');
        }
        return $next->format('Y-m-d H:i:s');
    }

    if ($type === 'weekly') {
        $targetDow = $dow ?: 5; // Default Friday
        $currentDow = (int)$now->format('N');
        $daysUntil = ($targetDow - $currentDow + 7) % 7;
        if ($daysUntil === 0 && $next <= $now) {
            $daysUntil = 7;
        }
        $next->modify("+{$daysUntil} days");
        return $next->format('Y-m-d H:i:s');
    }

    return (new DateTime())->modify('+1 day')->format('Y-m-d H:i:s');
}

/**
 * POST: Create Schedule
 */
function handleCreateSchedule(PDO $pdo, array $input) {
    $title = trim($input['title'] ?? '');
    $agentId = !empty($input['assigned_agent_id']) ? (int)$input['assigned_agent_id'] : null;
    $type = in_array($input['schedule_type'] ?? '', ['daily', 'weekdays', 'weekly', 'hourly']) ? $input['schedule_type'] : 'daily';
    $time = !empty($input['schedule_time']) ? trim($input['schedule_time']) : '08:30:00';
    $dow = isset($input['day_of_week']) ? (int)$input['day_of_week'] : 1;
    $actionType = in_array($input['action_type'] ?? '', ['task', 'meeting', 'social_content']) ? $input['action_type'] : 'task';
    $instruction = trim($input['prompt_instruction'] ?? $title);

    if (empty($title)) {
        sendJsonResponse(['success' => false, 'error' => 'Judul jadwal wajib diisi'], 422);
    }

    $nextRun = calculateNextRun($type, $time, $dow);

    $stmt = $pdo->prepare("
        INSERT INTO scheduled_tasks (title, assigned_agent_id, schedule_type, schedule_time, day_of_week, action_type, prompt_instruction, next_run_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->execute([$title, $agentId, $type, $time, $dow, $actionType, $instruction, $nextRun]);
    $newId = (int)$pdo->lastInsertId();

    sendJsonResponse([
        'success' => true,
        'message' => "Jadwal automasi '{$title}' berhasil disimpan.",
        'data' => [
            'id' => $newId,
            'title' => $title,
            'next_run_at' => $nextRun
        ]
    ], 201);
}

/**
 * POST: Create Predefined Preset Schedule
 */
function handleCreatePresetSchedule(PDO $pdo, array $input) {
    $preset = trim($input['preset'] ?? '');

    $presets = [
        'tech_news' => [
            'title' => 'Rangkuman Berita Tech & AI Harian',
            'schedule_type' => 'weekdays',
            'schedule_time' => '08:30:00',
            'action_type' => 'task',
            'prompt_instruction' => 'Lakukan riset web dan rangkum 3 berita perkembangan AI, model LLM open-source terbaru, dan strategi implementasi teknis untuk tim engineering hari ini.',
            'role_match' => 'analis'
        ],
        'social_trends' => [
            'title' => 'Pemeriksaan Tren Topik & Ide Konten Sore',
            'schedule_type' => 'daily',
            'schedule_time' => '13:00:00',
            'action_type' => 'social_content',
            'prompt_instruction' => 'Analisis topik viral di media sosial hari ini, dan susun 1 skrip konten Instagram Reels serta Thread edukatif berkonversi tinggi.',
            'role_match' => 'media'
        ],
        'weekly_eval' => [
            'title' => 'Rapat Evaluasi Mingguan & Rekap Backlog',
            'schedule_type' => 'weekly',
            'schedule_time' => '16:00:00',
            'day_of_week' => 5, // Jumat
            'action_type' => 'meeting',
            'prompt_instruction' => 'Rapat evaluasi mingguan seluruh departemen: rekap deliverable yang telah selesai, hambatan teknis, dan perencanaan sprint berikutnya.',
            'role_match' => null
        ]
    ];

    if (!isset($presets[$preset])) {
        sendJsonResponse(['success' => false, 'error' => "Preset '{$preset}' tidak ditemukan."], 404);
    }

    $p = $presets[$preset];

    // Pick agent if role match exists
    $agentId = null;
    if (!empty($p['role_match'])) {
        $aStmt = $pdo->prepare("SELECT id FROM agents WHERE role LIKE ? OR department LIKE ? ORDER BY id ASC LIMIT 1");
        $aStmt->execute(['%' . $p['role_match'] . '%', '%' . $p['role_match'] . '%']);
        $agentId = $aStmt->fetchColumn() ?: null;
    }
    if (!$agentId) {
        $agentId = $pdo->query("SELECT id FROM agents ORDER BY id ASC LIMIT 1")->fetchColumn() ?: null;
    }

    $nextRun = calculateNextRun($p['schedule_type'], $p['schedule_time'], $p['day_of_week'] ?? 1);

    $stmt = $pdo->prepare("
        INSERT INTO scheduled_tasks (title, assigned_agent_id, schedule_type, schedule_time, day_of_week, action_type, prompt_instruction, next_run_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->execute([
        $p['title'],
        $agentId,
        $p['schedule_type'],
        $p['schedule_time'],
        $p['day_of_week'] ?? 1,
        $p['action_type'],
        $p['prompt_instruction'],
        $nextRun
    ]);

    sendJsonResponse([
        'success' => true,
        'message' => "Preset jadwal '{$p['title']}' berhasil diaktifkan!",
        'data' => ['id' => $pdo->lastInsertId(), 'title' => $p['title'], 'next_run_at' => $nextRun]
    ]);
}

/**
 * POST: Run Schedule Immediately (Force Execution)
 */
function handleRunScheduleNow(PDO $pdo, array $input) {
    $scheduleId = (int)($input['schedule_id'] ?? ($input['id'] ?? 0));
    if (!$scheduleId) {
        sendJsonResponse(['success' => false, 'error' => 'schedule_id diperlukan'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM scheduled_tasks WHERE id = ?");
    $stmt->execute([$scheduleId]);
    $schedule = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$schedule) {
        sendJsonResponse(['success' => false, 'error' => 'Jadwal tidak ditemukan'], 404);
    }

    $executionResult = triggerScheduleAction($pdo, $schedule);

    // Update last_run_at and compute new next_run_at
    $nextRun = calculateNextRun($schedule['schedule_type'], $schedule['schedule_time'], $schedule['day_of_week']);
    $pdo->prepare("UPDATE scheduled_tasks SET last_run_at = NOW(), next_run_at = ? WHERE id = ?")
        ->execute([$nextRun, $scheduleId]);

    sendJsonResponse([
        'success' => true,
        'message' => "Automasi '{$schedule['title']}' berhasil dieksekusi sekarang.",
        'data' => $executionResult,
        'next_run_at' => $nextRun
    ]);
}

/**
 * POST: Check and execute any schedules due now
 */
function handleRunDueSchedules(PDO $pdo) {
    $stmt = $pdo->query("
        SELECT * FROM scheduled_tasks 
        WHERE is_active = 1 AND next_run_at <= NOW()
        ORDER BY next_run_at ASC
    ");
    $dueSchedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $executed = [];
    foreach ($dueSchedules as $sch) {
        $res = triggerScheduleAction($pdo, $sch);
        $nextRun = calculateNextRun($sch['schedule_type'], $sch['schedule_time'], $sch['day_of_week']);
        $pdo->prepare("UPDATE scheduled_tasks SET last_run_at = NOW(), next_run_at = ? WHERE id = ?")
            ->execute([$nextRun, $sch['id']]);

        $executed[] = [
            'id' => $sch['id'],
            'title' => $sch['title'],
            'result' => $res,
            'next_run_at' => $nextRun
        ];
    }

    sendJsonResponse([
        'success' => true,
        'executed_count' => count($executed),
        'executed' => $executed
    ]);
}

/**
 * Dispatches the action corresponding to the scheduled job
 */
function triggerScheduleAction(PDO $pdo, array $schedule): array {
    $actionType = $schedule['action_type'];
    $title = $schedule['title'];
    $prompt = $schedule['prompt_instruction'];
    $agentId = $schedule['assigned_agent_id'];

    if (!$agentId) {
        $agentId = $pdo->query("SELECT id FROM agents ORDER BY id ASC LIMIT 1")->fetchColumn() ?: 1;
    }

    if ($actionType === 'task') {
        // Create backlog task and execute it
        $ins = $pdo->prepare("
            INSERT INTO tasks (title, category, assigned_agent_id, status, priority, due_date)
            VALUES (?, 'deadline_dekat', ?, 'in_progress', 'high', CURRENT_DATE)
        ");
        $ins->execute([$title, $agentId]);
        $taskId = (int)$pdo->lastInsertId();

        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
            ->execute([
                $agentId,
                "⏰ [CRON OTOMATIS] Menjalankan jadwal rutin: '{$title}' (Task #{$taskId})",
                json_encode(['schedule_id' => $schedule['id'], 'task_id' => $taskId])
            ]);

        try {
            $taskRes = AIService::executeTask($pdo, $taskId);
            return ['type' => 'task', 'task_id' => $taskId, 'ai_result' => $taskRes];
        } catch (Exception $e) {
            return ['type' => 'task', 'task_id' => $taskId, 'error' => $e->getMessage()];
        }

    } elseif ($actionType === 'social_content') {
        // Generate social post
        $ins = $pdo->prepare("
            INSERT INTO content_calendar (title, platform, content_type, status, copywriting, hashtags, scheduled_at, assigned_agent_id)
            VALUES (?, 'instagram', 'reels', 'draft_selesai', ?, '#AutonomusAI #KantorVirtual #TechTrend', DATE_ADD(NOW(), INTERVAL 4 HOUR), ?)
        ");
        $ins->execute([$title, $prompt, $agentId]);
        $calId = (int)$pdo->lastInsertId();

        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
            ->execute([
                $agentId,
                "⏰ [CRON OTOMATIS] Draf konten terjadwal otomatis dirilis: '{$title}'",
                json_encode(['schedule_id' => $schedule['id'], 'content_id' => $calId])
            ]);

        return ['type' => 'social_content', 'content_id' => $calId];

    } elseif ($actionType === 'meeting') {
        // Log automatic meeting call
        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'communication', ?, ?)")
            ->execute([
                $agentId,
                "⏰ [CRON OTOMATIS] Menginisiasi Rapat Evaluasi Rutin: '{$title}'",
                json_encode(['schedule_id' => $schedule['id'], 'topic' => $prompt])
            ]);

        return ['type' => 'meeting', 'topic' => $prompt];
    }

    return ['type' => 'unknown'];
}

/**
 * PUT: Update schedule or toggle active
 */
function handleUpdateSchedule(PDO $pdo, array $input) {
    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'id diperlukan'], 400);
    }

    $updates = [];
    $params = [];

    if (isset($input['is_active'])) {
        $updates[] = "is_active = ?";
        $params[] = (int)$input['is_active'];
    }
    if (isset($input['title'])) {
        $updates[] = "title = ?";
        $params[] = trim($input['title']);
    }
    if (isset($input['schedule_time'])) {
        $updates[] = "schedule_time = ?";
        $params[] = trim($input['schedule_time']);
    }

    if (empty($updates)) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada field yang diubah'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE scheduled_tasks SET " . implode(', ', $updates) . " WHERE id = ?";
    $pdo->prepare($sql)->execute($params);

    sendJsonResponse([
        'success' => true,
        'message' => 'Jadwal automasi berhasil diperbarui'
    ]);
}

/**
 * DELETE: Delete schedule
 */
function handleDeleteSchedule(PDO $pdo) {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'id diperlukan'], 400);
    }

    $pdo->prepare("DELETE FROM scheduled_tasks WHERE id = ?")->execute([$id]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Jadwal automasi berhasil dihapus'
    ]);
}

