import { Routine, RoutineLog } from "../types";

// ★★★ ここに正しいURLを貼り付けてください（" "で囲むのを忘れずに！） ★★★
// 例: const WORKER_URL = "https://my-gemini-worker.01-yen-ambient.workers.dev";
const WORKER_URL = "https://my-gemini-worker.01-yen-ambient.workers.dev"; 

export const analyzeHabits = async (routines: Routine[], logs: RoutineLog[]): Promise<string> => {
  try {
    // データ整形
    const routineMap = routines.reduce((acc, r) => {
      acc[r.id] = r.title;
      return acc;
    }, {} as Record<string, string>);

    const recentLogs = logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100); 

    const logSummary = recentLogs.map(log => ({
      routine: routineMap[log.routineId] || 'Unknown Routine',
      date: new Date(log.timestamp).toLocaleString('ja-JP'),
      note: log.note
    }));

    // プロンプト作成
    const prompt = `
    あなたはプロの生産性コーチです。ユーザーの習慣ログを分析してください。
    
    【データ】
    定義されたルーチン: ${routines.map(r => r.title).join(', ')}
    最近の実行ログ (直近100件):
    ${JSON.stringify(logSummary, null, 2)}

    【依頼】
    このデータを元に、以下の点について簡潔に（400文字以内）フィードバックをください：
    1. 継続できている素晴らしい点
    2. 改善が見込める点や、データの傾向（時間帯の偏りなど）
    3. 明日に向けての具体的なアドバイス

    トーン：前向きで励ますような口調（です・ます調）。
    Markdown形式で出力してください。
    `;

    // Workersへの送信
    // URLは上の変数(WORKER_URL)を使うので、ここは変えなくてOKです
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Worker Error: ${response.status}`);
    }

    const data = await response.json() as { text: string };
    return data.text || "分析結果を取得できませんでした。";

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "申し訳ありません。現在AI分析を利用できません。";
  }
};