<?php
/**
 * Meetings API - Autonomous Multi-Agent Team Collaboration (War Room)
 * Kantor Virtual HQ
 * Orchestrates multi-agent round-table discussions, meeting minutes, and auto-delegation of action items.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

switch ($method) {
    case 'GET':
        handleGetMeetings($pdo);
        break;

    case 'POST':
        handlePostMeetings($pdo, $input);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve meeting history or details of a specific meeting
 */
function handleGetMeetings(PDO $pdo) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $action = $_GET['action'] ?? '';

    if ($action === 'active') {
        $stmt = $pdo->query("SELECT * FROM meetings WHERE status = 'in_progress' ORDER BY id DESC LIMIT 1");
        $activeMeeting = $stmt->fetch();
        if ($activeMeeting) {
            $activeMeeting['participants'] = json_decode($activeMeeting['participants_json'] ?? '[]', true) ?: [];
            $activeMeeting['action_items'] = json_decode($activeMeeting['action_items_json'] ?? '[]', true) ?: [];
            sendJsonResponse(['success' => true, 'has_active' => true, 'data' => $activeMeeting]);
        } else {
            sendJsonResponse(['success' => true, 'has_active' => false, 'data' => null]);
        }
        return;
    }

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM meetings WHERE id = ?");
        $stmt->execute([$id]);
        $meeting = $stmt->fetch();

        if (!$meeting) {
            sendJsonResponse(['success' => false, 'error' => 'Meeting tidak ditemukan'], 404);
        }

        $meeting['participants'] = json_decode($meeting['participants_json'] ?? '[]', true) ?: [];
        $meeting['action_items'] = json_decode($meeting['action_items_json'] ?? '[]', true) ?: [];

        // Fetch participant agent objects
        if (!empty($meeting['participants'])) {
            $inClause = implode(',', array_map('intval', $meeting['participants']));
            $pStmt = $pdo->query("SELECT id, name, role, department, gender, avatar_color FROM agents WHERE id IN ($inClause)");
            $meeting['participant_agents'] = $pStmt->fetchAll();
        } else {
            $meeting['participant_agents'] = [];
        }

        // Fetch messages with agent info
        $msgStmt = $pdo->prepare("
            SELECT m.*, a.name AS agent_name, a.role AS agent_role, a.avatar_color, a.gender, a.department
            FROM meeting_messages m
            LEFT JOIN agents a ON m.agent_id = a.id
            WHERE m.meeting_id = ?
            ORDER BY m.id ASC
        ");
        $msgStmt->execute([$id]);
        $meeting['messages'] = $msgStmt->fetchAll();

        sendJsonResponse(['success' => true, 'data' => $meeting]);

    } else {
        $stmt = $pdo->query("
            SELECT m.*, 
                   (SELECT COUNT(*) FROM meeting_messages WHERE meeting_id = m.id) as message_count
            FROM meetings m 
            ORDER BY m.id DESC 
            LIMIT 30
        ");
        $meetings = $stmt->fetchAll();

        foreach ($meetings as &$m) {
            $m['participants'] = json_decode($m['participants_json'] ?? '[]', true) ?: [];
            $m['action_items'] = json_decode($m['action_items_json'] ?? '[]', true) ?: [];
        }

        sendJsonResponse([
            'success' => true,
            'total' => count($meetings),
            'data' => $meetings
        ]);
    }
}

/**
 * POST: Start autonomous meeting or delegate task breakdown
 */
function handlePostMeetings(PDO $pdo, array $input) {
    $action = $input['action'] ?? 'start_meeting';

    if ($action === 'start_meeting') {
        handleStartMeeting($pdo, $input);
    } elseif ($action === 'breakdown_task') {
        handleBreakdownTask($pdo, $input);
    } else {
        sendJsonResponse(['success' => false, 'error' => "Action '{$action}' tidak dikenal"], 400);
    }
}

/**
 * Executes a full autonomous round-table meeting between selected agents
 */
function handleStartMeeting(PDO $pdo, array $input) {
    $topic = trim($input['topic'] ?? '');
    $title = trim($input['title'] ?? '');
    if (empty($title)) {
        $title = "Rapat Tim: " . mb_substr($topic, 0, 45);
    }
    $rounds = max(1, min(3, (int)($input['rounds'] ?? 2)));
    $agentIds = $input['agent_ids'] ?? [];

    if (empty($topic)) {
        sendJsonResponse(['success' => false, 'error' => 'Topik rapat wajib diisi'], 422);
    }

    // Determine participating agents
    if (empty($agentIds) || !is_array($agentIds)) {
        // Auto-select 2 to 4 active agents
        $agentStmt = $pdo->query("SELECT id FROM agents ORDER BY FIELD(status, 'KERJA', 'IDLE', 'PAUSED'), id ASC LIMIT 4");
        $agentIds = $agentStmt->fetchAll(PDO::FETCH_COLUMN);
    }

    $agentIds = array_values(array_unique(array_map('intval', $agentIds)));
    if (count($agentIds) < 2) {
        sendJsonResponse(['success' => false, 'error' => 'Pilih minimal 2 agent untuk memulai rapat tim'], 422);
    }

    // Fetch participant agents
    $inClause = implode(',', $agentIds);
    $aStmt = $pdo->query("SELECT * FROM agents WHERE id IN ($inClause)");
    $participants = $aStmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($participants) < 2) {
        sendJsonResponse(['success' => false, 'error' => 'Agent yang dipilih tidak mencukupi untuk rapat'], 422);
    }

    try {
        // 1. Create meeting record in database
        $mStmt = $pdo->prepare("
            INSERT INTO meetings (title, topic, status, participants_json) 
            VALUES (?, ?, 'in_progress', ?)
        ");
        $mStmt->execute([$title, $topic, json_encode($agentIds)]);
        $meetingId = (int)$pdo->lastInsertId();

        // 2. Announce meeting start to agent logs
        $names = array_column($participants, 'name');
        $participantNamesStr = implode(', ', $names);
        $announceMsg = "🚨 [WAR ROOM] Sesi Rapat Tim dimulai: \"{$title}\". Peserta: [{$participantNamesStr}] menuju Ruang Rapat 3D.";
        
        $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'communication', ?, ?)");
        $logStmt->execute([
            $participants[0]['id'],
            $announceMsg,
            json_encode(['meeting_id' => $meetingId, 'topic' => $topic, 'participants' => $names], JSON_UNESCAPED_UNICODE)
        ]);

        // Temporarily set participants' current task to meeting
        $updAgentTask = $pdo->prepare("UPDATE agents SET current_task = ? WHERE id = ?");
        foreach ($participants as $p) {
            $updAgentTask->execute(["Rapat Tim: " . mb_substr($topic, 0, 30), $p['id']]);
        }

        // 3. Multi-turn Autonomous Discussion
        $conversationHistory = [];
        $savedMessages = [];

        for ($r = 1; $r <= $rounds; $r++) {
            foreach ($participants as $agent) {
                $agentId = (int)$agent['id'];
                $config = AIService::getConfig($pdo, $agent);
                $hasRealKey = ($config['provider'] === 'ollama' || !empty($config['api_key']));

                // Build context for this agent
                $historyText = "";
                if (!empty($conversationHistory)) {
                    $historyText = "RIWAYAT DISKUSI SEBELUMNYA DI MEJA RAPAT:\n";
                    foreach (array_slice($conversationHistory, -6) as $entry) {
                        $historyText .= "- [{$entry['name']} ({$entry['role']})]: {$entry['message']}\n";
                    }
                    $historyText .= "\n";
                }

                $roundGoal = ($r === 1) 
                    ? "Berikan pandangan awal, analisis mendalam, atau usulan solusi strategis sesuai peranmu ({$agent['role']} - {$agent['department']})."
                    : "Tanggapi usulan rekan tim sebelumnya, perkuat gagasan yang baik, tambahkan detail teknis/implementasi, dan rumuskan rencana konkret.";

                $systemPrompt = "Kamu adalah {$agent['name']}, berposisi sebagai {$agent['role']} di departemen {$agent['department']}.\n" .
                    "Saat ini kamu sedang duduk di kursi Ruang Rapat (War Room) Kantor Virtual HQ bersama rekan-rekan timmu.\n" .
                    "Topik Rapat: \"{$topic}\"\n" .
                    "Karaktermu: Cerdas, kolaboratif, solutif, dan profesional.\n" .
                    "Aturan Berbicara:\n" .
                    "- Bicara langsung dalam bahasa Indonesia secara natural dan lugas (1-3 paragraf).\n" .
                    "- Fokus pada kontribusi sesuai keahlianmu ({$agent['role']}).\n" .
                    "- Jika ada rekan sebelumnya yang berbicara, sebutkan nama mereka dan beri respon relevan.";

                $userPrompt = $historyText . 
                    "Sesi diskusi: Putaran ke-{$r} dari {$rounds}.\n" .
                    "Tujuan giliranmu: {$roundGoal}\n" .
                    "Keluarkan pendapatmu sekarang:";

                $speechText = "";
                if ($hasRealKey) {
                    try {
                        $llmRes = AIService::callLLM($config, $systemPrompt, $userPrompt, 0.75);
                        $speechText = trim($llmRes['content']);
                        // Clean any leftover prefixes like [THOUGHT], [RESULT]
                        $speechText = preg_replace('/^\[(?:THOUGHT|RESULT|SPEECH)\]\s*/i', '', $speechText);
                    } catch (Exception $aiEx) {
                        $speechText = generateFallbackMeetingSpeech($agent, $topic, $r, $conversationHistory);
                    }
                } else {
                    $speechText = generateFallbackMeetingSpeech($agent, $topic, $r, $conversationHistory);
                }

                // Save message
                $msgInsert = $pdo->prepare("
                    INSERT INTO meeting_messages (meeting_id, agent_id, round_number, message) 
                    VALUES (?, ?, ?, ?)
                ");
                $msgInsert->execute([$meetingId, $agentId, $r, $speechText]);
                $msgId = (int)$pdo->lastInsertId();

                $msgObj = [
                    'id' => $msgId,
                    'meeting_id' => $meetingId,
                    'agent_id' => $agentId,
                    'agent_name' => $agent['name'],
                    'agent_role' => $agent['role'],
                    'avatar_color' => $agent['avatar_color'] ?? '#3b82f6',
                    'gender' => $agent['gender'] ?? 'male',
                    'round_number' => $r,
                    'message' => $speechText,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $savedMessages[] = $msgObj;
                $conversationHistory[] = ['name' => $agent['name'], 'role' => $agent['role'], 'message' => $speechText];

                // Log utterance into activity stream
                $dialogLog = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'communication', ?, ?)");
                $dialogLog->execute([
                    $agentId,
                    "[Ruang Rapat] {$agent['name']}: " . mb_substr($speechText, 0, 110) . "...",
                    json_encode(['meeting_id' => $meetingId, 'round' => $r, 'speech' => mb_substr($speechText, 0, 300)], JSON_UNESCAPED_UNICODE)
                ]);
            }
        }

        // 4. Synthesize Meeting Minutes (Notulensi) & Extract Action Items
        $moderator = $participants[0];
        $minutesSummary = "";
        $actionItems = [];

        $allConversationText = "";
        foreach ($savedMessages as $m) {
            $allConversationText .= "### {$m['agent_name']} ({$m['agent_role']}):\n{$m['message']}\n\n";
        }

        $configMod = AIService::getConfig($pdo, $moderator);
        $hasKeyMod = ($configMod['provider'] === 'ollama' || !empty($configMod['api_key']));

        if ($hasKeyMod) {
            try {
                $summarySysPrompt = "Kamu adalah notulis rapat profesional kantor virtual. Tugasmu menyusun notulensi ringkas dan 2-4 daftar aksi nyata (action items) dari rapat tim.";
                $summaryUserPrompt = "Berikut adalah transkrip lengkap rapat tim:\n" .
                    "Topik: {$topic}\n\n" .
                    $allConversationText . "\n" .
                    "SUSUN NOTULENSI DENGAN FORMAT BERIKUT (WAJIB PERSIS):\n" .
                    "[SUMMARY]\n" .
                    "Tulis ringkasan hasil rapat dalam 3-5 butir poin penting.\n" .
                    "[ACTION_ITEMS]\n" .
                    "Tuliskan 2-4 butir tugas konkret untuk ditindaklanjuti tim, masing-masing satu baris dengan format:\n" .
                    "- [Nama Agent]: Judul tugas spesifik | Prioritas (urgent/high/medium)";

                $synthRes = AIService::callLLM($configMod, $summarySysPrompt, $summaryUserPrompt, 0.4);
                $synthText = $synthRes['content'];

                if (preg_match('/\[SUMMARY\](.*?)(\[ACTION_ITEMS\]|$)/is', $synthText, $sMatch)) {
                    $minutesSummary = trim($sMatch[1]);
                }
                if (preg_match('/\[ACTION_ITEMS\](.*)$/is', $synthText, $aMatch)) {
                    $lines = explode("\n", trim($aMatch[1]));
                    foreach ($lines as $line) {
                        $line = trim($line, "-* \t");
                        if (preg_match('/\[(.*?)\]\s*:\s*([^|]+)(?:\|\s*(\w+))?/i', $line, $lm)) {
                            $targetName = trim($lm[1]);
                            $taskTitle = trim($lm[2]);
                            $priority = strtolower(trim($lm[3] ?? 'high'));
                            if (!in_array($priority, ['urgent', 'high', 'medium', 'low'])) $priority = 'high';

                            // Find matching agent id
                            $assignedId = $participants[0]['id'];
                            foreach ($participants as $p) {
                                if (stripos($p['name'], $targetName) !== false || stripos($targetName, $p['name']) !== false) {
                                    $assignedId = $p['id'];
                                    break;
                                }
                            }

                            $actionItems[] = [
                                'title' => $taskTitle,
                                'assigned_agent_id' => $assignedId,
                                'priority' => $priority,
                                'category' => 'deadline_dekat'
                            ];
                        }
                    }
                }
            } catch (Exception $e) {
                // Fallback synthesis
            }
        }

        // Fallback synthesis if empty
        if (empty($minutesSummary)) {
            $minutesSummary = "1. Tim telah membedah seluruh aspek teknis dan operasional untuk: '{$topic}'.\n" .
                "2. Tercapai kesepahaman arsitektur terpadu dengan pembagian kerja antar spesialis.\n" .
                "3. Prioritas eksekusi difokuskan pada keandalan sistem, pengujian menyeluruh, dan kecepatan rilis.";
        }

        if (empty($actionItems)) {
            foreach (array_slice($participants, 0, 3) as $idx => $p) {
                $actionItems[] = [
                    'title' => "Tindak lanjut [{$p['role']}]: Implementasi hasil rapat {$topic}",
                    'assigned_agent_id' => $p['id'],
                    'priority' => ($idx === 0 ? 'urgent' : 'high'),
                    'category' => 'deadline_dekat'
                ];
            }
        }

        // 5. Automatically create new tasks in tasks table for each action item!
        $createdTasks = [];
        $taskInsert = $pdo->prepare("
            INSERT INTO tasks (title, category, assigned_agent_id, status, priority, due_date)
            VALUES (?, ?, ?, 'pending', ?, DATE_ADD(CURDATE(), INTERVAL 3 DAY))
        ");

        foreach ($actionItems as $ai) {
            $taskInsert->execute([
                $ai['title'],
                $ai['category'],
                $ai['assigned_agent_id'],
                $ai['priority']
            ]);
            $newTaskId = (int)$pdo->lastInsertId();
            $createdTasks[] = [
                'id' => $newTaskId,
                'title' => $ai['title'],
                'assigned_agent_id' => $ai['assigned_agent_id'],
                'priority' => $ai['priority']
            ];

            // Notify in logs
            $logStmt->execute([
                $ai['assigned_agent_id'],
                "📌 [Notulensi Rapat #{$meetingId}] Tugas baru otomatis dibuat: '{$ai['title']}'",
                json_encode(['meeting_id' => $meetingId, 'task_id' => $newTaskId, 'priority' => $ai['priority']], JSON_UNESCAPED_UNICODE)
            ]);
        }

        // 6. Mark meeting completed
        $updMeeting = $pdo->prepare("
            UPDATE meetings 
            SET status = 'completed', 
                summary = ?, 
                action_items_json = ?,
                updated_at = NOW() 
            WHERE id = ?
        ");
        $updMeeting->execute([$minutesSummary, json_encode($createdTasks, JSON_UNESCAPED_UNICODE), $meetingId]);

        // Reset agents' current task
        foreach ($participants as $p) {
            $updAgentTask->execute(["Selesai rapat: " . mb_substr($topic, 0, 25), $p['id']]);
        }

        sendJsonResponse([
            'success' => true,
            'message' => "Rapat tim selesai ({$rounds} putaran diskusi). Notulensi dan " . count($createdTasks) . " tugas baru berhasil didelegasikan!",
            'data' => [
                'meeting_id' => $meetingId,
                'title' => $title,
                'topic' => $topic,
                'participants' => $participants,
                'messages' => $savedMessages,
                'summary' => $minutesSummary,
                'created_tasks' => $createdTasks
            ]
        ]);

    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal menyelenggarakan rapat tim: ' . $e->getMessage()], 500);
    }
}

/**
 * Manager-Worker Pattern: Automatically breaks down a complex task into delegated sub-tasks
 */
function handleBreakdownTask(PDO $pdo, array $input) {
    $parentTaskId = (int)($input['task_id'] ?? 0);
    $parentTaskTitle = trim($input['title'] ?? '');
    $leadAgentId = !empty($input['lead_agent_id']) ? (int)$input['lead_agent_id'] : null;

    if ($parentTaskId) {
        $tStmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
        $tStmt->execute([$parentTaskId]);
        $task = $tStmt->fetch();
        if ($task) {
            $parentTaskTitle = $task['title'];
            if (!$leadAgentId && $task['assigned_agent_id']) {
                $leadAgentId = (int)$task['assigned_agent_id'];
            }
        }
    }

    if (empty($parentTaskTitle)) {
        sendJsonResponse(['success' => false, 'error' => 'Judul task induk wajib disertakan'], 422);
    }

    // Get all agents to distribute work
    $agentsStmt = $pdo->query("SELECT id, name, role, department FROM agents ORDER BY id ASC");
    $allAgents = $agentsStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($allAgents)) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada agent terdaftar untuk delegasi'], 422);
    }

    $leadAgent = null;
    if ($leadAgentId) {
        foreach ($allAgents as $a) {
            if ($a['id'] == $leadAgentId) { $leadAgent = $a; break; }
        }
    }
    if (!$leadAgent) $leadAgent = $allAgents[0];

    $config = AIService::getConfig($pdo, $leadAgent);
    $hasKey = ($config['provider'] === 'ollama' || !empty($config['api_key']));

    $agentsRosterStr = "";
    foreach ($allAgents as $a) {
        $agentsRosterStr .= "- ID: {$a['id']} | {$a['name']} ({$a['role']} - Departemen: {$a['department']})\n";
    }

    $subtasks = [];

    if ($hasKey) {
        try {
            $sysPrompt = "Kamu adalah Project Manager & System Architect AI ({$leadAgent['name']}). " .
                "Pola kerjamu: Manager-Worker. Kamu menerima 1 tugas besar dan memecahnya menjadi 2-4 sub-tugas yang terstruktur, lalu mendelegasikannya ke agent yang paling cocok sesuai keahlian mereka.";

            $usrPrompt = "DAFTAR REKAN TIM TERSEDIA:\n" .
                $agentsRosterStr . "\n\n" .
                "TUGAS BESAR YANG HARUS DIPECAH:\n" .
                "\"{$parentTaskTitle}\"\n\n" .
                "Format output WAJIB persis per baris:\n" .
                "- [ID_AGENT]: Judul sub-tugas | Kategori (deadline_dekat/nunggu_owner/ide_nanti) | Prioritas (urgent/high/medium)\n";

            $res = AIService::callLLM($config, $sysPrompt, $usrPrompt, 0.5);
            $lines = explode("\n", trim($res['content']));

            foreach ($lines as $line) {
                $line = trim($line, "-* \t");
                if (preg_match('/\[(\d+)\]\s*:\s*([^|]+)\|\s*(\w+)\s*\|\s*(\w+)/i', $line, $m)) {
                    $targetAgentId = (int)$m[1];
                    $subTitle = trim($m[2]);
                    $cat = strtolower(trim($m[3]));
                    $prio = strtolower(trim($m[4]));

                    if (!in_array($cat, ['deadline_dekat', 'nunggu_owner', 'ide_nanti'])) $cat = 'deadline_dekat';
                    if (!in_array($prio, ['urgent', 'high', 'medium', 'low'])) $prio = 'high';

                    $subtasks[] = [
                        'title' => $subTitle,
                        'category' => $cat,
                        'assigned_agent_id' => $targetAgentId,
                        'priority' => $prio
                    ];
                }
            }
        } catch (Exception $e) {
            // Fallback below
        }
    }

    if (empty($subtasks)) {
        // Smart fallback distribution
        foreach (array_slice($allAgents, 0, min(3, count($allAgents))) as $idx => $ag) {
            $subtasks[] = [
                'title' => "Sub-task [{$ag['role']}]: Spesifikasi & Implementasi {$parentTaskTitle} (#" . ($idx + 1) . ")",
                'category' => 'deadline_dekat',
                'assigned_agent_id' => $ag['id'],
                'priority' => ($idx === 0 ? 'urgent' : 'high')
            ];
        }
    }

    // Insert subtasks into database
    $createdSubtasks = [];
    $taskStmt = $pdo->prepare("
        INSERT INTO tasks (title, category, assigned_agent_id, status, priority, due_date)
        VALUES (?, ?, ?, 'pending', ?, DATE_ADD(CURDATE(), INTERVAL 3 DAY))
    ");

    foreach ($subtasks as $st) {
        $taskStmt->execute([
            $st['title'],
            $st['category'],
            $st['assigned_agent_id'],
            $st['priority']
        ]);
        $newId = (int)$pdo->lastInsertId();
        $createdSubtasks[] = array_merge($st, ['id' => $newId]);

        // Log delegation
        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
            ->execute([
                $st['assigned_agent_id'],
                "🤖 [Manager Delegasi] Menerima sub-task baru: '{$st['title']}'",
                json_encode(['parent_task' => $parentTaskTitle, 'subtask_id' => $newId], JSON_UNESCAPED_UNICODE)
            ]);
    }

    sendJsonResponse([
        'success' => true,
        'message' => "Tugas berhasil dipecah menjadi " . count($createdSubtasks) . " sub-tugas dan didelegasikan!",
        'lead_agent' => $leadAgent,
        'data' => $createdSubtasks
    ]);
}

/**
 * Natural contextual fallback dialog generator for offline mode
 */
function generateFallbackMeetingSpeech(array $agent, string $topic, int $round, array $history): string {
    $name = $agent['name'];
    $role = $agent['role'];
    $isBackend = stripos($role, 'backend') !== false || stripos($role, 'devops') !== false;
    $isFrontend = stripos($role, 'frontend') !== false || stripos($role, 'ui') !== false;
    $isAnalyst = stripos($role, 'analyst') !== false || stripos($role, 'data') !== false;
    $isSocial = stripos($role, 'sosial') !== false || stripos($role, 'media') !== false || stripos($role, 'content') !== false;

    if ($round === 1) {
        if ($isSocial) {
            return "Terima kasih tim. Untuk topik '{$topic}', dari kacamata konten dan media sosial, kita butuh hook yang kuat sejak awal. Tren saat ini menunjukkan format carousel visual dan video pendek 30-45 detik menghasilkan engagement tertinggi. Saya mengusulkan pembuatan 3 pilar konten: edukasi fungsional, testimoni preview, dan call-to-action interaktif.";
        } elseif ($isBackend) {
            return "Halo semua. Menyambung topik '{$topic}', dari sisi backend dan infrastruktur, prioritas utama kita adalah modularitas dan keamanan data. Kita perlu pastikan kontrak data (API schema) dirancang secara terstandar, latensi response < 100ms, serta ada perlindungan rate limiting agar stabil saat beban meningkat.";
        } elseif ($isFrontend) {
            return "Menarik sekali pembahasannya. Dari sudut pandang antarmuka pengguna (Frontend), saya sarankan desain komponen yang clean, high-contrast, dan responsif baik di desktop maupun mobile. Kita bisa siapkan micro-interactions yang halus pada tombol dan transisi visual agar user experience terasa modern.";
        } else {
            return "Dari kacamata analisis dan perencanaan, inisiatif '{$topic}' memiliki prospek strategis yang solid. Kita perlu memetakan target metrik keberhasilan (KPI) yang terukur dalam 2 minggu ke depan, memprioritaskan fitur inti (MVP), dan memitigasi bottleneck pada integrasi antar modul.";
        }
    } else {
        $prevSpeaker = !empty($history) ? end($history)['name'] : 'rekan-rekan';
        if ($isSocial) {
            return "Saya sepakat sekali dengan masukan {$prevSpeaker}. Setelah arsitektur dan fiturnya siap, tim media sosial akan langsung merilis teaser teaser visual dan kalender posting bertahap. Draf copywriting akan saya siapkan agar siap direview sebelum publikasi.";
        } elseif ($isBackend) {
            return "Saran dari {$prevSpeaker} sangat sejalan. Saya akan segera siapkan endpoint API dan migrasi databasenya. Setelah itu kita bisa lakukan pengujian otomatis bersama tim QA sebelum modul disatukan ke branch utama.";
        } else {
            return "Setuju dengan arah diskusi sejauh ini. Dengan pembagian tugas yang jelas antara frontend, backend, dan pemasaran, kita bisa selesaikan sprint ini tepat waktu dengan kualitas deliverable yang optimal.";
        }
    }
}

