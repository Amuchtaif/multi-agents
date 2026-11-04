<?php
/**
 * Settings API - AI Provider & System Configuration
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetSettings($pdo);
        break;

    case 'POST':
    case 'PUT':
        $action = $_GET['action'] ?? '';
        if ($action === 'test') {
            handleTestAIConnection($pdo);
        } else {
            handleSaveSettings($pdo);
        }
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve AI Settings with masked keys
 */
function handleGetSettings(PDO $pdo) {
    $keys = [
        'ai_provider' => 'gemini',
        'gemini_api_key' => '',
        'openai_api_key' => '',
        'groq_api_key' => '',
        'openrouter_api_key' => '',
        'ollama_base_url' => 'http://localhost:11434/v1',
        'default_model' => 'gemini-3-flash-preview',
        'real_ai_enabled' => '1',
        'auto_execution' => '0'
    ];

    $response = [];
    foreach ($keys as $k => $default) {
        $val = getSystemSetting($pdo, $k, $default);
        if (strpos($k, '_api_key') !== false) {
            $response['has_' . $k] = !empty($val);
            $response[$k . '_masked'] = maskKey($val);
        } else {
            $response[$k] = $val;
        }
    }

    sendJsonResponse([
        'success' => true,
        'data' => $response
    ]);
}

/**
 * POST / PUT: Save settings
 */
function handleSaveSettings(PDO $pdo) {
    $input = getJsonInput();

    $allowedKeys = [
        'ai_provider',
        'gemini_api_key',
        'openai_api_key',
        'groq_api_key',
        'openrouter_api_key',
        'ollama_base_url',
        'default_model',
        'real_ai_enabled',
        'auto_execution'
    ];

    $updated = [];

    foreach ($allowedKeys as $k) {
        if (isset($input[$k])) {
            $val = trim((string)$input[$k]);
            // If it's an API key and user passed empty string or mask, don't overwrite if existing key exists
            if (strpos($k, '_api_key') !== false) {
                if ($val === '' || strpos($val, '••••') !== false) {
                    continue; // Skip saving empty or masked placeholder
                }
            }
            setSystemSetting($pdo, $k, $val);
            $updated[$k] = true;
        }
    }

    sendJsonResponse([
        'success' => true,
        'message' => 'Pengaturan AI berhasil disimpan',
        'updated_keys' => array_keys($updated)
    ]);
}

/**
 * POST action=test: Test live connection to the AI provider
 */
function handleTestAIConnection(PDO $pdo) {
    $input = getJsonInput();

    $provider = trim($input['provider'] ?? getSystemSetting($pdo, 'ai_provider', 'gemini'));
    $model = trim($input['model'] ?? getSystemSetting($pdo, 'default_model', 'gemini-3-flash-preview'));
    $apiKey = trim($input['api_key'] ?? '');
    $baseUrl = trim($input['base_url'] ?? '');

    // Fallback to saved key if empty
    if (empty($apiKey)) {
        $keyName = $provider . '_api_key';
        $apiKey = getSystemSetting($pdo, $keyName, '');
    }

    if (empty($baseUrl) && $provider === 'ollama') {
        $baseUrl = getSystemSetting($pdo, 'ollama_base_url', 'http://localhost:11434/v1');
    }

    try {
        $testResult = AIService::testConnection($provider, $apiKey, $model, $baseUrl);
        sendJsonResponse([
            'success' => true,
            'message' => "Koneksi ke {$provider} ({$model}) BERHASIL!",
            'data' => $testResult
        ]);
    } catch (Exception $e) {
        sendJsonResponse([
            'success' => false,
            'error' => $e->getMessage()
        ], 400);
    }
}

/**
 * Mask sensitive API key string
 */
function maskKey(string $key): string {
    if (empty($key)) return '';
    $len = strlen($key);
    if ($len <= 8) return '••••••••';
    return substr($key, 0, 4) . '••••••••' . substr($key, -4);
}

