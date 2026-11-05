<?php
/**
 * Company Knowledge Base API (RAG Context System)
 * Kantor Virtual HQ
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$uploadDir = __DIR__ . '/../uploads/knowledge_base';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0777, true);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetKnowledge($pdo);
        break;

    case 'POST':
        $input = getJsonInput();
        $action = $input['action'] ?? ($_POST['action'] ?? ($_GET['action'] ?? ''));
        if ($action === 'preset_templates') {
            handleSeedPresetKnowledge($pdo);
            break;
        }
        handleUploadKnowledge($pdo, $uploadDir);
        break;

    case 'PUT':
    case 'PATCH':
        $input = getJsonInput();
        handleUpdateKnowledge($pdo, $input);
        break;

    case 'DELETE':
        handleDeleteKnowledge($pdo);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: List all knowledge base documents
 */
function handleGetKnowledge(PDO $pdo) {
    $category = $_GET['category'] ?? 'all';
    $search = trim($_GET['q'] ?? '');

    $sql = "SELECT id, title, category, filename, file_type, token_estimate, is_active, created_at, 
                   LEFT(content_text, 250) as snippet,
                   CHAR_LENGTH(content_text) as char_count
            FROM knowledge_base";
    $where = [];
    $params = [];

    if ($category !== 'all') {
        $where[] = "category = ?";
        $params[] = $category;
    }

    if (!empty($search)) {
        $where[] = "(title LIKE ? OR content_text LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }

    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }

    $sql .= " ORDER BY is_active DESC, id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJsonResponse([
        'success' => true,
        'total' => count($items),
        'data' => $items
    ]);
}

/**
 * POST: Upload and process new knowledge document
 */
function handleUploadKnowledge(PDO $pdo, string $uploadDir) {
    $title = trim($_POST['title'] ?? '');
    $category = in_array($_POST['category'] ?? '', ['brand_guidelines', 'product_catalog', 'api_docs', 'sop', 'general']) ? $_POST['category'] : 'general';
    $rawText = trim($_POST['content_text'] ?? '');

    $filename = '';
    $filePath = '';
    $fileType = 'txt';
    $extractedText = '';

    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $uploaded = $_FILES['file'];
        $origName = basename($uploaded['name']);
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

        if (!in_array($ext, ['txt', 'md', 'json', 'pdf'])) {
            sendJsonResponse(['success' => false, 'error' => 'Format file tidak didukung. Harap unggah .txt, .md, .json, atau .pdf'], 400);
        }

        $safeName = time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $origName);
        $destPath = $uploadDir . '/' . $safeName;

        if (!move_uploaded_file($uploaded['tmp_name'], $destPath)) {
            sendJsonResponse(['success' => false, 'error' => 'Gagal memindahkan file yang diunggah'], 500);
        }

        $filename = $origName;
        $filePath = 'uploads/knowledge_base/' . $safeName;
        $fileType = $ext;

        if (empty($title)) {
            $title = pathinfo($origName, PATHINFO_FILENAME);
        }

        // Extract content based on extension
        if ($ext === 'pdf') {
            $extractedText = extractPdfText($destPath);
        } else {
            $extractedText = @file_get_contents($destPath) ?: '';
        }
    } elseif (!empty($rawText)) {
        // Direct text submission
        if (empty($title)) {
            $title = 'Catatan Pengetahuan #' . time();
        }
        $filename = 'manual_' . time() . '.md';
        $destPath = $uploadDir . '/' . $filename;
        file_put_contents($destPath, $rawText);

        $filePath = 'uploads/knowledge_base/' . $filename;
        $fileType = 'md';
        $extractedText = $rawText;
    } else {
        sendJsonResponse(['success' => false, 'error' => 'Silakan pilih berkas dokumen atau masukkan isi catatan pengetahuan'], 400);
    }

    if (empty(trim($extractedText))) {
        sendJsonResponse(['success' => false, 'error' => 'Isi dokumen kosong atau teks tidak dapat diekstraksi'], 422);
    }

    $tokenEstimate = (int)ceil(str_word_count($extractedText) * 1.33);

    $stmt = $pdo->prepare("
        INSERT INTO knowledge_base (title, category, filename, file_path, file_type, content_text, token_estimate, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $stmt->execute([$title, $category, $filename, $filePath, $fileType, $extractedText, $tokenEstimate]);
    $newId = (int)$pdo->lastInsertId();

    // Log to system logs
    $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (NULL, 'system', ?, ?)")
        ->execute([
            "📚 [KNOWLEDGE BASE] Dokumen baru diunggah: '{$title}' [{$fileType}, ~{$tokenEstimate} tokens]",
            json_encode(['id' => $newId, 'category' => $category, 'tokens' => $tokenEstimate])
        ]);

    sendJsonResponse([
        'success' => true,
        'message' => "Dokumen '{$title}' berhasil ditambahkan ke Knowledge Base!",
        'data' => [
            'id' => $newId,
            'title' => $title,
            'category' => $category,
            'token_estimate' => $tokenEstimate
        ]
    ], 201);
}

/**
 * Extracts text from PDF using pdftotext
 */
function extractPdfText(string $pdfPath): string {
    $outText = '';
    $escaped = escapeshellarg($pdfPath);
    $cmd = "pdftotext {$escaped} -";
    $output = @shell_exec($cmd);

    if ($output && strlen(trim($output)) > 10) {
        return $output;
    }

    // Fallback basic text extraction if pdftotext fails
    $content = @file_get_contents($pdfPath);
    if ($content) {
        // Strip common PDF tags and extract plaintext streams
        preg_match_all('/\((.*?)\)[\r\n]*T[jJ]/s', $content, $matches);
        if (!empty($matches[1])) {
            $outText = implode(' ', $matches[1]);
        }
    }

    return $outText ?: 'Dokumen PDF (Ekstraksi teks tidak menghasilkan karakter ASCII murni).';
}

/**
 * POST: Seed default standard knowledge templates
 */
function handleSeedPresetKnowledge(PDO $pdo) {
    $presets = [
        [
            'title' => 'Brand Voice & Media Guidelines 2026',
            'category' => 'brand_guidelines',
            'filename' => 'brand_guidelines_2026.md',
            'file_type' => 'md',
            'content_text' => "# Brand Voice & Media Guidelines - Kantor Virtual HQ\n\n" .
                "## 1. Persona Brand\n" .
                "- **Nada Bicara:** Percaya diri, inovatif, lugas, ramah profesional, dan berbasis bukti nyata.\n" .
                "- **Target Audiens:** Tech founders, developer modern, agensi digital, dan kreator konten produktif.\n" .
                "- **Kata Kunci Utama:** Autonomous AI, Real-time Collaboration, Tanpa Hambatan, Efisiensi 10x.\n\n" .
                "## 2. Aturan Copywriting\n" .
                "- Gunakan hook dalam 3 detik pertama di video.\n" .
                "- Selalu sertakan Call to Action (CTA) yang jelas di akhir kalimat.\n" .
                "- Hindari jargon klise yang berlebihan tanpa penjelasan nilai tambah."
        ],
        [
            'title' => 'SOP Engineering: Git Workflow & Kode Bersih',
            'category' => 'sop',
            'filename' => 'sop_engineering_clean_code.md',
            'file_type' => 'md',
            'content_text' => "# Standar Operasional Prosedur (SOP) Engineering\n\n" .
                "## 1. Standar Kode\n" .
                "- Semua fungsi publik harus memiliki parameter tipe data dan penanganan exception yang aman.\n" .
                "- Hindari hardcoded credentials atau API key di repositori.\n" .
                "- Format JSON harus selalu utf-8 encoded dengan `JSON_UNESCAPED_UNICODE`.\n\n" .
                "## 2. Git Commit Convention\n" .
                "- Gunakan semantic commit: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.\n" .
                "- Setiap perubahan fitur wajib melalui verifikasi linting dan testing sebelum rilis."
        ],
        [
            'title' => 'Spesifikasi Arsitektur REST API & Protokol Multi-Agent',
            'category' => 'api_docs',
            'filename' => 'multi_agent_api_spec.md',
            'file_type' => 'md',
            'content_text' => "# Spesifikasi REST API & Protokol Multi-Agent\n\n" .
                "## 1. Struktur Respon Standar\n" .
                "Setiap endpoint API mengembalikan format JSON seragam:\n" .
                "```json\n" .
                "{\n  \"success\": true,\n  \"message\": \"Deskripsi hasil\",\n  \"data\": {}\n}\n" .
                "```\n\n" .
                "## 2. Status Kode HTTP\n" .
                "- 200 OK: Permintaan berhasil diproses.\n" .
                "- 201 Created: Data baru berhasil dibuat.\n" .
                "- 400 Bad Request: Parameter hilang atau format tidak valid.\n" .
                "- 422 Unprocessable: Validasi input logika gagal.\n" .
                "- 500 Internal Error: Kesalahan server internal."
        ]
    ];

    $created = 0;
    foreach ($presets as $p) {
        $chk = $pdo->prepare("SELECT COUNT(*) FROM knowledge_base WHERE title = ?");
        $chk->execute([$p['title']]);
        if ((int)$chk->fetchColumn() === 0) {
            $tokenEst = (int)ceil(str_word_count($p['content_text']) * 1.33);
            $stmt = $pdo->prepare("
                INSERT INTO knowledge_base (title, category, filename, file_path, file_type, content_text, token_estimate, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([
                $p['title'],
                $p['category'],
                $p['filename'],
                'uploads/knowledge_base/' . $p['filename'],
                $p['file_type'],
                $p['content_text'],
                $tokenEst
            ]);
            $created++;
        }
    }

    sendJsonResponse([
        'success' => true,
        'message' => "Berhasil memuat {$created} dokumen template standar ke Knowledge Base!"
    ]);
}

/**
 * PUT: Update document or toggle active
 */
function handleUpdateKnowledge(PDO $pdo, array $input) {
    $id = (int)($input['id'] ?? ($_GET['id'] ?? 0));
    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'id diperlukan'], 400);
    }

    $updates = [];
    $params = [];

    if (isset($input['is_active'])) {
        $updates[] = "is_active = ?";
        $params[] = (int)$input['is_active'];
    }
    if (isset($input['title'])) {
        $updates[] = "title = ?";
        $params[] = trim($input['title']);
    }
    if (isset($input['category'])) {
        $updates[] = "category = ?";
        $params[] = trim($input['category']);
    }

    if (empty($updates)) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada field yang diubah'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE knowledge_base SET " . implode(', ', $updates) . " WHERE id = ?";
    $pdo->prepare($sql)->execute($params);

    sendJsonResponse([
        'success' => true,
        'message' => 'Dokumen berhasil diperbarui'
    ]);
}

/**
 * DELETE: Delete document
 */
function handleDeleteKnowledge(PDO $pdo) {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'id diperlukan'], 400);
    }

    $stmt = $pdo->prepare("SELECT file_path FROM knowledge_base WHERE id = ?");
    $stmt->execute([$id]);
    $doc = $stmt->fetch();

    if ($doc && !empty($doc['file_path'])) {
        $abs = __DIR__ . '/../' . $doc['file_path'];
        if (file_exists($abs)) {
            @unlink($abs);
        }
    }

    $pdo->prepare("DELETE FROM knowledge_base WHERE id = ?")->execute([$id]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Dokumen berhasil dihapus dari Knowledge Base'
    ]);
}
