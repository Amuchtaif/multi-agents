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
        if (isset($input['action']) && $input['action'] === 'delete_all') {
            handleDeleteAllTasks($pdo);
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

        // If status changed to completed, optionally reward agent and log
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

