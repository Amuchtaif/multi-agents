<?php
/**
 * Logs API - Real-Time Activity Feed & Filter
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetLogs($pdo);
        break;

    case 'POST':
        handleCreateLog($pdo);
        break;

    case 'DELETE':
        handleClearLogs($pdo);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve chronological activity logs with optional agent filter
 */
function handleGetLogs(PDO $pdo) {
    $agentId = isset($_GET['agent_id']) && $_GET['agent_id'] !== 'all' && $_GET['agent_id'] !== '' ? (int)$_GET['agent_id'] : null;
    $logType = isset($_GET['type']) ? trim($_GET['type']) : null;
    $sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;
    $limit = isset($_GET['limit']) ? min(200, max(1, (int)$_GET['limit'])) : 60;

    $sql = "
        SELECT l.*, 
               COALESCE(a.name, 'Sistem Antigravity') AS agent_name, 
               COALESCE(a.role, 'System Orchestrator') AS agent_role, 
               COALESCE(a.avatar_color, '#64748b') AS agent_avatar_color
        FROM agent_logs l
        LEFT JOIN agents a ON l.agent_id = a.id
        WHERE 1=1
    ";

    $params = [];

    if ($agentId !== null) {
        $sql .= " AND l.agent_id = ?";
        $params[] = $agentId;
    }

    if (!empty($logType) && in_array($logType, ['action', 'tool_call', 'thought', 'communication', 'system'])) {
        $sql .= " AND l.log_type = ?";
        $params[] = $logType;
    }

    if ($sinceId > 0) {
        $sql .= " AND l.id > ?";
        $params[] = $sinceId;
    }

    $sql .= " ORDER BY l.id DESC LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll();

    // Decode details_json
    foreach ($logs as &$log) {
        $log['details'] = json_decode($log['details_json'] ?? '{}', true) ?: (object)[];
    }

    sendJsonResponse([
        'success' => true,
        'count' => count($logs),
        'data' => $logs
    ]);
}

/**
 * POST: Add new log event
 */
function handleCreateLog(PDO $pdo) {
    $input = getJsonInput();

    $agentId = !empty($input['agent_id']) ? (int)$input['agent_id'] : null;
    $logType = in_array($input['log_type'] ?? '', ['action', 'tool_call', 'thought', 'communication', 'system']) ? $input['log_type'] : 'action';
    $message = trim($input['message'] ?? '');
    $details = isset($input['details']) ? json_encode($input['details'], JSON_UNESCAPED_UNICODE) : null;

    if (empty($message)) {
        sendJsonResponse(['success' => false, 'error' => 'Pesan log wajib diisi'], 422);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, ?, ?, ?)");
        $stmt->execute([$agentId, $logType, $message, $details]);
        $logId = (int)$pdo->lastInsertId();

        // Increment action_count for the agent if log_type is action or tool_call
        if ($agentId && in_array($logType, ['action', 'tool_call'])) {
            $pdo->prepare("UPDATE agents SET action_count = action_count + 1 WHERE id = ?")->execute([$agentId]);
        }

        // Fetch log entry
        $fetch = $pdo->prepare("
            SELECT l.*, 
                   COALESCE(a.name, 'Sistem Antigravity') AS agent_name, 
                   COALESCE(a.role, 'System Orchestrator') AS agent_role, 
                   COALESCE(a.avatar_color, '#64748b') AS agent_avatar_color
            FROM agent_logs l
            LEFT JOIN agents a ON l.agent_id = a.id
            WHERE l.id = ?
        ");
        $fetch->execute([$logId]);
        $log = $fetch->fetch();
        $log['details'] = json_decode($log['details_json'] ?? '{}', true);

        sendJsonResponse([
            'success' => true,
            'message' => 'Log berhasil dicatat',
            'data' => $log
        ], 201);

    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal mencatat log: ' . $e->getMessage()], 500);
    }
}

/**
 * DELETE: Clear logs
 */
function handleClearLogs(PDO $pdo) {
    $agentId = isset($_GET['agent_id']) ? (int)$_GET['agent_id'] : null;

    try {
        if ($agentId) {
            $stmt = $pdo->prepare("DELETE FROM agent_logs WHERE agent_id = ?");
            $stmt->execute([$agentId]);
            $msg = "Log agent ID {$agentId} dibersihkan";
        } else {
            $pdo->exec("TRUNCATE TABLE agent_logs");
            $msg = "Semua log aktivitas dibersihkan";
        }

        sendJsonResponse([
            'success' => true,
            'message' => $msg
        ]);

    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal membersihkan log: ' . $e->getMessage()], 500);
    }
}

