<?php
/**
 * Agent Activity Simulator & Real AI Background Engine
 * Kantor Virtual HQ
 * Generates real-time multi-agent activities via Real AI when enabled, with smart contextual research simulation
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Get all agents
    $stmt = $pdo->query("SELECT * FROM agents ORDER BY id ASC");
    $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($agents)) {
        sendJsonResponse([
            'success' => true,
            'is_idle' => true,
            'message' => 'Tidak ada agent terdaftar. Simulasi standby.'
        ]);
    }

    // Filter active working agents: agents that are strictly 'KERJA'
    $workingAgents = array_values(array_filter($agents, function($a) {
        return $a['status'] === 'KERJA';
    }));

    if (empty($workingAgents)) {
        sendJsonResponse([
            'success' => true,
            'is_idle' => true,
            'events' => [],
            'simulated_agents' => [],
            'message' => 'Tidak ada agent berstatus KERJA (seluruh agent sedang PAUSED atau IDLE). Simulasi dihentikan.'
        ]);
    }

    // Check system settings
    $autoExec = getSystemSetting($pdo, 'auto_execution', '0') === '1';
    $realAiEnabled = getSystemSetting($pdo, 'real_ai_enabled', '1') === '1';

    // 2. Real AI Auto-Execution if enabled & pending task exists for working agents
    if ($autoExec && $realAiEnabled && !empty($workingAgents)) {
        $workingAgentIds = array_column($workingAgents, 'id');
        $inClause = implode(',', array_map('intval', $workingAgentIds));

        $taskStmt = $pdo->query("
            SELECT id, title, assigned_agent_id 
            FROM tasks 
            WHERE (status = 'pending' OR (status = 'in_progress' AND (result_text IS NULL OR result_text = '')))
              AND (assigned_agent_id IS NULL OR assigned_agent_id IN ($inClause))
            ORDER BY FIELD(status, 'in_progress', 'pending'), FIELD(priority, 'urgent', 'high', 'medium', 'low'), id ASC 
            LIMIT 1
        ");
        $pendingTask = $taskStmt->fetch(PDO::FETCH_ASSOC);

        if ($pendingTask) {
            try {
                $execRes = AIService::executeTask($pdo, (int)$pendingTask['id'], !empty($pendingTask['assigned_agent_id']) ? (int)$pendingTask['assigned_agent_id'] : null);
                
                $agentStmt = $pdo->prepare("SELECT * FROM agents WHERE id = ?");
                $agentStmt->execute([$execRes['agent_id']]);
                $updatedAgent = $agentStmt->fetch(PDO::FETCH_ASSOC);

                $event = [
                    'id' => time(),
                    'agent_id' => $execRes['agent_id'],
                    'agent_name' => $execRes['agent_name'],
                    'avatar_color' => $updatedAgent['avatar_color'] ?? '#3b82f6',
                    'type' => 'task_complete',
                    'message' => "Real AI ({$execRes['model']}): Selesai memproses task #{$pendingTask['id']} ('{$pendingTask['title']}')",
                    'token_delta' => $execRes['tokens'],
                    'time' => date('H:i:s')
                ];

                sendJsonResponse([
                    'success' => true,
                    'is_real_ai' => true,
                    'simulated_agent' => $updatedAgent,
                    'simulated_agents' => [$updatedAgent],
                    'event' => $event,
                    'events' => [$event]
                ]);
            } catch (Exception $aiErr) {
                // Log error so it's not silently lost
                error_log("Real AI Auto-Execution Error on task #{$pendingTask['id']}: " . $aiErr->getMessage());
            }
        }
    }

    // 3. Autonomous Multi-Agent Research & Activity Engine
    // Target only agents that are actively in 'KERJA'
    $targetAgents = $workingAgents;

    // Pick agents to process this tick (process working agents so none are left idle)
    // To ensure fair distribution, pick up to 2 agents, prioritizing the ones with fewest actions or random
    usort($targetAgents, function($a, $b) {
        return ($a['action_count'] <=> $b['action_count']);
    });
    $selectedAgents = array_slice($targetAgents, 0, min(2, count($targetAgents)));

    $allEvents = [];
    $allUpdatedAgents = [];

    foreach ($selectedAgents as $agent) {
        $agentId = (int)$agent['id'];

        // Determine current task/research topic
        $taskTitle = trim($agent['current_task'] ?? '');
        $linkedTaskId = null;

        // Check if there is an active task in tasks table
        $taskCheck = $pdo->prepare("
            SELECT id, title, status 
            FROM tasks 
            WHERE assigned_agent_id = ? AND status IN ('in_progress', 'pending')
            ORDER BY FIELD(status, 'in_progress', 'pending'), FIELD(priority, 'urgent', 'high', 'medium', 'low'), id DESC
            LIMIT 1
        ");
        $taskCheck->execute([$agentId]);
        $activeTaskRow = $taskCheck->fetch(PDO::FETCH_ASSOC);

        if (!$activeTaskRow) {
            // Agent has no active or pending tasks: transition cleanly to IDLE / Lounge
            $pdo->prepare("UPDATE agents SET status = 'IDLE', current_task = 'Standby (Menunggu penugasan)', updated_at = NOW() WHERE id = ?")->execute([$agentId]);
            continue;
        }

        $taskTitle = $activeTaskRow['title'];
        $linkedTaskId = (int)$activeTaskRow['id'];

        // Generate contextual autonomous research step
        $actionStep = ($agent['action_count'] + 1) % 6;
        $eventData = generateAutonomousResearchStep($agent, $taskTitle, $actionStep, $linkedTaskId);

        $tokenDelta = rand(160, 480);
        $actionDelta = 1;

        // Check if milestone / task complete
        $taskCompleted = false;
        if ($eventData['type'] === 'task_complete') {
            $taskCompleted = true;
        }

        if ($taskCompleted) {
            $chkRemaining = $pdo->prepare("SELECT COUNT(*) FROM tasks WHERE assigned_agent_id = ? AND status IN ('in_progress', 'pending') AND id != ?");
            $chkRemaining->execute([$agentId, $linkedTaskId]);
            $hasRemaining = ((int)$chkRemaining->fetchColumn()) > 0;
            $newStatus = $hasRemaining ? 'KERJA' : 'IDLE';
            $newCurrentTask = $hasRemaining ? 'Lanjut tugas berikutnya' : 'Standby (Tugas selesai)';
        } else {
            $newStatus = 'KERJA';
            $newCurrentTask = "Mengerjakan: " . mb_substr($taskTitle, 0, 30);
        }

        $updAgent = $pdo->prepare("
            UPDATE agents 
            SET token_usage = token_usage + ?, 
                action_count = action_count + ?, 
                context_memory = LEAST(128000, context_memory + ?),
                current_task = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        $updAgent->execute([$tokenDelta, $actionDelta, (int)($tokenDelta * 0.7), $newCurrentTask, $newStatus, $agentId]);

        // Insert log into agent_logs
        $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, ?, ?, ?)");
        $logStmt->execute([
            $agentId,
            $eventData['type'],
            $eventData['msg'],
            json_encode($eventData['details'], JSON_UNESCAPED_UNICODE)
        ]);
        $logId = (int)$pdo->lastInsertId();

        // Fetch refreshed agent data
        $agentStmt = $pdo->prepare("SELECT * FROM agents WHERE id = ?");
        $agentStmt->execute([$agentId]);
        $updatedAgent = $agentStmt->fetch(PDO::FETCH_ASSOC);

        $eventPayload = [
            'id' => $logId,
            'agent_id' => $agentId,
            'agent_name' => $agent['name'],
            'avatar_color' => $agent['avatar_color'],
            'type' => $eventData['type'],
            'message' => $eventData['msg'],
            'token_delta' => $tokenDelta,
            'time' => date('H:i:s'),
            'task_completed' => $taskCompleted
        ];

        $allEvents[] = $eventPayload;
        $allUpdatedAgents[] = $updatedAgent;
    }

    sendJsonResponse([
        'success' => true,
        'events' => $allEvents,
        'event' => $allEvents[0] ?? null,
        'simulated_agents' => $allUpdatedAgents,
        'simulated_agent' => $allUpdatedAgents[0] ?? null
    ]);

} catch (Exception $e) {
    sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}

/**
 * Generates dynamic, role-aware, context-specific autonomous research steps
 */
function generateAutonomousResearchStep(array $agent, string $taskTitle, int $step, ?int $taskId): array {
    $role = $agent['role'];
    $name = $agent['name'];
    $shortTask = mb_substr($taskTitle, 0, 50);

    // Identify role category
    $isAnalyst = (stripos($role, 'analyst') !== false || stripos($agent['department'], 'research') !== false || stripos($role, 'riset') !== false);
    $isFrontend = (stripos($role, 'frontend') !== false || stripos($role, 'ui') !== false);
    $isBackend = (stripos($role, 'backend') !== false || stripos($role, 'architect') !== false || stripos($role, 'data') !== false);
    $isQA = (stripos($role, 'qa') !== false || stripos($role, 'test') !== false || stripos($role, 'quality') !== false);

    if ($isAnalyst) {
        switch ($step) {
            case 1:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name} (Analyst): Membedah kebutuhan riset & variabel evaluasi untuk: \"{$shortTask}\"...",
                    'details' => ['phase' => 'hypothesis', 'scope' => 'system_analysis']
                ];
            case 2:
                return [
                    'type' => 'tool_call',
                    'msg' => "web_search: 'Three.js 3D virtual office performance benchmarks & gap analysis 2026'",
                    'details' => ['tool' => 'web_search', 'query_time_ms' => 340, 'sources_found' => 8]
                ];
            case 3:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name}: Analisis komparatif mengidentifikasi 3 area: optimalisasi draw calls, spatial audio 8-bit, dan inter-agent task delegation.",
                    'details' => ['phase' => 'synthesis', 'insights_count' => 3]
                ];
            case 4:
                return [
                    'type' => 'action',
                    'msg' => "Agent {$name} menyusun dokumen laporan analisis: 'Evaluasi Fitur & Roadmap Rekomendasi Virtual Office HQ'.",
                    'details' => ['output_type' => 'markdown_report', 'sections' => 4]
                ];
            case 5:
                return [
                    'type' => 'communication',
                    'msg' => "Agent {$name} membagikan ringkasan temuan riset ke seluruh stasiun kerja untuk koordinasi tim.",
                    'details' => ['target' => 'all_workstations', 'status' => 'shared']
                ];
            case 0:
            default:
                return [
                    'type' => 'task_complete',
                    'msg' => "Agent {$name} berhasil menyelesaikan fase riset untuk: \"{$shortTask}\". Hasil analisis siap ditinjau.",
                    'details' => ['milestone' => 'research_completed', 'task_id' => $taskId]
                ];
        }
    } elseif ($isFrontend) {
        switch ($step) {
            case 1:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name}: Menguji keselarasan UI schema, rendering Three.js, dan kontras tema light/dark.",
                    'details' => ['module' => 'office-3d.js', 'fps_target' => 60]
                ];
            case 2:
                return [
                    'type' => 'tool_call',
                    'msg' => "execute: npm test -- --testPathPattern=IsometricOffice.spec.js",
                    'details' => ['tool' => 'shell_execution', 'exit_code' => 0, 'duration' => '780ms']
                ];
            case 3:
                return [
                    'type' => 'thought',
                    'msg' => "Optimasi rendering Three.js: frustum culling & material sharing menghemat 28 draw calls per frame.",
                    'details' => ['draw_calls' => 34, 'gpu_memory_mb' => 42]
                ];
            case 4:
                return [
                    'type' => 'action',
                    'msg' => "Memperbarui animasi avatar dan indikator typing keyboard saat agent dalam status KERJA.",
                    'details' => ['component' => 'AvatarArticulatedRig']
                ];
            case 5:
                return [
                    'type' => 'communication',
                    'msg' => "Mengirim payload UI schema ke Backend Architect untuk sinkronisasi antarmuka form.",
                    'details' => ['target' => 'backend_sync']
                ];
            case 0:
            default:
                return [
                    'type' => 'task_complete',
                    'msg' => "Agent {$name} menyelesaikan implementasi & optimasi untuk: \"{$shortTask}\".",
                    'details' => ['milestone' => 'frontend_optimized', 'task_id' => $taskId]
                ];
        }
    } elseif ($isBackend) {
        switch ($step) {
            case 1:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name}: Memantau latensi SSE event stream dan connection pool database MySQL.",
                    'details' => ['sse_latency_ms' => 11, 'db_active_conns' => 4]
                ];
            case 2:
                return [
                    'type' => 'tool_call',
                    'msg' => "db_query: EXPLAIN SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY id DESC",
                    'details' => ['tool' => 'database_query', 'index_used' => 'fk_log_agent', 'rows' => 20]
                ];
            case 3:
                return [
                    'type' => 'thought',
                    'msg' => "Event stream Server-Sent Events (SSE) beroperasi stabil dengan latensi < 15ms tanpa bottleneck.",
                    'details' => ['status' => 'optimal']
                ];
            case 4:
                return [
                    'type' => 'action',
                    'msg' => "Menerapkan rate limiting dan token budgeting per request pada worker node.",
                    'details' => ['max_tps' => 150, 'budget_strategy' => 'sliding_window']
                ];
            case 5:
                return [
                    'type' => 'communication',
                    'msg' => "Mendelegasikan pengujian load test endpoint SSE ke tim QA.",
                    'details' => ['target' => 'qa_team']
                ];
            case 0:
            default:
                return [
                    'type' => 'task_complete',
                    'msg' => "Agent {$name} menyelesaikan refactoring arsitektur untuk: \"{$shortTask}\".",
                    'details' => ['milestone' => 'backend_complete', 'task_id' => $taskId]
                ];
        }
    } elseif ($isQA) {
        switch ($step) {
            case 1:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name}: Merancang test case otomatis untuk validasi alur kerja multi-agent.",
                    'details' => ['test_type' => 'e2e_integration']
                ];
            case 2:
                return [
                    'type' => 'tool_call',
                    'msg' => "execute: playwright test e2e/agent_modal.spec.ts --headed=false",
                    'details' => ['tool' => 'shell_execution', 'tests_passed' => 18, 'duration' => '2.1s']
                ];
            case 3:
                return [
                    'type' => 'thought',
                    'msg' => "Semua endpoint CRUD /api/agents.php dan /api/tasks.php merespons dengan HTTP 200/201.",
                    'details' => ['coverage' => '95.2%']
                ];
            case 4:
                return [
                    'type' => 'action',
                    'msg' => "Menjalankan automated test validasi koordinat 3D stasiun kerja baru dan bounds collision.",
                    'details' => ['status' => 'passed']
                ];
            case 5:
                return [
                    'type' => 'communication',
                    'msg' => "Melaporkan hasil QA testing: semua skenario passed, zero critical bugs.",
                    'details' => ['target' => 'all_team']
                ];
            case 0:
            default:
                return [
                    'type' => 'task_complete',
                    'msg' => "Agent {$name} menyelesaikan verifikasi QA untuk: \"{$shortTask}\".",
                    'details' => ['milestone' => 'qa_verified', 'task_id' => $taskId]
                ];
        }
    } else {
        // Generic / Custom Role
        switch ($step) {
            case 1:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name} ({$role}): Melakukan analisis mendalam terhadap \"{$shortTask}\"...",
                    'details' => ['role' => $role, 'scope' => 'domain_analysis']
                ];
            case 2:
                return [
                    'type' => 'tool_call',
                    'msg' => "tool_call: execute_{$role}_pipeline --task=\"{$shortTask}\" --mode=autonomous",
                    'details' => ['tool' => 'domain_pipeline', 'status' => 'running']
                ];
            case 3:
                return [
                    'type' => 'thought',
                    'msg' => "Agent {$name}: Sintesis data menghasilkan strategi eksekusi optimal dan efisien.",
                    'details' => ['progress' => '65%']
                ];
            case 4:
                return [
                    'type' => 'action',
                    'msg' => "Agent {$name} mendokumentasikan progres implementasi tugas: \"{$shortTask}\".",
                    'details' => ['action' => 'save_progress']
                ];
            case 5:
                return [
                    'type' => 'communication',
                    'msg' => "Agent {$name} menyampaikan update progres pengerjaan kepada sistem orchestrator.",
                    'details' => ['target' => 'orchestrator']
                ];
            case 0:
            default:
                return [
                    'type' => 'task_complete',
                    'msg' => "Agent {$name} berhasil menyelesaikan tugas: \"{$shortTask}\".",
                    'details' => ['milestone' => 'task_completed', 'task_id' => $taskId]
                ];
        }
    }
}
