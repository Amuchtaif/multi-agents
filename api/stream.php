<?php
/**
 * Server-Sent Events (SSE) Stream Endpoint
 * Kantor Virtual HQ
 * Provides live updates for agent metrics, status changes, and activity logs
 */

require_once __DIR__ . '/db.php';

// Turn off output buffering
if (function_exists('apache_setenv')) {
    apache_setenv('no-gzip', '1');
}
ini_set('zlib.output_compression', '0');
ini_set('implicit_flush', '1');
for ($i = 0; $i < ob_get_level(); $i++) {
    ob_end_flush();
}
ob_implicit_flush(1);

// Send SSE headers
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-transform');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

$simulate = isset($_GET['simulate']) && $_GET['simulate'] === '1';
$lastLogId = isset($_GET['last_log_id']) ? (int)$_GET['last_log_id'] : 0;

$startTime = time();
$maxRunSeconds = 25; // cycle every 25s for clean connection recycling

while (time() - $startTime < $maxRunSeconds) {
    if (connection_aborted()) {
        break;
    }

    try {
        // 1. Optionally simulate step if requested (Only for active KERJA agents)
        if ($simulate && rand(1, 2) === 1) {
            $agents = $pdo->query("SELECT * FROM agents WHERE status = 'KERJA'")->fetchAll();
            if (!empty($agents)) {
                $agent = $agents[array_rand($agents)];
                $agentId = (int)$agent['id'];
                $tokenDelta = rand(150, 450);
                $pdo->prepare("UPDATE agents SET token_usage = token_usage + ?, action_count = action_count + 1 WHERE id = ?")->execute([$tokenDelta, $agentId]);
            }
        }

        // 2. Fetch all agents
        $agentStmt = $pdo->query("SELECT * FROM agents ORDER BY id ASC");
        $agents = $agentStmt->fetchAll();

        // 3. Fetch task counts
        $taskCounts = [
            'total' => 0,
            'completed' => 0,
            'pending' => 0,
            'deadline_dekat' => 0,
            'nunggu_owner' => 0,
            'ide_nanti' => 0
        ];
        $tasks = $pdo->query("SELECT status, category FROM tasks")->fetchAll();
        $taskCounts['total'] = count($tasks);
        foreach ($tasks as $t) {
            if ($t['status'] === 'completed') {
                $taskCounts['completed']++;
            } else {
                $taskCounts['pending']++;
            }
            if (isset($taskCounts[$t['category']])) {
                $taskCounts[$t['category']]++;
            }
        }

        // 4. Fetch latest logs since last check
        $logStmt = $pdo->prepare("
            SELECT l.*, 
                   COALESCE(a.name, 'Sistem') AS agent_name, 
                   COALESCE(a.role, 'System') AS agent_role, 
                   COALESCE(a.avatar_color, '#64748b') AS agent_avatar_color
            FROM agent_logs l
            LEFT JOIN agents a ON l.agent_id = a.id
            WHERE l.id > ?
            ORDER BY l.id ASC
            LIMIT 20
        ");
        $logStmt->execute([$lastLogId]);
        $newLogs = $logStmt->fetchAll();

        if (!empty($newLogs)) {
            $lastLog = end($newLogs);
            $lastLogId = (int)$lastLog['id'];
            foreach ($newLogs as &$nl) {
                $nl['details'] = json_decode($nl['details_json'] ?? '{}', true);
            }
        }

        $payload = [
            'timestamp' => date('Y-m-d H:i:s'),
            'agents' => $agents,
            'task_counts' => $taskCounts,
            'new_logs' => $newLogs,
            'last_log_id' => $lastLogId
        ];

        echo "data: " . json_encode($payload, JSON_UNESCAPED_UNICODE) . "\n\n";
        flush();

    } catch (Exception $e) {
        echo "event: error\ndata: " . json_encode(['error' => $e->getMessage()]) . "\n\n";
        flush();
        break;
    }

    sleep(2);
}

// Send reconnect event
echo "event: cycle\ndata: {}\n\n";
flush();

