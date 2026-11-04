<?php
/**
 * Agents API - CRUD Operations & Lifecycle Management
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

switch ($method) {
    case 'GET':
        handleGetAgents($pdo);
        break;

    case 'POST':
        if (isset($input['action']) && $input['action'] === 'bulk_status') {
            handleBulkStatusAgents($pdo, $input);
            break;
        }
        if (isset($input['action']) && $input['action'] === 'delete_all') {
            handleDeleteAllAgents($pdo);
            break;
        }
        handleCreateAgent($pdo, $input);
        break;

    case 'PUT':
    case 'PATCH':
        if (isset($input['action']) && $input['action'] === 'bulk_status') {
            handleBulkStatusAgents($pdo, $input);
            break;
        }
        handleUpdateAgent($pdo, $input);
        break;

    case 'DELETE':
        $action = $_GET['action'] ?? ($input['action'] ?? '');
        if ($action === 'all' || (isset($_GET['id']) && $_GET['id'] === 'all') || (isset($input['id']) && $input['id'] === 'all')) {
            handleDeleteAllAgents($pdo);
            break;
        }
        handleDeleteAgent($pdo, $input);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve list of all agents with configurations and tasks
 */
function handleGetAgents(PDO $pdo) {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("
            SELECT a.*, 
                   c.functions_json, c.parameters_json, c.api_endpoint,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id AND t.status != 'completed') AS pending_tasks_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id) AS total_tasks_count
            FROM agents a
            LEFT JOIN agent_configs c ON a.id = c.agent_id
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $agent = $stmt->fetch();

        if (!$agent) {
            sendJsonResponse(['success' => false, 'error' => 'Agent not found'], 404);
        }

        $agent['functions'] = json_decode($agent['functions_json'] ?? '[]', true) ?: [];
        $agent['parameters'] = json_decode($agent['parameters_json'] ?? '{}', true) ?: (object)[];

        sendJsonResponse(['success' => true, 'data' => $agent]);
    } else {
        $stmt = $pdo->query("
            SELECT a.*, 
                   c.functions_json, c.parameters_json, c.api_endpoint,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id AND t.status != 'completed') AS pending_tasks_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id) AS total_tasks_count
            FROM agents a
            LEFT JOIN agent_configs c ON a.id = c.agent_id
            ORDER BY a.id ASC
        ");
        $agents = $stmt->fetchAll();

        foreach ($agents as &$agent) {
            $agent['functions'] = json_decode($agent['functions_json'] ?? '[]', true) ?: [];
            $agent['parameters'] = json_decode($agent['parameters_json'] ?? '{}', true) ?: (object)[];
        }

        sendJsonResponse([
            'success' => true,
            'total' => count($agents),
            'data' => $agents
        ]);
    }
}

/**
 * POST: Create a new AI Agent with 3D desk positioning & configurations
 */
function handleCreateAgent(PDO $pdo, ?array $input = null) {
    if ($input === null) $input = getJsonInput();

    $name = trim($input['name'] ?? '');
    $role = trim($input['role'] ?? '');
    $department = trim($input['department'] ?? 'General Engineering');
    $model = trim($input['model'] ?? 'gemini-3-flash-preview');
    $temperature = isset($input['temperature']) ? (float)$input['temperature'] : 0.7;
    $systemPrompt = trim($input['system_prompt'] ?? "Kamu adalah AI Agent {$name} ({$role}). Lakukan tugas analitis dan kolaborasi secara mandiri.");
    $avatarColor = trim($input['avatar_color'] ?? '#3b82f6');
    $status = in_array($input['status'] ?? '', ['KERJA', 'IDLE', 'PAUSED']) ? $input['status'] : 'IDLE';
    $currentTask = trim($input['current_task'] ?? 'Menunggu penugasan');
    $functions = $input['functions'] ?? ['web_search', 'code_analysis'];
    $parameters = $input['parameters'] ?? ['max_output_tokens' => 4096, 'top_p' => 0.95];

    if (empty($name) || empty($role)) {
        sendJsonResponse(['success' => false, 'error' => 'Nama agent dan Role wajib diisi'], 422);
    }

    // Auto calculate desk coordinate if not explicitly provided
    $deskX = isset($input['desk_x']) && $input['desk_x'] !== '' ? (float)$input['desk_x'] : null;
    $deskZ = isset($input['desk_z']) && $input['desk_z'] !== '' ? (float)$input['desk_z'] : null;
    $deskRotation = isset($input['desk_rotation']) ? (float)$input['desk_rotation'] : 0.0;

    if ($deskX === null || $deskZ === null) {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM agents");
        $idx = (int)$countStmt->fetchColumn();

        // Calculate a desk grid spot in the office
        $stationCoords = [
            [-4.5, -2.5, 0],
            [-4.5, 2.5, 0],
            [4.5, -2.5, M_PI],
            [4.5, 2.5, M_PI],
            [-1.5, -2.5, 0],
            [-1.5, 2.5, 0],
            [1.5, -2.5, M_PI],
            [1.5, 2.5, M_PI],
            [-4.5, 0, 0],
            [4.5, 0, M_PI],
            [-1.5, 0, 0],
            [1.5, 0, M_PI],
        ];

        $spot = $stationCoords[$idx % count($stationCoords)];
        $deskX = $spot[0];
        $deskZ = $spot[1];
        $deskRotation = $spot[2];
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO agents 
            (name, role, department, desk_x, desk_z, desk_rotation, status, current_task, avatar_color, model, temperature, system_prompt, action_count, token_usage, context_memory)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 4096)
        ");
        $stmt->execute([
            $name, $role, $department, $deskX, $deskZ, $deskRotation, $status, $currentTask, $avatarColor, $model, $temperature, $systemPrompt
        ]);

        $agentId = (int)$pdo->lastInsertId();

        // Insert agent config
        $cfgStmt = $pdo->prepare("
            INSERT INTO agent_configs (agent_id, functions_json, parameters_json, api_endpoint)
            VALUES (?, ?, ?, ?)
        ");
        $endpoint = '/api/v1/agent/' . strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
        $cfgStmt->execute([
            $agentId,
            json_encode($functions, JSON_UNESCAPED_UNICODE),
            json_encode($parameters, JSON_UNESCAPED_UNICODE),
            $endpoint
        ]);

        // Insert system activity log
        $logStmt = $pdo->prepare("
            INSERT INTO agent_logs (agent_id, log_type, message, details_json)
            VALUES (?, 'system', ?, ?)
        ");
        $logMsg = "Agent baru '{$name}' ({$role}) berhasil didaftarkan di stasiun [X: {$deskX}, Z: {$deskZ}].";
        $logStmt->execute([
            $agentId,
            $logMsg,
            json_encode(['department' => $department, 'model' => $model])
        ]);

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => 'Agent berhasil dibuat',
            'agent_id' => $agentId,
            'data' => [
                'id' => $agentId,
                'name' => $name,
                'role' => $role,
                'department' => $department,
                'desk_x' => $deskX,
                'desk_z' => $deskZ,
                'desk_rotation' => $deskRotation,
                'status' => $status,
                'current_task' => $currentTask,
                'avatar_color' => $avatarColor,
                'model' => $model,
                'temperature' => $temperature,
                'system_prompt' => $systemPrompt,
                'functions' => $functions,
                'parameters' => $parameters,
                'action_count' => 0,
                'token_usage' => 0,
                'context_memory' => 4096,
                'pending_tasks_count' => 0,
                'total_tasks_count' => 0
            ]
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => 'Gagal membuat agent: ' . $e->getMessage()], 500);
    }
}

/**
 * PUT/PATCH: Update agent profile, status, coordinates, or prompt
 */
function handleUpdateAgent(PDO $pdo, ?array $input = null) {
    if ($input === null) $input = getJsonInput();
    $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);

    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'ID Agent diperlukan'], 400);
    }

    // Check existing
    $chk = $pdo->prepare("SELECT * FROM agents WHERE id = ?");
    $chk->execute([$id]);
    $existing = $chk->fetch();

    if (!$existing) {
        sendJsonResponse(['success' => false, 'error' => 'Agent tidak ditemukan'], 404);
    }

    $updates = [];
    $params = [];

    $fields = ['name', 'role', 'department', 'desk_x', 'desk_z', 'desk_rotation', 'status', 'current_task', 'avatar_color', 'model', 'temperature', 'system_prompt', 'action_count', 'token_usage', 'context_memory'];

    foreach ($fields as $field) {
        if (array_key_exists($field, $input)) {
            $updates[] = "`{$field}` = ?";
            $params[] = $input[$field];
        }
    }

    try {
        $pdo->beginTransaction();

        if (!empty($updates)) {
            $params[] = $id;
            $sql = "UPDATE agents SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        // Update config if functions or parameters provided
        if (isset($input['functions']) || isset($input['parameters'])) {
            $cfgUpdates = [];
            $cfgParams = [];

            if (isset($input['functions'])) {
                $cfgUpdates[] = "functions_json = ?";
                $cfgParams[] = json_encode($input['functions'], JSON_UNESCAPED_UNICODE);
            }
            if (isset($input['parameters'])) {
                $cfgUpdates[] = "parameters_json = ?";
                $cfgParams[] = json_encode($input['parameters'], JSON_UNESCAPED_UNICODE);
            }

            if (!empty($cfgUpdates)) {
                $cfgParams[] = $id;
                $cfgSql = "UPDATE agent_configs SET " . implode(', ', $cfgUpdates) . " WHERE agent_id = ?";
                $stmt = $pdo->prepare($cfgSql);
                $stmt->execute($cfgParams);
            }
        }

        // If status changed, log it
        if (isset($input['status']) && $input['status'] !== $existing['status']) {
            $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'system', ?, ?)");
            $logMsg = "Status agent '{$existing['name']}' diperbarui dari {$existing['status']} menjadi {$input['status']}.";
            $logStmt->execute([$id, $logMsg, json_encode(['old_status' => $existing['status'], 'new_status' => $input['status']])]);
        }

        $pdo->commit();

        // Fetch updated
        $fetch = $pdo->prepare("
            SELECT a.*, c.functions_json, c.parameters_json 
            FROM agents a
            LEFT JOIN agent_configs c ON a.id = c.agent_id
            WHERE a.id = ?
        ");
        $fetch->execute([$id]);
        $updatedAgent = $fetch->fetch();
        $updatedAgent['functions'] = json_decode($updatedAgent['functions_json'] ?? '[]', true) ?: [];
        $updatedAgent['parameters'] = json_decode($updatedAgent['parameters_json'] ?? '{}', true) ?: (object)[];

        sendJsonResponse([
            'success' => true,
            'message' => 'Agent berhasil diperbarui',
            'data' => $updatedAgent
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => 'Gagal memperbarui agent: ' . $e->getMessage()], 500);
    }
}

/**
 * DELETE: Remove agent from system
 */
function handleDeleteAgent(PDO $pdo, ?array $input = null) {
    if ($input === null) $input = getJsonInput();
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        $id = isset($input['id']) ? (int)$input['id'] : null;
    }

    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'ID Agent diperlukan'], 400);
    }

    // Get name for log
    $chk = $pdo->prepare("SELECT name FROM agents WHERE id = ?");
    $chk->execute([$id]);
    $agentName = $chk->fetchColumn();

    if (!$agentName) {
        sendJsonResponse(['success' => false, 'error' => 'Agent tidak ditemukan'], 404);
    }

    try {
        $pdo->beginTransaction();

        // Unlink tasks
        $pdo->prepare("UPDATE tasks SET assigned_agent_id = NULL WHERE assigned_agent_id = ?")->execute([$id]);

        // Delete config
        $pdo->prepare("DELETE FROM agent_configs WHERE agent_id = ?")->execute([$id]);

        // Delete logs
        $pdo->prepare("DELETE FROM agent_logs WHERE agent_id = ?")->execute([$id]);

        // Delete agent
        $pdo->prepare("DELETE FROM agents WHERE id = ?")->execute([$id]);

        // Prevent automatic re-seeding if all agents are deleted
        setSystemSetting($pdo, 'system_seeded', '1');

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => "Agent '{$agentName}' berhasil dihapus dari virtual office"
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => 'Gagal menghapus agent: ' . $e->getMessage()], 500);
    }
}

/**
 * Bulk update status for all agents (e.g. Pause All or Start All)
 */
function handleBulkStatusAgents(PDO $pdo, array $input) {
    $targetStatus = in_array($input['status'] ?? '', ['KERJA', 'PAUSED', 'IDLE']) ? $input['status'] : 'PAUSED';

    $stmt = $pdo->query("SELECT id, name FROM agents");
    $allAgents = $stmt->fetchAll();
    $count = count($allAgents);

    if ($count === 0) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada agent terdaftar untuk diubah statusnya']);
    }

    $pdo->prepare("UPDATE agents SET status = ?")->execute([$targetStatus]);

    $statusLabels = [
        'KERJA' => 'bekerja (KERJA)',
        'PAUSED' => 'ditangguhkan (PAUSED)',
        'IDLE' => 'istirahat di lounge (IDLE)'
    ];
    $label = $statusLabels[$targetStatus] ?? $targetStatus;
    $logMsg = "Seluruh agent ({$count} agent) berhasil diubah statusnya menjadi {$label}.";

    // Insert log
    try {
        $pdo->prepare("INSERT INTO agent_logs (log_type, message, details_json) VALUES ('system', ?, ?)")
            ->execute([$logMsg, json_encode(['bulk_status' => $targetStatus, 'agent_count' => $count], JSON_UNESCAPED_UNICODE)]);
    } catch (Exception $e) {}

    sendJsonResponse([
        'success' => true,
        'message' => $logMsg,
        'new_status' => $targetStatus,
        'affected_agents' => $count
    ]);
}

/**
 * Bulk delete all agents from system
 */
function handleDeleteAllAgents(PDO $pdo) {
    $stmt = $pdo->query("SELECT COUNT(*) FROM agents");
    $count = (int)$stmt->fetchColumn();

    if ($count === 0) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada agent untuk dihapus']);
    }

    try {
        $pdo->beginTransaction();

        // Unlink tasks
        $pdo->exec("UPDATE tasks SET assigned_agent_id = NULL");

        // Delete configs
        $pdo->exec("DELETE FROM agent_configs");

        // Delete logs
        $pdo->exec("DELETE FROM agent_logs");

        // Delete agents
        $pdo->exec("DELETE FROM agents");

        // Explicitly set system_seeded = '1' so ensureTables NEVER auto-seeds again!
        setSystemSetting($pdo, 'system_seeded', '1');

        $logMsg = "Seluruh agent ({$count} agent) telah dihapus dari sistem.";
        try {
            $pdo->prepare("INSERT INTO agent_logs (log_type, message) VALUES ('system', ?)")->execute([$logMsg]);
        } catch (Exception $e) {}

        $pdo->commit();

        sendJsonResponse([
            'success' => true,
            'message' => $logMsg,
            'deleted_count' => $count
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        sendJsonResponse(['success' => false, 'error' => 'Gagal menghapus seluruh agent: ' . $e->getMessage()], 500);
    }
}

