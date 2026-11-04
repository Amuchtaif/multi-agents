<?php
/**
 * Real AI Execution API Endpoint
 * Kantor Virtual HQ
 * Triggers task execution or direct instruction via Real LLM
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGetTaskResult($pdo);
} elseif ($method === 'POST') {
    handleExecute($pdo);
} else {
    sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve AI Result of a specific task
 */
function handleGetTaskResult(PDO $pdo) {
    $taskId = isset($_GET['task_id']) ? (int)$_GET['task_id'] : 0;
    if (!$taskId) {
        sendJsonResponse(['success' => false, 'error' => 'Parameter task_id wajib disertakan'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT t.*, 
               COALESCE(a.name, 'Unassigned') as agent_name, 
               COALESCE(a.role, '') as agent_role,
               COALESCE(a.avatar_color, '#3b82f6') as agent_avatar_color
        FROM tasks t
        LEFT JOIN agents a ON t.assigned_agent_id = a.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();

    if (!$task) {
        sendJsonResponse(['success' => false, 'error' => 'Tugas tidak ditemukan'], 404);
    }

    sendJsonResponse([
        'success' => true,
        'data' => $task
    ]);
}

/**
 * POST: Execute Task or Dispatch Prompt
 */
function handleExecute(PDO $pdo) {
    $input = getJsonInput();
    $action = $input['action'] ?? 'execute_task';

    try {
        if ($action === 'execute_task') {
            $taskId = (int)($input['task_id'] ?? 0);
            $forceAgentId = !empty($input['agent_id']) ? (int)$input['agent_id'] : null;

            if (!$taskId) {
                sendJsonResponse(['success' => false, 'error' => 'task_id wajib diisi'], 400);
            }

            $result = AIService::executeTask($pdo, $taskId, $forceAgentId);

            sendJsonResponse([
                'success' => true,
                'message' => "Tugas berhasil diselesaikan oleh {$result['agent_name']}",
                'data' => $result
            ]);

        } elseif ($action === 'dispatch_prompt') {
            $agentId = (int)($input['agent_id'] ?? 0);
            $prompt = trim($input['prompt'] ?? '');

            if (!$agentId || empty($prompt)) {
                sendJsonResponse(['success' => false, 'error' => 'agent_id dan prompt wajib diisi'], 400);
            }

            $result = AIService::dispatchPrompt($pdo, $agentId, $prompt);

            sendJsonResponse([
                'success' => true,
                'message' => "Respon diterima dari {$result['agent_name']}",
                'data' => $result
            ]);

        } else {
            sendJsonResponse(['success' => false, 'error' => "Action '{$action}' tidak dikenal"], 400);
        }

    } catch (Exception $e) {
        sendJsonResponse([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
}

