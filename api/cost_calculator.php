<?php
/**
 * Real API Cost Calculator & Weekly Budget Alert API
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetCostMetrics($pdo);
        break;

    case 'POST':
    case 'PUT':
        $input = getJsonInput();
        handleUpdateBudget($pdo, $input);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * Pricing rates per 1,000,000 tokens (USD)
 */
function getModelRateUsd(string $model): array {
    $modelLower = strtolower($model);

    if (strpos($modelLower, 'gemini') !== false) {
        return ['input' => 0.10, 'output' => 0.40, 'avg' => 0.25, 'name' => 'Google Gemini Flash'];
    }
    if (strpos($modelLower, 'claude') !== false) {
        return ['input' => 3.00, 'output' => 15.00, 'avg' => 9.00, 'name' => 'Anthropic Claude'];
    }
    if (strpos($modelLower, 'gpt-4o') !== false || strpos($modelLower, 'openai') !== false) {
        return ['input' => 2.50, 'output' => 10.00, 'avg' => 6.25, 'name' => 'OpenAI GPT-4o'];
    }
    if (strpos($modelLower, 'llama') !== false || strpos($modelLower, 'ollama') !== false) {
        return ['input' => 0.00, 'output' => 0.00, 'avg' => 0.00, 'name' => 'Local Ollama (Gratis)'];
    }

    return ['input' => 0.20, 'output' => 0.60, 'avg' => 0.40, 'name' => 'Standard LLM'];
}

/**
 * GET: Calculate token costs across all agents and models
 */
function handleGetCostMetrics(PDO $pdo) {
    $budgetUsd = (float)getSystemSetting($pdo, 'weekly_budget_usd', '50.00');
    $exchangeRate = (float)getSystemSetting($pdo, 'usd_to_idr_rate', '16200');

    // Fetch agents and their token usage
    $stmt = $pdo->query("SELECT id, name, role, department, avatar_color, model, token_usage, action_count FROM agents ORDER BY token_usage DESC");
    $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalTokens = 0;
    $totalCostUsd = 0.0;
    $agentBreakdown = [];

    foreach ($agents as $ag) {
        $tokens = (int)$ag['token_usage'];
        $model = $ag['model'] ?: 'gemini-3-flash-preview';
        $rate = getModelRateUsd($model);

        // Cost estimation: tokens / 1,000,000 * avg rate
        $costUsd = ($tokens / 1000000.0) * $rate['avg'];
        $costIdr = $costUsd * $exchangeRate;

        $totalTokens += $tokens;
        $totalCostUsd += $costUsd;

        $agentBreakdown[] = [
            'id' => $ag['id'],
            'name' => $ag['name'],
            'role' => $ag['role'],
            'avatar_color' => $ag['avatar_color'],
            'model' => $model,
            'model_name' => $rate['name'],
            'tokens' => $tokens,
            'cost_usd' => round($costUsd, 4),
            'cost_idr' => round($costIdr, 0)
        ];
    }

    $totalCostIdr = $totalCostUsd * $exchangeRate;
    $budgetUsedPct = $budgetUsd > 0 ? min(100.0, round(($totalCostUsd / $budgetUsd) * 100, 1)) : 0;
    $isExceeded = $totalCostUsd >= $budgetUsd;
    $isWarning = $budgetUsedPct >= 80.0;

    sendJsonResponse([
        'success' => true,
        'summary' => [
            'total_tokens' => $totalTokens,
            'total_cost_usd' => round($totalCostUsd, 4),
            'total_cost_idr' => round($totalCostIdr, 0),
            'total_cost_idr_formatted' => 'Rp ' . number_format($totalCostIdr, 0, ',', '.'),
            'weekly_budget_usd' => $budgetUsd,
            'weekly_budget_idr' => round($budgetUsd * $exchangeRate, 0),
            'weekly_budget_idr_formatted' => 'Rp ' . number_format($budgetUsd * $exchangeRate, 0, ',', '.'),
            'budget_used_percentage' => $budgetUsedPct,
            'is_warning' => $isWarning,
            'is_exceeded' => $isExceeded,
            'exchange_rate' => $exchangeRate
        ],
        'agents' => $agentBreakdown
    ]);
}

/**
 * POST/PUT: Update weekly budget limit & exchange rate
 */
function handleUpdateBudget(PDO $pdo, array $input) {
    if (isset($input['weekly_budget_usd'])) {
        $budget = max(1.0, (float)$input['weekly_budget_usd']);
        setSystemSetting($pdo, 'weekly_budget_usd', number_format($budget, 2, '.', ''));
    }

    if (isset($input['usd_to_idr_rate'])) {
        $rate = max(1000.0, (float)$input['usd_to_idr_rate']);
        setSystemSetting($pdo, 'usd_to_idr_rate', number_format($rate, 0, '.', ''));
    }

    sendJsonResponse([
        'success' => true,
        'message' => 'Pengaturan anggaran biaya berhasil disimpan.'
    ]);
}

