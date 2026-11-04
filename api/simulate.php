<?php
/**
 * Agent Activity Simulator & Real AI Background Engine
 * Kantor Virtual HQ
 * Generates real-time agent activities via Real AI when enabled, with smart simulation fallback
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Get all agents
    $stmt = $pdo->query("SELECT * FROM agents");
    $agents = $stmt->fetchAll();

    if (empty($agents)) {
        sendJsonResponse([
            'success' => true,
            'is_idle' => true,
            'message' => 'Tidak ada agent terdaftar. Simulasi standby.'
        ]);
    }

    // Filter active agents: agents that are NOT 'PAUSED'
    $activeAgents = array_values(array_filter($agents, function($a) {
        return $a['status'] !== 'PAUSED';
    }));

    if (empty($activeAgents)) {
        sendJsonResponse([
            'success' => true,
            'is_paused' => true,
            'message' => 'Seluruh agent sedang dalam status PAUSED (Ditangguhkan). Eksekusi AI dan simulasi dihentikan.'
        ]);
    }

    // Check if auto execution of pending tasks is enabled
    $autoExec = getSystemSetting($pdo, 'auto_execution', '0') === '1';
    $realAiEnabled = getSystemSetting($pdo, 'real_ai_enabled', '1') === '1';

    if ($autoExec && $realAiEnabled) {
        $activeAgentIds = array_column($activeAgents, 'id');
        $inClause = implode(',', array_map('intval', $activeAgentIds));

        // Look for pending tasks assigned to non-paused agent
        $taskStmt = $pdo->query("
            SELECT id, assigned_agent_id 
            FROM tasks 
            WHERE status = 'pending' 
              AND (assigned_agent_id IS NULL OR assigned_agent_id IN ($inClause))
            ORDER BY FIELD(priority, 'urgent', 'high', 'medium', 'low') 
            LIMIT 1
        ");
        $pendingTask = $taskStmt->fetch();

        if ($pendingTask) {
            try {
                $execRes = AIService::executeTask($pdo, (int)$pendingTask['id'], !empty($pendingTask['assigned_agent_id']) ? (int)$pendingTask['assigned_agent_id'] : null);
                
                $agentStmt = $pdo->prepare("SELECT * FROM agents WHERE id = ?");
                $agentStmt->execute([$execRes['agent_id']]);
                $updatedAgent = $agentStmt->fetch();

                sendJsonResponse([
                    'success' => true,
                    'is_real_ai' => true,
                    'simulated_agent' => $updatedAgent,
                    'event' => [
                        'id' => time(),
                        'agent_id' => $execRes['agent_id'],
                        'agent_name' => $execRes['agent_name'],
                        'avatar_color' => $updatedAgent['avatar_color'] ?? '#3b82f6',
                        'type' => 'task_complete',
                        'message' => "Real AI ({$execRes['model']}): Selesai memproses task #{$pendingTask['id']}",
                        'token_delta' => $execRes['tokens'],
                        'time' => date('H:i:s')
                    ]
                ]);
            } catch (Exception $aiErr) {
                // Fall through to standard simulation if API failed or no key
            }
        }
    }

    // Standard Simulation Tick (Selected only from active agents)
    $agent = $activeAgents[array_rand($activeAgents)];
    $agentId = (int)$agent['id'];

    // Possible simulated events based on role
    $events = [
        'Frontend' => [
            ['type' => 'tool_call', 'msg' => 'execute: npm test -- --testPathPattern=IsometricOffice.spec.js', 'details' => ['tool' => 'shell_execution', 'exit_code' => 0, 'duration' => '820ms']],
            ['type' => 'thought', 'msg' => 'Optimasi rendering Three.js: frustum culling menghemat 24 draw calls per frame.', 'details' => ['fps_target' => 60, 'draw_calls' => 38]],
            ['type' => 'action', 'msg' => 'Memperbarui animasi typing avatar 3D saat agent berada dalam status KERJA.', 'details' => ['module' => 'office-3d.js']],
            ['type' => 'communication', 'msg' => 'Mengirim payload UI schema ke Backend Architect (Siti) untuk sinkronisasi form.', 'details' => ['target_agent' => 'Siti Nurhaliza']],
        ],
        'Backend' => [
            ['type' => 'tool_call', 'msg' => 'db_query: EXPLAIN SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY id DESC', 'details' => ['tool' => 'database_query', 'index_used' => 'fk_log_agent']],
            ['type' => 'thought', 'msg' => 'Event stream Server-Sent Events (SSE) beroperasi stabil dengan latensi < 12ms.', 'details' => ['sse_clients' => 3]],
            ['type' => 'action', 'msg' => 'Menerapkan rate limiting dan token budgeting per request pada worker node.', 'details' => ['max_tps' => 150]],
            ['type' => 'communication', 'msg' => 'Mendelegasikan pengujian load test endpoint SSE ke QA Engineer (Dimas).', 'details' => ['target_agent' => 'Dimas Pratama']],
        ],
        'QA' => [
            ['type' => 'tool_call', 'msg' => 'execute: playwright test e2e/agent_modal.spec.ts --headed=false', 'details' => ['tests_passed' => 18, 'duration' => '2.4s']],
            ['type' => 'action', 'msg' => 'Menjalankan automated test validasi koordinat 3D stasiun kerja baru.', 'details' => ['status' => 'passed']],
            ['type' => 'thought', 'msg' => 'Semua endpoint CRUD /api/agents.php dan /api/tasks.php merespons dengan HTTP 200/201.', 'details' => ['coverage' => '94%']],
        ],
        'Research' => [
            ['type' => 'tool_call', 'msg' => 'web_search: "Antigravity dynamic context compaction algorithms 2026"', 'details' => ['query_time_ms' => 310, 'articles' => 6]],
            ['type' => 'thought', 'msg' => 'Efisiensi prompt template ditingkatkan 15%, mengurangi token overhead secara kumulatif.', 'details' => ['token_saved' => 1250]],
            ['type' => 'action', 'msg' => 'Menghasilkan laporan benchmarking token consumption mingguan untuk seluruh tim.', 'details' => ['report_format' => 'markdown']],
        ]
    ];

    // Find closest role key
    $categoryKey = 'Frontend';
    foreach (array_keys($events) as $key) {
        if (stripos($agent['role'], $key) !== false || stripos($agent['department'], $key) !== false) {
            $categoryKey = $key;
            break;
        }
    }

    $eventOptions = $events[$categoryKey];
    $selectedEvent = $eventOptions[array_rand($eventOptions)];

    // Random token increment (120 - 750)
    $tokenDelta = rand(120, 750);
    $actionDelta = 1;

    // Randomly toggle IDLE to KERJA or vice versa (15% chance). PAUSED agents stay PAUSED!
    $newStatus = $agent['status'];
    $statusChanged = false;
    if ($agent['status'] !== 'PAUSED' && rand(1, 7) === 1) {
        $newStatus = ($agent['status'] === 'IDLE') ? 'KERJA' : 'IDLE';
        if ($newStatus !== $agent['status']) {
            $statusChanged = true;
        }
    }

    // Update agent
    $upd = $pdo->prepare("
        UPDATE agents 
        SET token_usage = token_usage + ?, 
            action_count = action_count + ?, 
            context_memory = LEAST(128000, context_memory + ?),
            status = ?
        WHERE id = ?
    ");
    $upd->execute([$tokenDelta, $actionDelta, (int)($tokenDelta * 0.7), $newStatus, $agentId]);

    // Determine event message
    if ($statusChanged) {
        if ($newStatus === 'IDLE') {
            $selectedEvent = [
                'type' => 'action',
                'msg' => "Agent {$agent['name']} menyelesaikan sesi kerja dan berpindah ke Coffee & Chill Lounge untuk istirahat.",
                'details' => ['location' => 'lounge', 'action' => 'walk_to_rest']
            ];
        } else {
            $selectedEvent = [
                'type' => 'action',
                'msg' => "Agent {$agent['name']} selesai istirahat dan kembali ke stasiun meja kerja untuk memproses tugas baru.",
                'details' => ['location' => 'workstation', 'action' => 'walk_to_desk']
            ];
        }
    }

    // Insert log
    $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, ?, ?, ?)");
    $logStmt->execute([
        $agentId,
        $selectedEvent['type'],
        $selectedEvent['msg'],
        json_encode($selectedEvent['details'], JSON_UNESCAPED_UNICODE)
    ]);
    $logId = (int)$pdo->lastInsertId();

    // Fetch updated agent
    $agentStmt = $pdo->prepare("SELECT * FROM agents WHERE id = ?");
    $agentStmt->execute([$agentId]);
    $updatedAgent = $agentStmt->fetch();

    sendJsonResponse([
        'success' => true,
        'simulated_agent' => $updatedAgent,
        'event' => [
            'id' => $logId,
            'agent_id' => $agentId,
            'agent_name' => $agent['name'],
            'avatar_color' => $agent['avatar_color'],
            'type' => $selectedEvent['type'],
            'message' => $selectedEvent['msg'],
            'token_delta' => $tokenDelta,
            'time' => date('H:i:s')
        ]
    ]);

} catch (Exception $e) {
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
