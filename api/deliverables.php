<?php
/**
 * Deliverables & Artifacts Viewer API
 * Kantor Virtual HQ
 * Provides detailed deliverable inspection, code syntax detection, physical file download, and Git Diff Viewer.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

$action = $_GET['action'] ?? '';
$taskId = isset($_GET['task_id']) ? (int)$_GET['task_id'] : 0;

if ($action === 'download') {
    handleDownloadFile($pdo);
    exit;
}

if ($taskId > 0) {
    handleGetTaskDeliverables($pdo, $taskId);
} else {
    handleListAllDeliverables($pdo);
}

/**
 * Returns structured deliverables and Git Diff for a specific task
 */
function handleGetTaskDeliverables(PDO $pdo, int $taskId) {
    $stmt = $pdo->prepare("
        SELECT t.*, a.name AS agent_name, a.role AS agent_role, a.avatar_color, a.working_directory
        FROM tasks t
        LEFT JOIN agents a ON t.assigned_agent_id = a.id
        WHERE t.id = ?
    ");
    $stmt->execute([$taskId]);
    $task = $stmt->fetch();

    if (!$task) {
        sendJsonResponse(['success' => false, 'error' => 'Tugas tidak ditemukan'], 404);
    }

    $rawResult = $task['result_text'] ?? '';
    $workingDir = !empty($task['working_directory']) ? trim($task['working_directory']) : null;

    // 1. Extract file deliverables
    $deliverables = [];
    $cmds = AIService::extractExecutableCommands('', $rawResult);

    foreach ($cmds as $cmd) {
        if ($cmd['type'] === 'write_file') {
            $filePath = $cmd['path'];
            $content = $cmd['content'] ?? '';
            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

            $lang = 'plaintext';
            $langMap = [
                'ts' => 'typescript', 'tsx' => 'typescript', 'js' => 'javascript', 'jsx' => 'javascript',
                'php' => 'php', 'py' => 'python', 'json' => 'json', 'md' => 'markdown',
                'html' => 'html', 'css' => 'css', 'sql' => 'sql', 'sh' => 'bash', 'yaml' => 'yaml', 'yml' => 'yaml'
            ];
            if (isset($langMap[$ext])) $lang = $langMap[$ext];

            // Check if file exists on disk
            $existsOnDisk = false;
            $diskBytes = 0;
            if ($workingDir && is_dir($workingDir)) {
                $fullDiskPath = rtrim($workingDir, '/\\') . '/' . ltrim($filePath, '/\\');
                if (file_exists($fullDiskPath)) {
                    $existsOnDisk = true;
                    $diskBytes = filesize($fullDiskPath);
                }
            }

            $deliverables[] = [
                'path' => $filePath,
                'filename' => basename($filePath),
                'language' => $lang,
                'extension' => $ext,
                'size_bytes' => strlen($content),
                'content' => $content,
                'exists_on_disk' => $existsOnDisk,
                'disk_bytes' => $diskBytes
            ];
        }
    }

    // 2. Compute Git Diff if project has git repo
    $gitDiffOutput = "";
    $gitStatusOutput = "";
    if ($workingDir && is_dir($workingDir . '/.git')) {
        $diffRes = AIService::executeLocalCommand($workingDir, 'git diff --color=never');
        if ($diffRes['success'] && !empty($diffRes['stdout'])) {
            $gitDiffOutput = $diffRes['stdout'];
        }

        $statRes = AIService::executeLocalCommand($workingDir, 'git status --short');
        if ($statRes['success'] && !empty($statRes['stdout'])) {
            $gitStatusOutput = $statRes['stdout'];
        }
    }

    sendJsonResponse([
        'success' => true,
        'task' => [
            'id' => $task['id'],
            'title' => $task['title'],
            'agent_name' => $task['agent_name'] ?? 'Unassigned',
            'agent_role' => $task['agent_role'] ?? '',
            'avatar_color' => $task['avatar_color'] ?? '#3b82f6',
            'working_directory' => $workingDir,
            'completed_at' => $task['updated_at']
        ],
        'total_files' => count($deliverables),
        'deliverables' => $deliverables,
        'git' => [
            'has_git' => !empty($workingDir) && is_dir($workingDir . '/.git'),
            'status' => $gitStatusOutput,
            'diff' => $gitDiffOutput
        ],
        'raw_text' => $rawResult
    ]);
}

/**
 * Lists all tasks that have generated deliverables
 */
function handleListAllDeliverables(PDO $pdo) {
    $stmt = $pdo->query("
        SELECT t.id, t.title, t.status, t.updated_at,
               a.name AS agent_name, a.role AS agent_role, a.avatar_color, a.working_directory
        FROM tasks t
        LEFT JOIN agents a ON t.assigned_agent_id = a.id
        WHERE t.status = 'completed' AND t.result_text IS NOT NULL AND t.result_text != ''
        ORDER BY t.id DESC
        LIMIT 40
    ");
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];
    foreach ($tasks as $t) {
        $cmds = AIService::extractExecutableCommands('', $t['result_text'] ?? '');
        $files = [];
        foreach ($cmds as $c) {
            if ($c['type'] === 'write_file') {
                $files[] = $c['path'];
            }
        }

        if (!empty($files) || !empty($t['working_directory'])) {
            $items[] = [
                'task_id' => $t['id'],
                'title' => $t['title'],
                'agent_name' => $t['agent_name'] ?? 'Unassigned',
                'agent_role' => $t['agent_role'] ?? '',
                'avatar_color' => $t['avatar_color'] ?? '#3b82f6',
                'working_directory' => $t['working_directory'],
                'files' => $files,
                'file_count' => count($files),
                'updated_at' => $t['updated_at']
            ];
        }
    }

    sendJsonResponse([
        'success' => true,
        'total' => count($items),
        'data' => $items
    ]);
}

/**
 * Serves a deliverable file for download
 */
function handleDownloadFile(PDO $pdo) {
    $taskId = (int)($_GET['task_id'] ?? 0);
    $filePath = trim($_GET['file'] ?? '');

    if (!$taskId || empty($filePath)) {
        header('Content-Type: text/plain');
        http_response_code(400);
        echo 'Parameter task_id dan file wajib disertakan.';
        exit;
    }

    $stmt = $pdo->prepare("SELECT result_text, working_directory FROM tasks t LEFT JOIN agents a ON t.assigned_agent_id = a.id WHERE t.id = ?");
    $stmt->execute([$taskId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo 'Tugas tidak ditemukan.';
        exit;
    }

    // Try reading physical file first
    $content = null;
    $workingDir = $row['working_directory'];
    if (!empty($workingDir) && is_dir($workingDir)) {
        $realFile = rtrim($workingDir, '/\\') . '/' . ltrim($filePath, '/\\');
        if (file_exists($realFile) && is_readable($realFile)) {
            $content = file_get_contents($realFile);
        }
    }

    // If not on disk, search in result_text
    if ($content === null) {
        $cmds = AIService::extractExecutableCommands('', $row['result_text'] ?? '');
        foreach ($cmds as $c) {
            if ($c['type'] === 'write_file' && $c['path'] === $filePath) {
                $content = $c['content'];
                break;
            }
        }
    }

    if ($content === null) {
        http_response_code(404);
        echo "File '{$filePath}' tidak ditemukan dalam deliverable tugas.";
        exit;
    }

    $filename = basename($filePath);
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($content));
    echo $content;
    exit;
}

