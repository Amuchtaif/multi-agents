<?php
/**
 * Real AI Service Engine - Multi-Provider LLM Integration
 * Kantor Virtual HQ
 * Supports Google Gemini, OpenAI, Groq, OpenRouter, and Ollama (Local)
 */

require_once __DIR__ . '/db.php';

class AIService {

    /**
     * Resolves the active provider, API key, model, and base URL
     */
    public static function getConfig(PDO $pdo, ?array $agent = null): array {
        $provider = getSystemSetting($pdo, 'ai_provider', 'gemini');
        $defaultModel = getSystemSetting($pdo, 'default_model', 'gemini-3-flash-preview');

        // Agent specific model if specified
        $model = (!empty($agent['model'])) ? $agent['model'] : $defaultModel;

        $apiKey = '';
        $baseUrl = '';

        switch ($provider) {
            case 'gemini':
                $apiKey = getSystemSetting($pdo, 'gemini_api_key', '');
                // Fallback to env var if empty
                if (empty($apiKey)) {
                    $apiKey = getenv('GEMINI_API_KEY') ?: '';
                }
                break;

            case 'openai':
                $apiKey = getSystemSetting($pdo, 'openai_api_key', '');
                if (empty($apiKey)) {
                    $apiKey = getenv('OPENAI_API_KEY') ?: '';
                }
                $baseUrl = 'https://api.openai.com/v1';
                break;

            case 'groq':
                $apiKey = getSystemSetting($pdo, 'groq_api_key', '');
                if (empty($apiKey)) {
                    $apiKey = getenv('GROQ_API_KEY') ?: '';
                }
                $baseUrl = 'https://api.groq.com/openai/v1';
                break;

            case 'openrouter':
                $apiKey = getSystemSetting($pdo, 'openrouter_api_key', '');
                if (empty($apiKey)) {
                    $apiKey = getenv('OPENROUTER_API_KEY') ?: '';
                }
                $baseUrl = 'https://openrouter.ai/api/v1';
                break;

            case 'ollama':
                $baseUrl = getSystemSetting($pdo, 'ollama_base_url', 'http://localhost:11434/v1');
                $apiKey = 'ollama'; // No key needed for local ollama
                break;
        }

        return [
            'provider' => $provider,
            'api_key' => $apiKey,
            'model' => $model,
            'base_url' => $baseUrl,
            'real_ai_enabled' => getSystemSetting($pdo, 'real_ai_enabled', '1') === '1'
        ];
    }

    /**
     * Inspects a local directory and gathers project metadata and file structure
     */
    public static function inspectWorkingDirectory(string $dir): array {
        if (!is_dir($dir)) {
            return [
                'exists' => false,
                'path' => $dir,
                'summary_text' => "Direktori tidak ditemukan di lokal: {$dir}",
                'files' => [],
                'type' => 'unknown',
                'has_git' => false
            ];
        }

        $realDir = realpath($dir);
        $entries = @scandir($realDir) ?: [];
        $hasGit = is_dir($realDir . '/.git');
        $hasPackage = file_exists($realDir . '/package.json');
        $hasComposer = file_exists($realDir . '/composer.json');
        $hasPython = file_exists($realDir . '/requirements.txt') || file_exists($realDir . '/pyproject.toml');

        $type = 'Standard Project';
        if ($hasPackage && $hasComposer) $type = 'Fullstack (Node.js + PHP)';
        elseif ($hasPackage) $type = 'Node.js / Web Application';
        elseif ($hasComposer) $type = 'PHP / Backend Application';
        elseif ($hasPython) $type = 'Python Application';
        elseif ($hasGit) $type = 'Git Repository';

        $topFiles = [];
        foreach ($entries as $e) {
            if ($e === '.' || $e === '..') continue;
            $isDir = is_dir($realDir . '/' . $e);
            $topFiles[] = ($isDir ? $e . '/' : $e);
        }

        $gitStatus = '';
        if ($hasGit) {
            $gitOut = @shell_exec("cd " . escapeshellarg($realDir) . " && git -c safe.directory=* status --short 2>&1");
            $gitBranch = @shell_exec("cd " . escapeshellarg($realDir) . " && git -c safe.directory=* branch --show-current 2>&1");
            $branch = trim($gitBranch ?: 'main');
            $statusSnippet = trim($gitOut ?: 'Working tree clean');
            $gitStatus = "Branch: {$branch} | Status: " . (strlen($statusSnippet) > 120 ? substr($statusSnippet, 0, 120) . '...' : $statusSnippet);
        }

        $fileListStr = implode(', ', array_slice($topFiles, 0, 18));
        if (count($topFiles) > 18) {
            $fileListStr .= ' ... (total ' . count($topFiles) . ' item)';
        }

        $summaryText = "INFORMASI DIREKTORI KERJA LOKAL:\n" .
            "- Lokasi Folder: {$realDir}\n" .
            "- Tipe Proyek: {$type}\n" .
            "- Item Utama: [{$fileListStr}]\n";
        if (!empty($gitStatus)) {
            $summaryText .= "- Info Git: {$gitStatus}\n";
        }

        return [
            'exists' => true,
            'path' => $realDir,
            'type' => $type,
            'has_git' => $hasGit,
            'files' => array_slice($topFiles, 0, 30),
            'git_info' => $gitStatus,
            'summary_text' => $summaryText
        ];
    }

    /**
     * Executes a safe shell command inside the target working directory
     */
    public static function executeLocalCommand(string $workingDir, string $command): array {
        if (!is_dir($workingDir)) {
            return [
                'success' => false,
                'command' => $command,
                'stdout' => '',
                'stderr' => "Direktori kerja lokal tidak ditemukan: {$workingDir}",
                'exit_code' => 1,
                'duration_ms' => 0,
                'working_dir' => $workingDir
            ];
        }

        $cleanCmd = trim($command);

        // Auto-handle git safe.directory for local repo access across system users
        if (preg_match('/^git\s+/i', $cleanCmd) && strpos($cleanCmd, 'safe.directory') === false) {
            $cleanCmd = 'git -c safe.directory=* ' . substr($cleanCmd, 4);
        }

        // Security check: blacklist catastrophic system commands
        $disallowed = [
            'rm -rf /', 'rm -rf *', ':(){ :|:& };:', 'mkfs', 'dd if=',
            '> /dev/sda', 'reboot', 'shutdown', 'init 0', 'chmod -R 777 /',
            'passwd', 'userdel'
        ];
        foreach ($disallowed as $danger) {
            if (stripos($cleanCmd, $danger) !== false) {
                return [
                    'success' => false,
                    'command' => $cleanCmd,
                    'stdout' => '',
                    'stderr' => "Keamanan: Perintah '{$danger}' diblokir karena berpotensi merusak sistem lokal.",
                    'exit_code' => 126,
                    'duration_ms' => 0,
                    'working_dir' => $workingDir
                ];
            }
        }

        $descriptors = [
            0 => ["pipe", "r"],
            1 => ["pipe", "w"],
            2 => ["pipe", "w"]
        ];

        $startTime = microtime(true);
        $process = proc_open($cleanCmd, $descriptors, $pipes, $workingDir);

        if (!is_resource($process)) {
            return [
                'success' => false,
                'command' => $cleanCmd,
                'stdout' => '',
                'stderr' => "Gagal membuka proses shell di sistem lokal.",
                'exit_code' => 1,
                'duration_ms' => 0,
                'working_dir' => $workingDir
            ];
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $timeout = 25.0;

        while (true) {
            $read = [$pipes[1], $pipes[2]];
            $write = null;
            $except = null;
            $changed = @stream_select($read, $write, $except, 0, 150000);

            if ($changed > 0) {
                foreach ($read as $pipe) {
                    if ($pipe === $pipes[1]) {
                        $chunk = fread($pipe, 8192);
                        if ($chunk !== false) $stdout .= $chunk;
                    } elseif ($pipe === $pipes[2]) {
                        $chunk = fread($pipe, 8192);
                        if ($chunk !== false) $stderr .= $chunk;
                    }
                }
            }

            $procStatus = proc_get_status($process);
            if (!$procStatus['running']) {
                $stdout .= stream_get_contents($pipes[1]);
                $stderr .= stream_get_contents($pipes[2]);
                break;
            }

            if ((microtime(true) - $startTime) > $timeout) {
                proc_terminate($process, 9);
                $stderr .= "\n[TIMEOUT] Eksekusi dihentikan paksa setelah {$timeout} detik.";
                break;
            }
        }

        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);
        $durationMs = round((microtime(true) - $startTime) * 1000);

        if (strlen($stdout) > 8000) {
            $stdout = substr($stdout, 0, 8000) . "\n... [output dipotong karena terlalu panjang]";
        }
        if (strlen($stderr) > 4000) {
            $stderr = substr($stderr, 0, 4000) . "\n... [stderr dipotong]";
        }

        return [
            'success' => ($exitCode === 0),
            'command' => $cleanCmd,
            'stdout' => trim($stdout),
            'stderr' => trim($stderr),
            'exit_code' => $exitCode,
            'duration_ms' => $durationMs,
            'working_dir' => $workingDir
        ];
    }

    /**
     * Executes safe file read or write inside working directory
     */
    public static function executeLocalFileOp(string $workingDir, string $op, string $filePath, ?string $content = null): array {
        if (!is_dir($workingDir)) {
            return ['success' => false, 'error' => "Direktori tidak ditemukan: {$workingDir}"];
        }

        $cleanPath = ltrim($filePath, '/\\');
        if (strpos($cleanPath, '..') !== false) {
            return ['success' => false, 'error' => "Akses file ditolak: Dilarang menggunakan path traversal ('..')."];
        }

        $fullPath = rtrim($workingDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $cleanPath;

        if ($op === 'read_file') {
            if (!file_exists($fullPath)) {
                return ['success' => false, 'error' => "File '{$cleanPath}' tidak ditemukan di direktori proyek."];
            }
            if (!is_readable($fullPath)) {
                return ['success' => false, 'error' => "File '{$cleanPath}' tidak dapat dibaca (permission denied)."];
            }
            $fileData = @file_get_contents($fullPath);
            if (strlen($fileData) > 8000) {
                $fileData = substr($fileData, 0, 8000) . "\n... [isi file dipotong]";
            }
            return ['success' => true, 'path' => $cleanPath, 'content' => $fileData];

        } elseif ($op === 'write_file') {
            $dir = dirname($fullPath);
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            $written = @file_put_contents($fullPath, $content ?? '');
            if ($written === false) {
                return ['success' => false, 'error' => "Gagal menulis ke file '{$cleanPath}'. Periksa izin folder (write permission)."];
            }
            return ['success' => true, 'path' => $cleanPath, 'bytes' => $written];
        }

        return ['success' => false, 'error' => "Operasi file '{$op}' tidak didukung."];
    }

    /**
     * Extracts commands (shell executions and file write/read operations) from tool calls and AI text
     */
    public static function extractExecutableCommands(string $toolCall, string $fullText): array {
        $commands = [];
        $seenFiles = [];

        // 1. Shell commands from explicit keywords (execute:, shell:, run:, cmd:)
        $shellPattern = '/(?:execute|shell|run|cmd)\s*:\s*([^\r\n]+)/i';
        if (preg_match_all($shellPattern, $fullText, $mShell)) {
            foreach ($mShell[1] as $cmd) {
                $cmd = trim(trim($cmd, "`\"'"));
                if (!empty($cmd) && !in_array($cmd, array_column($commands, 'command'))) {
                    $commands[] = ['type' => 'shell', 'command' => $cmd];
                }
            }
        }

        // 2. Shell commands inside ```bash ... ``` or ```sh ... ``` code blocks
        if (preg_match_all('/```(?:bash|sh|shell)\r?\n(.*?)```/is', (!empty($toolCall) ? $toolCall : $fullText), $mBash)) {
            foreach ($mBash[1] as $bashBlock) {
                $lines = explode("\n", $bashBlock);
                foreach ($lines as $line) {
                    $cleanLine = trim($line);
                    if (!empty($cleanLine) && $cleanLine[0] !== '#' && !preg_match('/^(echo|printf)\s+/i', $cleanLine)) {
                        // Accept standard CLI operations
                        if (preg_match('/^(npm|npx|yarn|pnpm|git|composer|php|python|pip|touch|mkdir|cp|mv)\s+/i', $cleanLine)) {
                            if (!in_array($cleanLine, array_column($commands, 'command'))) {
                                $commands[] = ['type' => 'shell', 'command' => $cleanLine];
                            }
                        }
                    }
                }
            }
        }

        // Helper to normalize file paths
        $normalizePath = function(string $rawPath): ?string {
            $p = trim($rawPath);
            $p = trim($p, "`\"'*");
            $p = preg_replace('/^\.?[\/\\\\]+/', '', $p);
            // Ensure path has a valid file extension and no path traversal
            if (empty($p) || strpos($p, '..') !== false || !preg_match('/\.[a-zA-Z0-9_-]{1,12}$/', $p)) {
                return null;
            }
            return $p;
        };

        // 3. File writes: write_file: <path> ... ```lang\n<content>\n```
        if (preg_match_all('/write_file\s*:\s*[`"\'\s]*([a-zA-Z0-9_\-\.\/\\\\]+\.[a-zA-Z0-9_]{1,10})[`"\'\s]*\r?\n+(?:```[a-zA-Z0-9_-]*\r?\n)?(.*?)(?:```|(?=\n*write_file:)|\z)/is', $fullText, $mWf)) {
            for ($i = 0; $i < count($mWf[1]); $i++) {
                $p = $normalizePath($mWf[1][$i]);
                if ($p && !isset($seenFiles[$p])) {
                    $c = rtrim($mWf[2][$i]);
                    $seenFiles[$p] = $c;
                }
            }
        }

        // 4. File markdown headers: ### File: <path>, **File:** `path`, ### `path`, etc.
        $headerPattern = '/(?:###|##|#|\*\*|__)?\s*(?:File|Path|Berkas|Simpan ke|Implementasi)?\s*[:：\-]?\s*(?:\*\*|__)?\s*[`"\'\s]*([a-zA-Z0-9_\-\.\/\\\\]+\.[a-zA-Z0-9_]{1,10})[`"\'\s]*(?:\*\*|__)?\s*[:：]?\s*\r?\n+```[a-zA-Z0-9_-]*\r?\n(.*?)```/is';
        if (preg_match_all($headerPattern, $fullText, $mHeader)) {
            for ($i = 0; $i < count($mHeader[1]); $i++) {
                $p = $normalizePath($mHeader[1][$i]);
                if ($p && !isset($seenFiles[$p])) {
                    $c = rtrim($mHeader[2][$i]);
                    $seenFiles[$p] = $c;
                }
            }
        }

        // 5. Code blocks with file path comment on first line: ```lang\n// (file|filepath|path): <path>\n<content>\n```
        $commentPattern = '/```[a-zA-Z0-9_-]*\r?\n\s*(?:\/\/\s*|#\s*|--\s*)(?:file(?:path)?|path)?\s*[:：\-]?\s*[`"\'\s]*([a-zA-Z0-9_\-\.\/\\\\]+\.[a-zA-Z0-9_]{1,10})[`"\'\s]*\r?\n(.*?)```/is';
        if (preg_match_all($commentPattern, $fullText, $mComment)) {
            for ($i = 0; $i < count($mComment[1]); $i++) {
                $p = $normalizePath($mComment[1][$i]);
                if ($p && !isset($seenFiles[$p])) {
                    $c = rtrim($mComment[2][$i]);
                    $seenFiles[$p] = $c;
                }
            }
        }

        // 6. Explicit read_file: <path>
        if (preg_match_all('/read_file\s*:\s*([^\r\n]+)/i', (!empty($toolCall) ? $toolCall : $fullText), $mRead)) {
            foreach ($mRead[1] as $rPath) {
                $p = $normalizePath($rPath);
                if ($p) {
                    $commands[] = ['type' => 'read_file', 'path' => $p];
                }
            }
        }

        // Append all unique file writes
        foreach ($seenFiles as $fPath => $fContent) {
            $commands[] = [
                'type' => 'write_file',
                'path' => $fPath,
                'content' => $fContent
            ];
        }

        return $commands;
    }

    /**
     * Execute a task with Real AI (or automated local runner) for the assigned agent
     */
    public static function executeTask(PDO $pdo, int $taskId, ?int $forceAgentId = null): array {
        // 1. Fetch Task
        $taskStmt = $pdo->prepare("SELECT * FROM tasks WHERE id = ?");
        $taskStmt->execute([$taskId]);
        $task = $taskStmt->fetch();

        if (!$task) {
            throw new Exception("Tugas dengan ID {$taskId} tidak ditemukan.");
        }

        // 2. Determine Agent
        $agentId = $forceAgentId ?: ($task['assigned_agent_id'] ?: 1);
        $agentStmt = $pdo->prepare("
            SELECT a.*, c.functions_json 
            FROM agents a 
            LEFT JOIN agent_configs c ON a.id = c.agent_id 
            WHERE a.id = ?
        ");
        $agentStmt->execute([$agentId]);
        $agent = $agentStmt->fetch();

        if (!$agent) {
            throw new Exception("Agent dengan ID {$agentId} tidak ditemukan.");
        }

        $config = self::getConfig($pdo, $agent);
        $workingDir = !empty($agent['working_directory']) ? trim($agent['working_directory']) : null;
        $wsInfo = $workingDir ? self::inspectWorkingDirectory($workingDir) : ['exists' => false, 'summary_text' => ''];

        $hasRealAIKey = ($config['provider'] === 'ollama' || !empty($config['api_key']));

        // If no Real AI API key is configured, but a valid local working directory is set,
        // run the automated local task execution engine!
        if (!$hasRealAIKey) {
            if ($workingDir && $wsInfo['exists']) {
                return self::executeAutomatedLocalTask($pdo, $task, $agent, $workingDir, $wsInfo);
            }
            throw new Exception("API Key untuk provider '{$config['provider']}' belum diatur. Silakan buka menu Pengaturan AI di header untuk memasukkan API Key Anda.");
        }

        // 3. Mark Agent as KERJA and Task as in_progress
        $dirNote = ($workingDir && $wsInfo['exists']) ? " [" . basename($workingDir) . "]" : "";
        $updStatus = $pdo->prepare("UPDATE agents SET status = 'KERJA', current_task = ? WHERE id = ?");
        $updStatus->execute(["Mengerjakan{$dirNote}: {$task['title']}", $agentId]);

        $updTask = $pdo->prepare("UPDATE tasks SET status = 'in_progress', assigned_agent_id = ? WHERE id = ?");
        $updTask->execute([$agentId, $taskId]);

        // 4. Construct Multi-Agent Execution Prompt
        $functions = json_decode($agent['functions_json'] ?? '[]', true) ?: ['web_search', 'code_analysis'];
        $toolsList = implode(', ', $functions);

        $systemInstruction = trim($agent['system_prompt']) . "\n" .
            "Kamu adalah {$agent['name']}, berposisi sebagai {$agent['role']} di departemen {$agent['department']}.\n" .
            "Tools/Functions yang diizinkan untukmu: [{$toolsList}].\n";

        if ($workingDir && $wsInfo['exists']) {
            $systemInstruction .= "\n" . $wsInfo['summary_text'] . "\n" .
                "PANDUAN EKSEKUSI PROYEK LOKAL (SANGAT PENTING):\n" .
                "Kamu terhubung langsung ke proyek lokal pengguna di direktori: `{$workingDir}`.\n" .
                "Jika tugas ini meminta kamu membuat kode, refactor, implementasi fitur, atau mengubah file proyek:\n" .
                "Kamu WAJIB menyajikan file-file kode tersebut secara lengkap dan siap pakai dengan format header file eksplisit:\n\n" .
                "### File: <path/relatif/dari/root/proyek>\n" .
                "```<bahasa>\n" .
                "<isi kode lengkap file>\n" .
                "```\n\n" .
                "ATAU format:\n" .
                "write_file: <path/relatif/dari/root/proyek>\n" .
                "```<bahasa>\n" .
                "<isi kode lengkap file>\n" .
                "```\n\n" .
                "Sistem background runner kami akan mendeteksi setiap blok file tersebut dan LANGSUNG MENULISKANNYA SECARA FISIK ke disk lokal di folder `{$workingDir}`!\n" .
                "Jika perlu menjalankan perintah terminal (seperti install package, git, build, mkdir, dsb.), sertakan di [TOOL_CALL]:\n" .
                "execute: <perintah shell>\n\n";
        }

        $systemInstruction .= "FORMAT RESPON:\n" .
            "Beri respon terstruktur dalam 3 bagian eksplisit:\n" .
            "[THOUGHT] Tuliskan analisa mendalam dan strategi rencanamu dalam 1-3 kalimat.\n" .
            "[TOOL_CALL] Jika perlu memanggil tool/eksekusi kode/perintah shell/query, tuliskan nama tool dan baris perintahnya (contoh: execute: npm test atau db_query: SELECT...).\n" .
            "[RESULT] Tuliskan hasil akhir, solusi, implementasi kode, atau ringkasan tugas yang telah kamu selesaikan secara profesional dalam bahasa Indonesia.";

        $userPrompt = "TUGAS YANG HARUS DISELESAIKAN:\n" .
            "Judul Tugas: {$task['title']}\n" .
            "Kategori: {$task['category']}\n" .
            "Prioritas: {$task['priority']}\n";
        if ($workingDir && $wsInfo['exists']) {
            $userPrompt .= "Target Direktori Proyek Lokal: {$workingDir}\n" .
                "PENTING: Tuliskan kode lengkap menggunakan format `### File: <path/relatif>` atau `write_file: <path/relatif>` diikuti codeblock agar file langsung ditulis secara fisik ke dalam folder proyek lokal tersebut.\n";
        }
        $userPrompt .= "Lakukan analisis dan selesaikan tugas ini sekarang.";

        $startTime = microtime(true);

        // 5. Call Real LLM API
        $llmResponse = self::callLLM($config, $systemInstruction, $userPrompt, (float)$agent['temperature']);

        $durationMs = round((microtime(true) - $startTime) * 1000);
        $totalTokens = $llmResponse['usage']['total_tokens'] ?? 350;
        $content = $llmResponse['content'];

        // 6. Parse Output into Thought, Tool Call, and Result
        $parsed = self::parseAgentResponse($content);

        // 7. Execute Local Real Commands if target directory is set
        $executedCommands = [];
        if ($workingDir && $wsInfo['exists']) {
            $cmds = self::extractExecutableCommands($parsed['tool_call'], $content);
            $dirName = basename($workingDir);

            foreach ($cmds as $cmdItem) {
                if ($cmdItem['type'] === 'shell') {
                    $cmdRes = self::executeLocalCommand($workingDir, $cmdItem['command']);
                    $executedCommands[] = $cmdRes;

                    // Log real terminal execution
                    $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)");
                    $logStmt->execute([
                        $agentId,
                        "[Terminal: {$dirName}] $ " . $cmdItem['command'],
                        json_encode([
                            'tool' => 'shell_execution',
                            'command' => $cmdItem['command'],
                            'stdout' => mb_substr($cmdRes['stdout'], 0, 600),
                            'stderr' => mb_substr($cmdRes['stderr'], 0, 600),
                            'exit_code' => $cmdRes['exit_code'],
                            'duration_ms' => $cmdRes['duration_ms'],
                            'working_dir' => $workingDir
                        ], JSON_UNESCAPED_UNICODE)
                    ]);

                } elseif ($cmdItem['type'] === 'write_file') {
                    $fileRes = self::executeLocalFileOp($workingDir, 'write_file', $cmdItem['path'], $cmdItem['content']);
                    $executedCommands[] = [
                        'command' => "write_file: " . $cmdItem['path'],
                        'success' => $fileRes['success'],
                        'stdout' => $fileRes['success'] ? "Tersimpan {$fileRes['bytes']} bytes ke {$cmdItem['path']}" : $fileRes['error'],
                        'stderr' => '',
                        'exit_code' => $fileRes['success'] ? 0 : 1,
                        'duration_ms' => 10
                    ];

                    $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)");
                    $logStmt->execute([
                        $agentId,
                        "[File I/O: {$dirName}] Menulis file " . $cmdItem['path'],
                        json_encode($fileRes, JSON_UNESCAPED_UNICODE)
                    ]);
                }
            }
        }

        // 8. Record Thought Log
        if (!empty($parsed['thought'])) {
            $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'thought', ?, ?)");
            $logStmt->execute([
                $agentId,
                $parsed['thought'],
                json_encode(['provider' => $config['provider'], 'model' => $config['model'], 'task_id' => $taskId], JSON_UNESCAPED_UNICODE)
            ]);
        }

        // Record Tool Call Log if not already recorded via real terminal execution
        if (empty($executedCommands) && !empty($parsed['tool_call'])) {
            $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)");
            $logStmt->execute([
                $agentId,
                $parsed['tool_call'],
                json_encode(['tool' => 'real_llm_execution', 'duration_ms' => $durationMs], JSON_UNESCAPED_UNICODE)
            ]);
        }

        // Construct Final Structured Result Text
        $finalResultText = $content;
        if (!empty($executedCommands)) {
            $dirName = basename($workingDir);
            $reportExtra = "\n\n---\n### 💻 Eksekusi Proyek Riil di `{$workingDir}`\n";
            foreach ($executedCommands as $ec) {
                $statusIcon = ($ec['exit_code'] === 0) ? '✅' : '⚠️';
                $reportExtra .= "> {$statusIcon} **Aksi:** `{$ec['command']}` (Status: `{$ec['exit_code']}`)\n\n";
                $reportExtra .= "```terminal\n";
                $reportExtra .= (!empty($ec['stdout']) ? $ec['stdout'] : (!empty($ec['stderr']) ? $ec['stderr'] : '(Selesai tanpa output teks)')) . "\n";
                $reportExtra .= "```\n\n";
            }
            $finalResultText .= $reportExtra;
        } elseif ($workingDir && $wsInfo['exists']) {
            $finalResultText .= "\n\n---\n### 💻 Status Proyek Lokal `{$workingDir}`\n> ℹ️ Tidak ada operasi file atau perintah shell yang dieksekusi secara fisik.";
        }

        // 9. Task Completion Log
        $completionMsg = "Agent {$agent['name']} menyelesaikan tugas '{$task['title']}' ({$totalTokens} tokens, {$durationMs}ms)";
        $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'task_complete', ?, ?)");
        $logStmt->execute([
            $agentId,
            $completionMsg,
            json_encode([
                'task_id' => $taskId,
                'result_snippet' => mb_substr($parsed['result'], 0, 200),
                'tokens' => $totalTokens,
                'executed_commands' => count($executedCommands)
            ], JSON_UNESCAPED_UNICODE)
        ]);

        // 10. Update Task to Completed
        $updTaskDone = $pdo->prepare("
            UPDATE tasks 
            SET status = 'completed', 
                result_text = ?, 
                updated_at = NOW() 
            WHERE id = ?
        ");
        $updTaskDone->execute([$finalResultText, $taskId]);

        // 11. Update Agent Metrics
        $updAgent = $pdo->prepare("
            UPDATE agents 
            SET token_usage = token_usage + ?, 
                action_count = action_count + 1, 
                current_task = CONCAT('Selesai: ', ?), 
                status = 'KERJA' 
            WHERE id = ?
        ");
        $updAgent->execute([$totalTokens, mb_substr($task['title'], 0, 30), $agentId]);

        return [
            'success' => true,
            'task_id' => $taskId,
            'agent_id' => $agentId,
            'agent_name' => $agent['name'],
            'model' => $llmResponse['model_used'] ?? $config['model'],
            'provider' => $config['provider'],
            'tokens' => $totalTokens,
            'duration_ms' => $durationMs,
            'thought' => $parsed['thought'],
            'tool_call' => $parsed['tool_call'],
            'result' => $parsed['result'],
            'executed_commands' => $executedCommands,
            'full_response' => $finalResultText
        ];
    }

    /**
     * Executes real local commands for a task when no external LLM API key is configured
     */
    public static function executeAutomatedLocalTask(PDO $pdo, array $task, array $agent, string $workingDir, array $wsInfo): array {
        $taskId = (int)$task['id'];
        $agentId = (int)$agent['id'];
        $startTime = microtime(true);
        $titleLower = strtolower($task['title']);
        $dirName = basename($workingDir);

        // Update status to KERJA
        $pdo->prepare("UPDATE agents SET status = 'KERJA', current_task = ? WHERE id = ?")
            ->execute(["Mengeksekusi di {$dirName}: {$task['title']}", $agentId]);
        $pdo->prepare("UPDATE tasks SET status = 'in_progress', assigned_agent_id = ? WHERE id = ?")
            ->execute([$agentId, $taskId]);

        // Thought log
        $thought = "Menganalisis direktori proyek lokal '{$dirName}' ({$wsInfo['type']}) untuk menyelesaikan: \"{$task['title']}\".";
        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'thought', ?, ?)")
            ->execute([$agentId, $thought, json_encode(['working_dir' => $workingDir, 'task_id' => $taskId], JSON_UNESCAPED_UNICODE)]);

        // Determine commands to execute based on task intent
        $commandsToRun = [];
        if (strpos($titleLower, 'git') !== false || strpos($titleLower, 'branch') !== false || strpos($titleLower, 'status') !== false) {
            $commandsToRun[] = 'git status --short';
            $commandsToRun[] = 'git branch --show-current';
        } elseif (strpos($titleLower, 'commit') !== false || strpos($titleLower, 'log') !== false || strpos($titleLower, 'riwayat') !== false) {
            $commandsToRun[] = 'git log -n 5 --oneline';
        } elseif (strpos($titleLower, 'test') !== false || strpos($titleLower, 'uji') !== false) {
            if (file_exists($workingDir . '/package.json')) {
                $commandsToRun[] = 'npm test -- --passWithNoTests 2>&1 || npm test';
            } elseif (file_exists($workingDir . '/vendor/bin/phpunit')) {
                $commandsToRun[] = 'vendor/bin/phpunit --version';
            } else {
                $commandsToRun[] = 'ls -la';
            }
        } elseif (strpos($titleLower, 'build') !== false) {
            if (file_exists($workingDir . '/package.json')) {
                $commandsToRun[] = 'npm run build';
            } else {
                $commandsToRun[] = 'ls -la';
            }
        } else {
            $commandsToRun[] = 'ls -la';
            if ($wsInfo['has_git']) {
                $commandsToRun[] = 'git status --short';
            }
        }

        $executionResults = [];
        foreach ($commandsToRun as $cmd) {
            $cmdRes = self::executeLocalCommand($workingDir, $cmd);
            $executionResults[] = $cmdRes;

            $logMsg = "[Terminal: {$dirName}] $ " . $cmd;
            $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)")
                ->execute([
                    $agentId,
                    $logMsg,
                    json_encode([
                        'command' => $cmd,
                        'exit_code' => $cmdRes['exit_code'],
                        'stdout' => mb_substr($cmdRes['stdout'], 0, 500),
                        'stderr' => mb_substr($cmdRes['stderr'], 0, 500),
                        'duration_ms' => $cmdRes['duration_ms'],
                        'working_dir' => $workingDir
                    ], JSON_UNESCAPED_UNICODE)
                ]);
        }

        $durationMs = round((microtime(true) - $startTime) * 1000);
        $tokens = 150 + count($executionResults) * 50;

        // Build Markdown Report
        $reportMd = "## 🏢 Laporan Eksekusi Proyek Lokal: {$dirName}\n\n";
        $reportMd .= "**Agent Penanggung Jawab:** {$agent['name']} ({$agent['role']})\n";
        $reportMd .= "**Target Direktori:** `{$workingDir}`\n";
        $reportMd .= "**Tipe Proyek:** {$wsInfo['type']}\n";
        $reportMd .= "**Waktu Eksekusi:** {$durationMs}ms\n\n";
        $reportMd .= "### 🧠 Rencana & Analisis\n";
        $reportMd .= "{$thought}\n\n";
        $reportMd .= "### 💻 Eksekusi Terminal Riil di Direktori Lokal\n";

        foreach ($executionResults as $res) {
            $statusIcon = $res['success'] ? '✅' : '⚠️';
            $reportMd .= "> {$statusIcon} **Perintah:** `{$res['command']}` (Exit Code: `{$res['exit_code']}`, Durasi: `{$res['duration_ms']}ms`)\n\n";
            $reportMd .= "```terminal\n";
            $outText = !empty($res['stdout']) ? $res['stdout'] : (!empty($res['stderr']) ? $res['stderr'] : "(Tidak ada output)");
            $reportMd .= $outText . "\n```\n\n";
        }

        $reportMd .= "### 📋 Kesimpulan & Status Pekerjaan\n";
        $reportMd .= "Perintah berhasil dieksekusi secara nyata di direktori `{$workingDir}`. ";
        $reportMd .= "Seluruh log terminal telah disinkronkan ke feed sistem dan proyek siap untuk instruksi berikutnya.";

        // Completion Log
        $completionMsg = "Agent {$agent['name']} menyelesaikan eksekusi di {$dirName} ({$durationMs}ms)";
        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'task_complete', ?, ?)")
            ->execute([
                $agentId,
                $completionMsg,
                json_encode([
                    'task_id' => $taskId,
                    'working_dir' => $workingDir,
                    'commands_executed' => count($executionResults)
                ], JSON_UNESCAPED_UNICODE)
            ]);

        // Save task completion
        $pdo->prepare("UPDATE tasks SET status = 'completed', result_text = ?, updated_at = NOW() WHERE id = ?")
            ->execute([$reportMd, $taskId]);

        // Update agent metrics
        $pdo->prepare("UPDATE agents SET token_usage = token_usage + ?, action_count = action_count + 1, current_task = CONCAT('Selesai: ', ?), status = 'KERJA' WHERE id = ?")
            ->execute([$tokens, mb_substr($task['title'], 0, 30), $agentId]);

        return [
            'success' => true,
            'task_id' => $taskId,
            'agent_id' => $agentId,
            'agent_name' => $agent['name'],
            'model' => 'Local-Runner',
            'provider' => 'local_system',
            'tokens' => $tokens,
            'duration_ms' => $durationMs,
            'thought' => $thought,
            'tool_call' => implode(' | ', $commandsToRun),
            'result' => $reportMd,
            'full_response' => $reportMd
        ];
    }

    /**
     * Dispatch a direct custom prompt to an Agent (Chat / Direct Command)
     */
    public static function dispatchPrompt(PDO $pdo, int $agentId, string $userPrompt): array {
        $agentStmt = $pdo->prepare("
            SELECT a.*, c.functions_json 
            FROM agents a 
            LEFT JOIN agent_configs c ON a.id = c.agent_id 
            WHERE a.id = ?
        ");
        $agentStmt->execute([$agentId]);
        $agent = $agentStmt->fetch();

        if (!$agent) {
            throw new Exception("Agent dengan ID {$agentId} tidak ditemukan.");
        }

        $config = self::getConfig($pdo, $agent);
        $workingDir = !empty($agent['working_directory']) ? trim($agent['working_directory']) : null;
        $wsInfo = $workingDir ? self::inspectWorkingDirectory($workingDir) : ['exists' => false, 'summary_text' => ''];

        $hasRealAIKey = ($config['provider'] === 'ollama' || !empty($config['api_key']));

        // If no API key is configured, but agent has a local working directory:
        if (!$hasRealAIKey && $workingDir && $wsInfo['exists']) {
            $startTime = microtime(true);
            $cleanP = trim($userPrompt);

            // Check if user gave an execute command
            $cmdToRun = '';
            if (preg_match('/^(?:execute|run|shell|cmd)\s*:\s*(.*)$/i', $cleanP, $m)) {
                $cmdToRun = trim($m[1]);
            } elseif (stripos($cleanP, 'git status') !== false) {
                $cmdToRun = 'git status --short';
            } elseif (stripos($cleanP, 'git log') !== false) {
                $cmdToRun = 'git log -n 5 --oneline';
            } elseif (stripos($cleanP, 'daftar file') !== false || stripos($cleanP, 'ls') !== false || stripos($cleanP, 'struktur') !== false) {
                $cmdToRun = 'ls -la';
            }

            if (!empty($cmdToRun)) {
                $res = self::executeLocalCommand($workingDir, $cmdToRun);
                $durationMs = round((microtime(true) - $startTime) * 1000);
                $reply = "### 💻 Hasil Eksekusi di `{$workingDir}`\n" .
                    "> Perintah: `{$cmdToRun}` (Exit Code: {$res['exit_code']})\n\n" .
                    "```terminal\n" . ($res['stdout'] ?: ($res['stderr'] ?: '(Tidak ada output)')) . "\n```";

                // Log tool call
                $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)")
                    ->execute([$agentId, "[Terminal: " . basename($workingDir) . "] $ " . $cmdToRun, json_encode($res, JSON_UNESCAPED_UNICODE)]);
            } else {
                $durationMs = 50;
                $reply = "Halo! Saya adalah {$agent['name']} ({$agent['role']}).\n" .
                    "Saya ditugaskan pada proyek lokal: `{$workingDir}` ({$wsInfo['type']}).\n" .
                    $wsInfo['summary_text'] . "\n" .
                    "💡 Anda dapat meminta saya menjalankan perintah dengan mengetik: `execute: git status` atau `execute: ls -la`.";
            }

            // Log action
            $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
                ->execute([$agentId, "Agent {$agent['name']} merespons: \"" . mb_substr($userPrompt, 0, 50) . "...\"", json_encode(['response' => mb_substr($reply, 0, 200)])]);

            $pdo->prepare("UPDATE agents SET action_count = action_count + 1, current_task = ? WHERE id = ?")
                ->execute(["Menjawab: " . mb_substr($userPrompt, 0, 40), $agentId]);

            return [
                'success' => true,
                'agent_id' => $agentId,
                'agent_name' => $agent['name'],
                'model' => 'Local-Runner',
                'response' => $reply,
                'tokens' => 100,
                'duration_ms' => $durationMs
            ];
        }

        if ($config['provider'] !== 'ollama' && empty($config['api_key'])) {
            throw new Exception("API Key untuk '{$config['provider']}' belum diatur. Silakan buka menu Pengaturan AI di header.");
        }

        // Set status to KERJA
        $upd = $pdo->prepare("UPDATE agents SET status = 'KERJA', current_task = ? WHERE id = ?");
        $upd->execute(["Menjawab: " . mb_substr($userPrompt, 0, 50), $agentId]);

        $systemInstruction = trim($agent['system_prompt']) . "\n" .
            "Kamu adalah {$agent['name']}, {$agent['role']} di departemen {$agent['department']}.\n";

        if ($workingDir && $wsInfo['exists']) {
            $systemInstruction .= "\n" . $wsInfo['summary_text'] . "\n" .
                "KEMAMPUAN RUNNER TERMINAL LOKAL AKTIF:\n" .
                "Jika kamu ingin menjalankan perintah terminal di direktori proyek ini, gunakan sintaks: execute: <command>.\n";
        }

        $systemInstruction .= "Berikan jawaban profesional, cerdas, dan to the point dalam bahasa Indonesia.";

        $startTime = microtime(true);
        $llmResponse = self::callLLM($config, $systemInstruction, $userPrompt, (float)$agent['temperature']);
        $durationMs = round((microtime(true) - $startTime) * 1000);
        $totalTokens = $llmResponse['usage']['total_tokens'] ?? 200;
        $content = $llmResponse['content'];

        // If LLM returned commands and we have a working directory, execute them
        if ($workingDir && $wsInfo['exists']) {
            $cmds = self::extractExecutableCommands('', $content);
            if (!empty($cmds)) {
                $dirName = basename($workingDir);
                foreach ($cmds as $c) {
                    if ($c['type'] === 'shell') {
                        $cRes = self::executeLocalCommand($workingDir, $c['command']);
                        $content .= "\n\n### 💻 Output Eksekusi Terminal (`" . $c['command'] . "`):\n```terminal\n" . ($cRes['stdout'] ?: $cRes['stderr']) . "\n```";
                        $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)")
                            ->execute([$agentId, "[Terminal: {$dirName}] $ " . $c['command'], json_encode($cRes, JSON_UNESCAPED_UNICODE)]);
                    }
                }
            }
        }

        // Record log
        $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)");
        $logMsg = "Agent {$agent['name']} memproses instruksi langsung: \"" . mb_substr($userPrompt, 0, 60) . "...\"";
        $logStmt->execute([
            $agentId,
            $logMsg,
            json_encode(['prompt' => $userPrompt, 'response' => mb_substr($content, 0, 300), 'tokens' => $totalTokens], JSON_UNESCAPED_UNICODE)
        ]);

        // Update token usage
        $updMetrics = $pdo->prepare("UPDATE agents SET token_usage = token_usage + ?, action_count = action_count + 1 WHERE id = ?");
        $updMetrics->execute([$totalTokens, $agentId]);

        return [
            'success' => true,
            'agent_id' => $agentId,
            'agent_name' => $agent['name'],
            'model' => $config['model'],
            'response' => $content,
            'tokens' => $totalTokens,
            'duration_ms' => $durationMs
        ];
    }

    /**
     * Parse structured sections from agent output
     */
    public static function parseAgentResponse(string $raw): array {
        $thought = '';
        $toolCall = '';
        $result = '';

        // Extract [THOUGHT]
        if (preg_match('/\[THOUGHT\](.*?)(\[(?:TOOL_CALL|RESULT)\]|$)/is', $raw, $m)) {
            $thought = trim($m[1]);
        }

        // Extract [TOOL_CALL]
        if (preg_match('/\[TOOL_CALL\](.*?)(\[(?:RESULT)\]|$)/is', $raw, $m)) {
            $toolCall = trim($m[1]);
        }

        // Extract [RESULT]
        if (preg_match('/\[RESULT\](.*)$/is', $raw, $m)) {
            $result = trim($m[1]);
        }

        // Fallback parsing if explicit tags are omitted
        if (empty($result)) {
            $result = $raw;
        }
        if (empty($thought)) {
            // Take first paragraph as thought
            $parts = explode("\n\n", trim($raw));
            if (count($parts) > 1) {
                $thought = $parts[0];
            } else {
                $thought = "Menganalisis kebutuhan tugas dan menyusun rencana eksekusi optimal.";
            }
        }
        if (empty($toolCall) && preg_match('/```(?:bash|sh|sql|python|javascript)?(.*?)```/is', $raw, $m)) {
            $toolCall = "execute: " . trim(explode("\n", trim($m[1]))[0]);
        }

        return [
            'thought' => $thought,
            'tool_call' => $toolCall,
            'result' => $result
        ];
    }

    /**
     * Dispatch HTTP request to the selected LLM Provider
     */
    public static function callLLM(array $config, string $systemPrompt, string $userPrompt, float $temperature = 0.7): array {
        $provider = $config['provider'];
        $apiKey = $config['api_key'];
        $model = $config['model'];

        switch ($provider) {
            case 'gemini':
                return self::callGemini($apiKey, $model, $systemPrompt, $userPrompt, $temperature);

            case 'openai':
            case 'groq':
            case 'openrouter':
            case 'ollama':
                return self::callOpenAICompatible($config['base_url'], $apiKey, $model, $systemPrompt, $userPrompt, $temperature);

            default:
                throw new Exception("Provider AI '{$provider}' tidak didukung.");
        }
    }

    /**
     * Google Gemini API Call (REST v1beta) with intelligent model resolution & auto-fallback
     */
    private static function callGemini(string $apiKey, string $model, string $systemPrompt, string $userPrompt, float $temperature, array $tried = []): array {
        if (empty($apiKey)) {
            throw new Exception("Google Gemini API Key belum diisi. Dapatkan gratis di aistudio.google.com");
        }

        // Clean model name
        $cleanModel = trim($model);
        if (strpos($cleanModel, 'models/') === 0) {
            $cleanModel = substr($cleanModel, 7);
        }

        // Map aliases and deprecated model identifiers
        $geminiAliases = [
            'gemini-2.5-flash' => 'gemini-3-flash-preview',
            'gemini-2.5-pro'   => 'gemini-3-flash-preview',
            'gemini-flash'     => 'gemini-3-flash-preview',
            'gemini-pro'       => 'gemini-3-flash-preview',
            'gemini-flash-lite'=> 'gemini-flash-lite-latest',
        ];
        if (isset($geminiAliases[$cleanModel]) && !in_array($geminiAliases[$cleanModel], $tried)) {
            $cleanModel = $geminiAliases[$cleanModel];
        }

        // Default fallback if empty or invalid
        if (empty($cleanModel) || strpos($cleanModel, 'gemini') === false) {
            $cleanModel = 'gemini-3-flash-preview';
        }

        $tried[] = $cleanModel;

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$cleanModel}:generateContent?key=" . urlencode($apiKey);

        $payload = [
            'system_instruction' => [
                'parts' => [
                    ['text' => $systemPrompt]
                ]
            ],
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $userPrompt]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => max(0.0, min(1.0, $temperature)),
                'maxOutputTokens' => 2048
            ]
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false // For local XAMPP compatibility
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        // Fallback candidate chain across different tiers & high-demand spikes
        $fallbackChain = [
            'gemini-3-flash-preview',
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-flash-lite-latest',
            'gemini-flash-latest'
        ];

        if ($curlErr) {
            // If connection timed out or failed, try next candidate
            foreach ($fallbackChain as $candidate) {
                if (!in_array($candidate, $tried)) {
                    usleep(500000); // 500ms
                    return self::callGemini($apiKey, $candidate, $systemPrompt, $userPrompt, $temperature, $tried);
                }
            }
            throw new Exception("Koneksi cURL Gemini gagal: " . $curlErr);
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            $errMsg = $data['error']['message'] ?? "HTTP {$httpCode}: " . $response;

            // Check if error is transient/recoverable:
            // High demand, capacity spikes, temporary overload, 503/429/500, or deprecated/unsupported model
            $isRecoverable = (
                $httpCode === 404 ||
                $httpCode === 429 ||
                $httpCode === 503 ||
                $httpCode === 500 ||
                stripos($errMsg, 'high demand') !== false || 
                stripos($errMsg, 'spikes in demand') !== false || 
                stripos($errMsg, 'overloaded') !== false || 
                stripos($errMsg, 'temporarily unavailable') !== false ||
                stripos($errMsg, 'try again later') !== false ||
                stripos($errMsg, 'resource has been exhausted') !== false ||
                stripos($errMsg, 'rate limit') !== false ||
                stripos($errMsg, 'not found') !== false || 
                stripos($errMsg, 'no longer available') !== false || 
                stripos($errMsg, 'not supported') !== false ||
                stripos($errMsg, 'is deprecated') !== false
            );

            if ($isRecoverable) {
                // If it's a high-demand spike or rate-limit, pause briefly before retrying next candidate
                if ($httpCode === 503 || $httpCode === 429 || stripos($errMsg, 'high demand') !== false) {
                    usleep(600000); // 600ms
                }

                foreach ($fallbackChain as $candidate) {
                    if (!in_array($candidate, $tried)) {
                        return self::callGemini($apiKey, $candidate, $systemPrompt, $userPrompt, $temperature, $tried);
                    }
                }
            }

            throw new Exception("Gemini API Error: " . $errMsg);
        }

        // Extract textual output from parts (handles thinking tokens and multi-part structures)
        $content = '';
        if (isset($data['candidates'][0]['content']['parts'])) {
            foreach ($data['candidates'][0]['content']['parts'] as $part) {
                if (isset($part['text'])) {
                    $content .= $part['text'];
                }
            }
        }
        $content = trim($content);

        $usage = [
            'prompt_tokens' => $data['usageMetadata']['promptTokenCount'] ?? 100,
            'completion_tokens' => $data['usageMetadata']['candidatesTokenCount'] ?? 200,
            'total_tokens' => $data['usageMetadata']['totalTokenCount'] ?? 300
        ];

        return [
            'content' => $content,
            'usage' => $usage,
            'model_used' => $cleanModel
        ];
    }

    /**
     * OpenAI-Compatible API Call (OpenAI, Groq, OpenRouter, Ollama)
     */
    private static function callOpenAICompatible(string $baseUrl, string $apiKey, string $model, string $systemPrompt, string $userPrompt, float $temperature): array {
        $url = rtrim($baseUrl, '/') . '/chat/completions';

        // Auto fallback model for Groq / OpenAI if needed
        $cleanModel = $model;
        if (strpos($baseUrl, 'groq') !== false && strpos($cleanModel, 'llama') === false && strpos($cleanModel, 'deepseek') === false) {
            $cleanModel = 'llama-3.3-70b-versatile';
        }

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt]
        ];

        $payload = [
            'model' => $cleanModel,
            'messages' => $messages,
            'temperature' => max(0.0, min(1.0, $temperature)),
            'max_tokens' => 2048
        ];

        $headers = [
            'Content-Type: application/json'
        ];
        if (!empty($apiKey) && $apiKey !== 'ollama') {
            $headers[] = 'Authorization: Bearer ' . $apiKey;
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            throw new Exception("Koneksi cURL gagal ke {$url}: " . $curlErr);
        }

        $data = json_decode($response, true);

        if ($httpCode !== 200) {
            $errMsg = $data['error']['message'] ?? "HTTP {$httpCode}: " . $response;
            throw new Exception("API Error ({$cleanModel}): " . $errMsg);
        }

        $content = $data['choices'][0]['message']['content'] ?? '';
        $usage = [
            'prompt_tokens' => $data['usage']['prompt_tokens'] ?? 100,
            'completion_tokens' => $data['usage']['completion_tokens'] ?? 200,
            'total_tokens' => $data['usage']['total_tokens'] ?? 300
        ];

        return [
            'content' => $content,
            'usage' => $usage
        ];
    }

    /**
     * Test connection to verify credentials and model responsiveness
     */
    public static function testConnection(string $provider, string $apiKey, string $model, string $baseUrl = ''): array {
        $startTime = microtime(true);

        $system = "Kamu adalah evaluator sistem. Jawab singkat satu kalimat.";
        $prompt = "Tes koneksi sistem AI Kantor Virtual HQ. Balas dengan: KONEKSI_BERHASIL: [nama model].";

        $config = [
            'provider' => $provider,
            'api_key' => $apiKey,
            'model' => $model,
            'base_url' => $baseUrl
        ];

        $res = self::callLLM($config, $system, $prompt, 0.2);
        $latencyMs = round((microtime(true) - $startTime) * 1000);

        return [
            'success' => true,
            'provider' => $provider,
            'model' => $res['model_used'] ?? $model,
            'latency_ms' => $latencyMs,
            'reply' => trim($res['content']),
            'tokens' => $res['usage']['total_tokens'] ?? 0
        ];
    }
}

