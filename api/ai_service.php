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
     * Execute a task with Real AI for the assigned agent
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

        // Check if real AI is configured
        if ($config['provider'] !== 'ollama' && empty($config['api_key'])) {
            throw new Exception("API Key untuk provider '{$config['provider']}' belum diatur. Silakan buka menu Pengaturan AI di header untuk memasukkan API Key Anda.");
        }

        // 3. Mark Agent as KERJA and Task as in_progress
        $updStatus = $pdo->prepare("UPDATE agents SET status = 'KERJA', current_task = ? WHERE id = ?");
        $updStatus->execute(["Mengerjakan: {$task['title']}", $agentId]);

        $updTask = $pdo->prepare("UPDATE tasks SET status = 'in_progress', assigned_agent_id = ? WHERE id = ?");
        $updTask->execute([$agentId, $taskId]);

        // 4. Construct Multi-Agent Execution Prompt
        $functions = json_decode($agent['functions_json'] ?? '[]', true) ?: ['web_search', 'code_analysis'];
        $toolsList = implode(', ', $functions);

        $systemInstruction = trim($agent['system_prompt']) . "\n" .
            "Kamu adalah {$agent['name']}, berposisi sebagai {$agent['role']} di departemen {$agent['department']}.\n" .
            "Tools/Functions yang diizinkan untukmu: [{$toolsList}].\n" .
            "FORMAT RESPON:\n" .
            "Beri respon terstruktur dalam 3 bagian eksplisit:\n" .
            "[THOUGHT] Tuliskan analisa mendalam dan strategi rencanamu dalam 1-3 kalimat.\n" .
            "[TOOL_CALL] Jika perlu memanggil tool/eksekusi kode/perintah shell/query, tuliskan nama tool dan baris perintahnya (contoh: execute: npm test atau db_query: SELECT...).\n" .
            "[RESULT] Tuliskan hasil akhir, solusi, implementasi kode, atau ringkasan tugas yang telah kamu selesaikan secara profesional dalam bahasa Indonesia.";

        $userPrompt = "TUGAS YANG HARUS DISELESAIKAN:\n" .
            "Judul Tugas: {$task['title']}\n" .
            "Kategori: {$task['category']}\n" .
            "Prioritas: {$task['priority']}\n" .
            "Lakukan analisis dan selesaikan tugas ini sekarang.";

        $startTime = microtime(true);

        // 5. Call Real LLM API
        $llmResponse = self::callLLM($config, $systemInstruction, $userPrompt, (float)$agent['temperature']);

        $durationMs = round((microtime(true) - $startTime) * 1000);
        $totalTokens = $llmResponse['usage']['total_tokens'] ?? 350;
        $content = $llmResponse['content'];

        // 6. Parse Output into Thought, Tool Call, and Result
        $parsed = self::parseAgentResponse($content);

        // 7. Record Logs into Database
        // A. Thought Log
        if (!empty($parsed['thought'])) {
            $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'thought', ?, ?)");
            $logStmt->execute([
                $agentId,
                $parsed['thought'],
                json_encode(['provider' => $config['provider'], 'model' => $config['model'], 'task_id' => $taskId], JSON_UNESCAPED_UNICODE)
            ]);
        }

        // B. Tool Call Log
        if (!empty($parsed['tool_call'])) {
            $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'tool_call', ?, ?)");
            $logStmt->execute([
                $agentId,
                $parsed['tool_call'],
                json_encode(['tool' => 'real_llm_execution', 'duration_ms' => $durationMs], JSON_UNESCAPED_UNICODE)
            ]);
        }

        // C. Task Completion Log
        $completionMsg = "Agent {$agent['name']} menyelesaikan tugas '{$task['title']}' ({$totalTokens} tokens, {$durationMs}ms)";
        $logStmt = $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'task_complete', ?, ?)");
        $logStmt->execute([
            $agentId,
            $completionMsg,
            json_encode([
                'task_id' => $taskId,
                'result_snippet' => mb_substr($parsed['result'], 0, 200),
                'tokens' => $totalTokens
            ], JSON_UNESCAPED_UNICODE)
        ]);

        // 8. Update Task to Completed
        $updTaskDone = $pdo->prepare("
            UPDATE tasks 
            SET status = 'completed', 
                result_text = ?, 
                updated_at = NOW() 
            WHERE id = ?
        ");
        $updTaskDone->execute([$content, $taskId]);

        // 9. Update Agent Metrics (Actual Real Tokens!)
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
            'full_response' => $content
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

        if ($config['provider'] !== 'ollama' && empty($config['api_key'])) {
            throw new Exception("API Key untuk '{$config['provider']}' belum diatur. Silakan buka menu Pengaturan AI di header.");
        }

        // Set status to KERJA
        $upd = $pdo->prepare("UPDATE agents SET status = 'KERJA', current_task = ? WHERE id = ?");
        $upd->execute(["Menjawab: " . mb_substr($userPrompt, 0, 50), $agentId]);

        $systemInstruction = trim($agent['system_prompt']) . "\n" .
            "Kamu adalah {$agent['name']}, {$agent['role']} di departemen {$agent['department']}.\n" .
            "Berikan jawaban profesional, cerdas, dan to the point dalam bahasa Indonesia.";

        $startTime = microtime(true);
        $llmResponse = self::callLLM($config, $systemInstruction, $userPrompt, (float)$agent['temperature']);
        $durationMs = round((microtime(true) - $startTime) * 1000);
        $totalTokens = $llmResponse['usage']['total_tokens'] ?? 200;
        $content = $llmResponse['content'];

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

