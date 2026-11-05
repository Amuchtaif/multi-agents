<?php
/**
 * Tasks API - Backlog & Task Management
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

switch ($method) {
    case 'GET':
        handleGetTasks($pdo);
        break;

    case 'POST':
        $action = $input['action'] ?? ($_GET['action'] ?? '');
        if ($action === 'delete_all') {
            handleDeleteAllTasks($pdo);
            break;
        }
        if ($action === 'approve') {
            handleApproveTask($pdo, $input);
            break;
        }
        if ($action === 'request_revision') {
            handleRequestRevision($pdo, $input);
            break;
        }
        if ($action === 'reject') {
            handleRejectTask($pdo, $input);
            break;
        }
        handleCreateTask($pdo);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdateTask($pdo);
        break;

    case 'DELETE':
        $action = $_GET['action'] ?? ($input['action'] ?? '');
        $id = $_GET['id'] ?? ($input['id'] ?? null);
        if ($action === 'all' || $action === 'delete_all' || $id === 'all') {
            handleDeleteAllTasks($pdo);
            break;
        }
        handleDeleteTask($pdo);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve tasks grouped by category
 */
function handleGetTasks(PDO $pdo) {
    $agentId = isset($_GET['agent_id']) ? (int)$_GET['agent_id'] : null;

    $sql = "
        SELECT t.*, 
               a.name AS agent_name, 
               a.role AS agent_role, 
               a.avatar_color AS agent_avatar_color,
               a.status AS agent_status
        FROM tasks t
        LEFT JOIN agents a ON t.assigned_agent_id = a.id
    ";

    $params = [];
    if ($agentId) {
        $sql .= " WHERE t.assigned_agent_id = ?";
        $params[] = $agentId;
    }

    $sql .= " ORDER BY t.status ASC, FIELD(t.priority, 'urgent', 'high', 'medium', 'low'), t.due_date ASC, t.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $tasks = $stmt->fetchAll();

    // Group by category
    $categories = [
        'deadline_dekat' => [],
        'nunggu_owner' => [],
        'ide_nanti' => []
    ];

    $counts = [
        'total' => count($tasks),
        'pending' => 0,
        'completed' => 0,
        'deadline_dekat' => 0,
        'nunggu_owner' => 0,
        'ide_nanti' => 0
    ];

    foreach ($tasks as $task) {
        $cat = $task['category'];
        if (!isset($categories[$cat])) {
            $categories[$cat] = [];
        }
        $categories[$cat][] = $task;

        if ($task['status'] === 'completed') {
            $counts['completed']++;
        } else {
            $counts['pending']++;
        }

        if (isset($counts[$cat])) {
            $counts[$cat]++;
        }
    }

    sendJsonResponse([
        'success' => true,
        'counts' => $counts,
        'categories' => $categories,
        'data' => $tasks
    ]);
}

/**
 * POST: Create a new task
 */
function handleCreateTask(PDO $pdo) {
    $input = getJsonInput();

    $title = trim($input['title'] ?? '');
    $category = in_array($input['category'] ?? '', ['deadline_dekat', 'nunggu_owner', 'ide_nanti']) ? $input['category'] : 'ide_nanti';
    $assignedAgentId = !empty($input['assigned_agent_id']) ? (int)$input['assigned_agent_id'] : null;
    $priority = in_array($input['priority'] ?? '', ['low', 'medium', 'high', 'urgent']) ? $input['priority'] : 'medium';
    $status = in_array($input['status'] ?? '', ['pending', 'in_progress', 'completed']) ? $input['status'] : 'pending';
    $dueDate = !empty($input['due_date']) ? $input['due_date'] : date('Y-m-d', strtotime('+3 days'));

    if (empty($title)) {
        sendJsonResponse(['success' => false, 'error' => 'Judul tugas wajib diisi'], 422);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO tasks (title, category, assigned_agent_id, status, priority, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $category, $assignedAgentId, $status, $priority, $dueDate]);
        $taskId = (int)$pdo->lastInsertId();

        // If assigned to agent, update their current task and log
        if ($assignedAgentId) {
            $updAgent = $pdo->prepare("UPDATE agents SET current_task = ? WHERE id = ?");
            $updAgent->execute([$title, $assignedAgentId]);

            $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)");
            $logStmt->execute([
                $assignedAgentId,
                "Tugas baru didelegasikan: '{$title}' [Prioritas: " . strtoupper($priority) . "]",
                json_encode(['task_id' => $taskId, 'category' => $category, 'priority' => $priority])
            ]);
        }

        // Fetch newly created task with agent data
        $fetch = $pdo->prepare("
            SELECT t.*, a.name AS agent_name, a.role AS agent_role, a.avatar_color AS agent_avatar_color
            FROM tasks t
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            WHERE t.id = ?
        ");
        $fetch->execute([$taskId]);
        $task = $fetch->fetch();

        sendJsonResponse([
            'success' => true,
            'message' => 'Tugas berhasil dibuat',
            'data' => $task
        ], 201);

    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal membuat tugas: ' . $e->getMessage()], 500);
    }
}

/**
 * PUT/PATCH: Update task (status toggle, assignee, title, etc.)
 */
function handleUpdateTask(PDO $pdo) {
    $input = getJsonInput();
    $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);

    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'ID Tugas diperlukan'], 400);
    }

    $chk = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $chk->execute([$id]);
    $task = $chk->fetch();

    if (!$task) {
        sendJsonResponse(['success' => false, 'error' => 'Tugas tidak ditemukan'], 404);
    }

    $updates = [];
    $params = [];

    // Fields that can be updated
    $allowed = ['title', 'category', 'assigned_agent_id', 'status', 'priority', 'due_date'];

    foreach ($allowed as $f) {
        if (array_key_exists($f, $input)) {
            $val = $input[$f];
            if ($f === 'assigned_agent_id' && empty($val)) {
                $val = null;
            }
            $updates[] = "`{$f}` = ?";
            $params[] = $val;
        }
    }

    if (empty($updates)) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada field yang diperbarui'], 400);
    }

    try {
        $params[] = $id;
        $sql = "UPDATE tasks SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // If status changed to completed, update agent status & log
        if (isset($input['status']) && $input['status'] === 'completed' && $task['status'] !== 'completed') {
            if ($task['assigned_agent_id']) {
                $agentId = (int)$task['assigned_agent_id'];
                $pdo->prepare("UPDATE agents SET action_count = action_count + 1 WHERE id = ?")->execute([$agentId]);

                $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)");
                $logStmt->execute([
                    $agentId,
                    "Tugas selesai: '{$task['title']}'",
                    json_encode(['task_id' => $id, 'status' => 'completed'])
                ]);

                // Check if agent has other in-progress work
                $chkOther = $pdo->prepare("SELECT COUNT(*) FROM tasks WHERE assigned_agent_id = ? AND status = 'in_progress' AND id != ?");
                $chkOther->execute([$agentId, $id]);
                if (((int)$chkOther->fetchColumn()) === 0) {
                    $pdo->prepare("UPDATE agents SET status = 'IDLE', current_task = 'Standby (Tugas selesai)' WHERE id = ?")->execute([$agentId]);
                    $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'system', ?, ?)")->execute([
                        $agentId,
                        "☕ Seluruh tugas aktif selesai. Agent beralih ke status IDLE / Standby di Lounge.",
                        json_encode(['task_id' => $id, 'status' => 'IDLE', 'location' => 'lounge'])
                    ]);
                }
            }
        }

        // Fetch updated
        $fetch = $pdo->prepare("
            SELECT t.*, a.name AS agent_name, a.role AS agent_role, a.avatar_color AS agent_avatar_color
            FROM tasks t
            LEFT JOIN agents a ON t.assigned_agent_id = a.id
            WHERE t.id = ?
        ");
        $fetch->execute([$id]);
        $updatedTask = $fetch->fetch();

        sendJsonResponse([
            'success' => true,
            'message' => 'Tugas berhasil diperbarui',
            'data' => $updatedTask
        ]);

    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal memperbarui tugas: ' . $e->getMessage()], 500);
    }
}

/**
 * DELETE: Delete a task
 */
function handleDeleteTask(PDO $pdo) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        $input = getJsonInput();
        $id = isset($input['id']) ? (int)$input['id'] : null;
    }

    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'ID Tugas diperlukan'], 400);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->execute([$id]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Tugas berhasil dihapus'
        ]);

    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal menghapus tugas: ' . $e->getMessage()], 500);
    }
}

/**
 * DELETE: Delete all tasks from backlog
 */
function handleDeleteAllTasks(PDO $pdo) {
    try {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM tasks");
        $count = (int)$countStmt->fetchColumn();

        // 1. Delete all tasks from database
        $pdo->exec("DELETE FROM tasks");

        // 2. Reset agents current_task to Standby
        $pdo->exec("UPDATE agents SET current_task = 'Standby (Menunggu instruksi tugas)' WHERE status != 'PAUSED'");

        // 3. Log activity to system logs
        $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (NULL, 'system', ?, ?)");
        $logStmt->execute([
            "🗑️ Seluruh backlog penugasan ({$count} tugas) telah dibersihkan oleh pengguna.",
            json_encode(['action' => 'delete_all_tasks', 'count' => $count])
        ]);

        sendJsonResponse([
            'success' => true,
            'message' => "Semua backlog ({$count} tugas) berhasil dihapus",
            'deleted_count' => $count
        ]);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal menghapus semua tugas: ' . $e->getMessage()], 500);
    }
}

/**
 * POST: Approve task and trigger execution
 */
function handleApproveTask(PDO $pdo, array $input) {
    $taskId = (int)($input['task_id'] ?? ($input['id'] ?? 0));
    if (!$taskId) {
        sendJsonResponse(['success' => false, 'error' => 'task_id wajib diisi'], 400);
    }

    $tStmt = $pdo->prepare("
        SELECT t.*, a.name as agent_name 
        FROM tasks t 
        LEFT JOIN agents a ON t.assigned_agent_id = a.id 
        WHERE t.id = ?
    ");
    $tStmt->execute([$taskId]);
    $task = $tStmt->fetch();

    if (!$task) {
        sendJsonResponse(['success' => false, 'error' => 'Tugas tidak ditemukan'], 404);
    }

    $pdo->prepare("UPDATE tasks SET approval_status = 'approved', status = 'in_progress' WHERE id = ?")->execute([$taskId]);

    // Log approval
    $agentId = $task['assigned_agent_id'] ?: null;
    $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
        ->execute([
            $agentId,
            "✅ [OWNER APPROVAL] Tugas disetujui oleh Owner: '{$task['title']}'. Agent segera melanjutkan eksekusi.",
            json_encode(['task_id' => $taskId, 'approval' => 'approved'])
        ]);

    // Execute via AIService
    require_once __DIR__ . '/ai_service.php';
    try {
        $execResult = AIService::executeTask($pdo, $taskId);
        sendJsonResponse([
            'success' => true,
            'message' => "Tugas disetujui dan telah diselesaikan oleh {$execResult['agent_name']}",
            'data' => $execResult
        ]);
    } catch (Exception $e) {
        sendJsonResponse([
            'success' => true,
            'message' => "Tugas disetujui. Agen telah memulai proses pengerjaan (Antrean).",
            'task_id' => $taskId
        ]);
    }
}

/**
 * POST: Request revision from agent with owner notes
 */
function handleRequestRevision(PDO $pdo, array $input) {
    $taskId = (int)($input['task_id'] ?? ($input['id'] ?? 0));
    $notes = trim($input['notes'] ?? ($input['revision_notes'] ?? ''));

    if (!$taskId) {
        sendJsonResponse(['success' => false, 'error' => 'task_id wajib diisi'], 400);
    }

    if (empty($notes)) {
        sendJsonResponse(['success' => false, 'error' => 'Catatan revisi wajib diisi agar agent tahu apa yang perlu diperbaiki'], 422);
    }

    $tStmt = $pdo->prepare("
        SELECT t.*, a.name as agent_name 
        FROM tasks t 
        LEFT JOIN agents a ON t.assigned_agent_id = a.id 
        WHERE t.id = ?
    ");
    $tStmt->execute([$taskId]);
    $task = $tStmt->fetch();

    if (!$task) {
        sendJsonResponse(['success' => false, 'error' => 'Tugas tidak ditemukan'], 404);
    }

    $pdo->prepare("UPDATE tasks SET approval_status = 'changes_requested', revision_notes = ?, status = 'pending' WHERE id = ?")
        ->execute([$notes, $taskId]);

    $agentId = $task['assigned_agent_id'] ?: null;
    $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
        ->execute([
            $agentId,
            "✏️ [MINTA REVISI] Owner memberikan catatan revisi pada '{$task['title']}': \"{$notes}\"",
            json_encode(['task_id' => $taskId, 'revision_notes' => $notes])
        ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Catatan revisi berhasil dikirim ke Agent. Agent siap melakukan perbaikan.',
        'data' => ['task_id' => $taskId, 'revision_notes' => $notes]
    ]);
}

/**
 * POST: Reject task
 */
function handleRejectTask(PDO $pdo, array $input) {
    $taskId = (int)($input['task_id'] ?? ($input['id'] ?? 0));
    $reason = trim($input['reason'] ?? 'Dibatalkan oleh Owner');

    if (!$taskId) {
        sendJsonResponse(['success' => false, 'error' => 'task_id wajib diisi'], 400);
    }

    $tStmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
    $tStmt->execute([$taskId]);
    $task = $tStmt->fetch();

    if (!$task) {
        sendJsonResponse(['success' => false, 'error' => 'Tugas tidak ditemukan'], 404);
    }

    $pdo->prepare("UPDATE tasks SET approval_status = 'rejected', status = 'completed', result_text = ? WHERE id = ?")
        ->execute(["[DITOLAK OWNER] Alasan: {$reason}", $taskId]);

    $agentId = $task['assigned_agent_id'] ?: null;
    $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
        ->execute([
            $agentId,
            "❌ [TUGAS DITOLAK] Owner menolak tugas: '{$task['title']}'. Alasan: {$reason}",
            json_encode(['task_id' => $taskId, 'reason' => $reason])
        ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Tugas telah ditolak dan dibatalkan.',
        'task_id' => $taskId
    ]);
}

