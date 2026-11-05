<?php
/**
 * Content Calendar & Social Media Creator API
 * Kantor Virtual HQ
 * Manages multi-channel social media schedule, AI copywriting generation, hashtag analysis, and status pipeline.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ai_service.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();

switch ($method) {
    case 'GET':
        handleGetContent($pdo);
        break;

    case 'POST':
        handlePostContent($pdo, $input);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdateContent($pdo, $input);
        break;

    case 'DELETE':
        handleDeleteContent($pdo, $input);
        break;

    default:
        sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/**
 * GET: Retrieve list of content calendar items, optionally filtered by platform or status
 */
function handleGetContent(PDO $pdo) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $platform = $_GET['platform'] ?? null;
    $status = $_GET['status'] ?? null;
    $month = $_GET['month'] ?? null; // format YYYY-MM

    if ($id) {
        $stmt = $pdo->prepare("
            SELECT c.*, a.name AS agent_name, a.role AS agent_role, a.avatar_color
            FROM content_calendar c
            LEFT JOIN agents a ON c.assigned_agent_id = a.id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $item = $stmt->fetch();

        if (!$item) {
            sendJsonResponse(['success' => false, 'error' => 'Konten tidak ditemukan'], 404);
        }

        $item['hashtag_analysis'] = analyzeHashtags($item['hashtags'] ?? '');
        sendJsonResponse(['success' => true, 'data' => $item]);
        return;
    }

    $where = [];
    $params = [];

    if (!empty($platform) && $platform !== 'all') {
        $where[] = "c.platform = ?";
        $params[] = $platform;
    }
    if (!empty($status) && $status !== 'all') {
        $where[] = "c.status = ?";
        $params[] = $status;
    }
    if (!empty($month) && preg_match('/^\d{4}-\d{2}$/', $month)) {
        $where[] = "DATE_FORMAT(c.scheduled_at, '%Y-%m') = ?";
        $params[] = $month;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $sql = "
        SELECT c.*, a.name AS agent_name, a.role AS agent_role, a.avatar_color
        FROM content_calendar c
        LEFT JOIN agents a ON c.assigned_agent_id = a.id
        {$whereClause}
        ORDER BY c.scheduled_at ASC, c.id DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    foreach ($items as &$it) {
        $it['hashtag_analysis'] = analyzeHashtags($it['hashtags'] ?? '');
    }

    // Counts summary
    $countsStmt = $pdo->query("
        SELECT 
            COUNT(*) as total,
            SUM(status = 'ide') as count_ide,
            SUM(status = 'draft_selesai') as count_draft,
            SUM(status = 'menunggu_review') as count_review,
            SUM(status = 'siap_publikasi') as count_siap
        FROM content_calendar
    ");
    $counts = $countsStmt->fetch(PDO::FETCH_ASSOC);

    sendJsonResponse([
        'success' => true,
        'counts' => $counts,
        'total' => count($items),
        'data' => $items
    ]);
}

/**
 * POST: Create content, generate copywriting via AI, or execute quick creator preset
 */
function handlePostContent(PDO $pdo, array $input) {
    $action = $input['action'] ?? 'create';

    if ($action === 'create') {
        handleCreateContent($pdo, $input);
    } elseif ($action === 'generate_ai' || $action === 'quick_preset') {
        handleGenerateAIContent($pdo, $input);
    } else {
        sendJsonResponse(['success' => false, 'error' => "Action '{$action}' tidak dikenal"], 400);
    }
}

/**
 * Creates a calendar entry manually
 */
function handleCreateContent(PDO $pdo, array $input) {
    $title = trim($input['title'] ?? '');
    $platform = in_array($input['platform'] ?? '', ['instagram', 'tiktok', 'twitter', 'linkedin']) ? $input['platform'] : 'instagram';
    $contentType = in_array($input['content_type'] ?? '', ['reels', 'carousel', 'story', 'post', 'thread', 'video']) ? $input['content_type'] : 'post';
    $status = in_array($input['status'] ?? '', ['ide', 'draft_selesai', 'menunggu_review', 'siap_publikasi']) ? $input['status'] : 'ide';
    $copywriting = trim($input['copywriting'] ?? '');
    $hashtags = trim($input['hashtags'] ?? '');
    $mediaPrompt = trim($input['media_prompt'] ?? '');
    $scheduledAt = !empty($input['scheduled_at']) ? $input['scheduled_at'] : date('Y-m-d 19:00:00', strtotime('+1 day'));
    $assignedAgentId = !empty($input['assigned_agent_id']) ? (int)$input['assigned_agent_id'] : null;

    if (empty($title)) {
        sendJsonResponse(['success' => false, 'error' => 'Judul konten wajib diisi'], 422);
    }

    $readTime = calculateReadingTime($copywriting);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO content_calendar 
            (title, platform, content_type, status, copywriting, hashtags, media_prompt, scheduled_at, assigned_agent_id, estimated_reading_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $title, $platform, $contentType, $status, $copywriting, $hashtags, $mediaPrompt, $scheduledAt, $assignedAgentId, $readTime
        ]);
        $newId = (int)$pdo->lastInsertId();

        sendJsonResponse([
            'success' => true,
            'message' => 'Konten berhasil dijadwalkan ke kalender editorial',
            'id' => $newId
        ], 201);
    } catch (Exception $e) {
        sendJsonResponse(['success' => false, 'error' => 'Gagal menyimpan konten: ' . $e->getMessage()], 500);
    }
}

/**
 * Generates AI Copywriting using specialized social creator presets
 */
function handleGenerateAIContent(PDO $pdo, array $input) {
    $preset = trim($input['preset'] ?? ''); // reels_viral, tiktok_60s, twitter_thread, brand_brainstorm
    $topic = trim($input['topic'] ?? '');
    $platform = in_array($input['platform'] ?? '', ['instagram', 'tiktok', 'twitter', 'linkedin']) ? $input['platform'] : 'instagram';
    $contentType = $input['content_type'] ?? 'post';
    $agentId = !empty($input['agent_id']) ? (int)$input['agent_id'] : null;

    if (empty($topic)) {
        sendJsonResponse(['success' => false, 'error' => 'Topik atau tema konten wajib diisi'], 422);
    }

    // Auto-select social specialist agent if not provided
    if (!$agentId) {
        $aStmt = $pdo->query("
            SELECT id FROM agents 
            WHERE role LIKE '%sosial%' OR role LIKE '%media%' OR role LIKE '%konten%' OR role LIKE '%content%' OR department LIKE '%marketing%'
            ORDER BY id ASC LIMIT 1
        ");
        $foundId = $aStmt->fetchColumn();
        if ($foundId) {
            $agentId = (int)$foundId;
        }
    }

    $agent = null;
    if ($agentId) {
        $agentStmt = $pdo->prepare("SELECT * FROM agents WHERE id = ?");
        $agentStmt->execute([$agentId]);
        $agent = $agentStmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    if (!$agent) {
        $agent = $pdo->query("SELECT * FROM agents ORDER BY id ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    $agentId = $agent ? (int)$agent['id'] : null;
    $agentName = $agent ? $agent['name'] : 'AI Social Media Specialist';

    // Resolve preset configuration
    $presetPrompts = [
        'reels_viral' => [
            'name' => 'Ide Konten Reels Viral',
            'platform' => 'instagram',
            'type' => 'reels',
            'instruction' => "Kamu adalah Kreator Reels Instagram papan atas dengan jutaan views. " .
                "Buat skrip Reels berdurasi 30-45 detik yang viral untuk topik ini. " .
                "Struktur WAJIB:\n" .
                "1. [HOOK (0-3 detik)]: Visual pattern interrupt & teks di layar yang bikin stop scrolling.\n" .
                "2. [BODY (4-30 detik)]: 3 poin inti yang bernilai tinggi / relatable, tanpa bertele-tele.\n" .
                "3. [CTA (31-40 detik)]: Ajakan komentar spesifik yang memancing perdebatan / sharing.\n" .
                "4. [CAPTION]: Caption engaging dengan 10-15 hashtag tersegmentasi."
        ],
        'tiktok_60s' => [
            'name' => 'Script Video TikTok 60 Detik',
            'platform' => 'tiktok',
            'type' => 'video',
            'instruction' => "Kamu adalah TikTok Strategist handal. Buat naskah video TikTok berdurasi 60 detik tentang topik ini. " .
                "Sertakan arahan visual/kamera, audio pendukung trending, teks di layar (on-screen text), dan kalimat hook pembuka dalam 2 detik pertama yang mengunci retensi penonton."
        ],
        'twitter_thread' => [
            'name' => 'Thread Twitter/X 7-Tweet Edukatif',
            'platform' => 'twitter',
            'type' => 'thread',
            'instruction' => "Kamu adalah Thread Writer ahli di X (Twitter). Buat thread 7-tweet edukatif dan mendalam tentang topik ini. " .
                "Tweet 1 (Hook Utama yang memicu retweet/bookmark), Tweet 2-6 (Daging edukatif berbobot), Tweet 7 (Kesimpulan tajam & ajakan follow/repost)."
        ],
        'brand_brainstorm' => [
            'name' => 'Brainstorming 5 Sudut Pandang Brand Campaign',
            'platform' => 'linkedin',
            'type' => 'carousel',
            'instruction' => "Kamu adalah Brand Campaign Director. Buat 5 sudut pandang (angles) kampanye kreatif yang segar dan belum pasaran untuk topik ini. " .
                "Sertakan target emosi audiens, headline kampanye, dan konsep visualnya."
        ]
    ];

    if (isset($presetPrompts[$preset])) {
        $presetInfo = $presetPrompts[$preset];
        $platform = $presetInfo['platform'];
        $contentType = $presetInfo['type'];
        $specialPrompt = $presetInfo['instruction'];
    } else {
        $specialPrompt = "Buat konten media sosial berkualitas tinggi untuk platform {$platform} (Format: {$contentType}) mengenai topik tersebut. Sertakan hook yang memikat, isi bernilai, call-to-action jelas, dan hashtag pilihan.";
    }

    $config = AIService::getConfig($pdo, $agent);
    $hasKey = ($config['provider'] === 'ollama' || !empty($config['api_key']));

    $systemPrompt = "Kamu adalah {$agentName}, AI Social Media Specialist & Content Strategist.\n" .
        $specialPrompt . "\n\n" .
        "FORMAT RESPON WAJIB TERSTRUKTUR SEPERTI INI:\n" .
        "[TITLE] Judul ringkas konten (1 baris)\n" .
        "[COPYWRITING] Naskah lengkap konten, skrip, dan caption (lengkap dengan emoji dan paragraf rapi)\n" .
        "[HASHTAGS] Daftar hashtag relevan dipisahkan spasi (contoh: #KontenViral #TipsBisnis #Tech2026)\n" .
        "[MEDIA_PROMPT] Prompt deskripsi visual gambar/video untuk tim desain";

    $userPrompt = "Topik Konten: \"{$topic}\"\n" .
        "Platform: {$platform}\n" .
        "Format: {$contentType}\n" .
        "Buatkan konten terbaik sekarang:";

    $titleOut = "Konten: " . mb_substr($topic, 0, 40);
    $copyOut = "";
    $hashOut = "#Viral #Trending #Creator #AI";
    $mediaOut = "Visual mockup modern minimalis";

    if ($hasKey) {
        try {
            $llmRes = AIService::callLLM($config, $systemPrompt, $userPrompt, 0.7);
            $raw = $llmRes['content'];

            if (preg_match('/\[TITLE\]\s*(.*?)(?=\[(?:COPYWRITING|HASHTAGS|MEDIA_PROMPT)\]|$)/is', $raw, $m)) {
                $titleOut = trim($m[1]);
            }
            if (preg_match('/\[COPYWRITING\]\s*(.*?)(?=\[(?:HASHTAGS|MEDIA_PROMPT)\]|$)/is', $raw, $m)) {
                $copyOut = trim($m[1]);
            }
            if (preg_match('/\[HASHTAGS\]\s*(.*?)(?=\[(?:MEDIA_PROMPT)\]|$)/is', $raw, $m)) {
                $hashOut = trim($m[1]);
            }
            if (preg_match('/\[MEDIA_PROMPT\]\s*(.*?)$/is', $raw, $m)) {
                $mediaOut = trim($m[1]);
            }
        } catch (Exception $e) {
            $copyOut = generateFallbackCopywriting($topic, $platform, $contentType);
        }
    }

    if (empty($copyOut)) {
        $copyOut = generateFallbackCopywriting($topic, $platform, $contentType);
    }

    $readTime = calculateReadingTime($copyOut);

    // Save to database as 'draft_selesai'
    $schedTime = !empty($input['scheduled_at']) ? $input['scheduled_at'] : date('Y-m-d 19:00:00', strtotime('+1 day'));
    $ins = $pdo->prepare("
        INSERT INTO content_calendar 
        (title, platform, content_type, status, copywriting, hashtags, media_prompt, scheduled_at, assigned_agent_id, estimated_reading_time)
        VALUES (?, ?, ?, 'draft_selesai', ?, ?, ?, ?, ?, ?)
    ");
    $ins->execute([
        $titleOut, $platform, $contentType, $copyOut, $hashOut, $mediaOut, $schedTime, $agentId, $readTime
    ]);
    $newId = (int)$pdo->lastInsertId();

    // Log action
    $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
        ->execute([
            $agentId,
            "✨ [Kreator Konten] Berhasil merilis draf copywriting: '{$titleOut}' [{$platform} - {$contentType}]",
            json_encode(['calendar_id' => $newId, 'reading_time' => $readTime, 'hashtags' => $hashOut], JSON_UNESCAPED_UNICODE)
        ]);

    sendJsonResponse([
        'success' => true,
        'message' => 'Draf konten berhasil di-generate dan tersimpan di Kalender Editorial!',
        'data' => [
            'id' => $newId,
            'title' => $titleOut,
            'platform' => $platform,
            'content_type' => $contentType,
            'status' => 'draft_selesai',
            'copywriting' => $copyOut,
            'hashtags' => $hashOut,
            'media_prompt' => $mediaOut,
            'scheduled_at' => $schedTime,
            'estimated_reading_time' => $readTime,
            'hashtag_analysis' => analyzeHashtags($hashOut),
            'agent_name' => $agent['name']
        ]
    ]);
}

/**
 * PUT/PATCH: Update calendar item status or content details
 */
function handleUpdateContent(PDO $pdo, array $input) {
    $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'ID Konten diperlukan'], 400);
    }

    $chk = $pdo->prepare("SELECT * FROM content_calendar WHERE id = ?");
    $chk->execute([$id]);
    $current = $chk->fetch();

    if (!$current) {
        sendJsonResponse(['success' => false, 'error' => 'Konten tidak ditemukan'], 404);
    }

    $updates = [];
    $params = [];
    $allowed = ['title', 'platform', 'content_type', 'status', 'copywriting', 'hashtags', 'media_prompt', 'scheduled_at', 'assigned_agent_id'];

    foreach ($allowed as $f) {
        if (array_key_exists($f, $input)) {
            $val = $input[$f];
            $updates[] = "`{$f}` = ?";
            $params[] = $val;
        }
    }

    if (isset($input['copywriting'])) {
        $readTime = calculateReadingTime($input['copywriting']);
        $updates[] = "`estimated_reading_time` = ?";
        $params[] = $readTime;
    }

    if (empty($updates)) {
        sendJsonResponse(['success' => false, 'error' => 'Tidak ada field yang diperbarui'], 400);
    }

    $params[] = $id;
    $sql = "UPDATE content_calendar SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // If status changed to 'siap_publikasi', log congratulation
    if (isset($input['status']) && $input['status'] === 'siap_publikasi' && $current['status'] !== 'siap_publikasi') {
        if ($current['assigned_agent_id']) {
            $pdo->prepare("INSERT INTO agent_logs (agent_id, log_type, message, details_json) VALUES (?, 'action', ?, ?)")
                ->execute([
                    $current['assigned_agent_id'],
                    "🚀 [Publikasi Konten] '{$current['title']}' telah disetujui dan berstatus SIAP PUBLIKASI di {$current['platform']}!",
                    json_encode(['calendar_id' => $id, 'scheduled_at' => $current['scheduled_at']], JSON_UNESCAPED_UNICODE)
                ]);
        }
    }

    sendJsonResponse(['success' => true, 'message' => 'Konten editorial berhasil diperbarui']);
}

/**
 * DELETE: Remove item from calendar
 */
function handleDeleteContent(PDO $pdo, array $input) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['id'] ?? 0);
    if (!$id) {
        sendJsonResponse(['success' => false, 'error' => 'ID Konten diperlukan'], 400);
    }

    $stmt = $pdo->prepare("DELETE FROM content_calendar WHERE id = ?");
    $stmt->execute([$id]);

    sendJsonResponse(['success' => true, 'message' => 'Konten berhasil dihapus dari kalender']);
}

/**
 * Analyzes hashtags for estimated reach and formatting
 */
function analyzeHashtags(string $hashtagsStr): array {
    preg_match_all('/#([a-zA-Z0-9_\x{0080}-\x{FFFF}]+)/u', $hashtagsStr, $matches);
    $tags = $matches[0] ?? [];
    $count = count($tags);

    $rating = 'Optimal';
    $tip = 'Jumlah hashtag seimbang untuk visibilitas explore feed.';
    if ($count === 0) {
        $rating = 'Kurang';
        $tip = 'Tambahkan 5-10 hashtag tersegmentasi untuk jangkauan organik.';
    } elseif ($count > 25) {
        $rating = 'Terlalu Banyak';
        $tip = 'Maksimal 15-20 hashtag agar tidak dianggap spam oleh algoritma.';
    }

    return [
        'count' => $count,
        'tags' => array_slice($tags, 0, 15),
        'rating' => $rating,
        'tip' => $tip,
        'estimated_reach' => $count > 0 ? min(98, 45 + $count * 3) . '%' : '30%'
    ];
}

/**
 * Calculates estimated reading time based on 200 words per minute average
 */
function calculateReadingTime(string $text): string {
    $words = str_word_count(strip_tags($text));
    if ($words <= 0) return '15 detik';

    $seconds = max(15, round(($words / 200) * 60));
    if ($seconds < 60) {
        return "{$seconds} detik baca";
    }
    $minutes = round($seconds / 60);
    return "{$minutes} menit baca";
}

/**
 * High-quality fallback copywriting generator for offline testing
 */
function generateFallbackCopywriting(string $topic, string $platform, string $type): string {
    if ($platform === 'twitter') {
        return "1/7 Kebanyakan orang salah paham tentang {$topic}. Ini 5 hal krusial yang perlu kamu ketahui agar tidak tertinggal 🧵👇\n\n" .
            "2/7 Pertama, pahami fondasinya. Tanpa fondasi yang kokoh, setiap strategi di atasnya hanya akan menjadi beban teknis.\n\n" .
            "3/7 Kedua, kecepatan eksekusi mengalahkan kesempurnaan ide. Rilis MVP lebih awal dan lakukan iterasi cepat berdasarkan feedback pengguna.\n\n" .
            "4/7 Ketiga, optimasi otomatisasi. Gunakan AI dan multi-agent workflow untuk memangkas proses repetitif hingga 80%.\n\n" .
            "5/7 Keempat, selalu ukur metrik riil, bukan sekadar angka kesombongan (vanity metrics).\n\n" .
            "6/7 Ringkasan: Sederhanakan alur, fokus pada nilai tambah, dan biarkan sistem bekerja untukmu.\n\n" .
            "7/7 Kalau thread ini bermanfaat, jangan lupa Repost dan Bookmark untuk referensi tim kamu! 🚀";
    } elseif ($platform === 'tiktok') {
        return "[VISUAL: Wajah kaget menatap kamera dengan teks melayang di atas kepala]\n" .
            "HOOK (0-2s): \"Jangan coba {$topic} sebelum kamu nonton video ini sampai habis!\"\n\n" .
            "[VISUAL: B-roll laptop menampilkan dashboard modern dengan musik upbeat]\n" .
            "BODY (3-35s): \"Banyak yang kira ini susah dan butuh waktu berminggu-minggu. Faktanya, dengan workflow multi-agent terbaru, kamu cuma perlu 3 langkah simpel:\n" .
            "Satu: Petakan kebutuhan tugas.\n" .
            "Dua: Delegasikan ke agen spesialis.\n" .
            "Tiga: Monitor hasilnya secara real-time.\"\n\n" .
            "[VISUAL: Senyum percaya diri sambil menunjuk tombol komentar]\n" .
            "CTA (36-45s): \"Komen 'MAU' di bawah kalau kamu pengen tutorial lengkapnya step-by-step!\"";
    } else {
        return "🔥 Rahasia Menguasai {$topic} di Era AI Modern!\n\n" .
            "Pernahkah kamu merasa kewalahan mengatur koordinasi tim dan eksekusi proyek yang serba cepat? Kamu tidak sendirian.\n\n" .
            "Berikut adalah 3 pilar utama yang telah terbukti meningkatkan efisiensi hingga 300%:\n" .
            "✨ 1. Autonomous Task Delegation: Pembagian peran spesifik sesuai keahlian.\n" .
            "⚡ 2. Real-time Multi-Agent Sync: Koordinasi tanpa jeda komunikasi.\n" .
            "🎯 3. Direct Local Execution: Menghasilkan kode dan konten nyata, bukan sekadar simulasi.\n\n" .
            "Bagikan pandanganmu di kolom komentar: Mana pilar yang paling ingin kamu terapkan di timmu saat ini? 👇";
    }
}
