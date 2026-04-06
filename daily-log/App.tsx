import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routine, RoutineLog, Tab, Category } from './types';
import { Button, Input } from './components/ui'; // 仮のUIコンポーネントパス
import { nanoid } from 'nanoid';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

// --- 定数・型定義 ---
const WORKER_URL = "https://my-gemini-worker.01-yen-ambient.workers.dev";

const EXTENDED_EMOJIS = [
  '☀️', '🏃', '🧘', '💧', '💊', '📚', '🧹', '🥗', '🌤', '☕️', '💻', '🚶', '🍎', '💪', '🦷', '🛁', '🌙', '🕯', '📝', '🧘‍♀️', '🛌', '🧼', '🥦', '🥛',
  '🍳', '🚲', '🎸', '🎨', '🎧', '🛀', '🧼', '🧴', '👔', '💼', '💻', '📱', '🔋', '🗑', '🧺', '🛒', '🛍', '💸', '💳', '🎁', '🎂', '🎈', '🎉', '🎊',
  '🐶', '🐱', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🐧', '🐦', '🐤', '🦋', '🐝', '🐞', '🦗', '🕷', '🕸'
];

type AnalysisPeriod = '1W' | '1M' | '6M' | '1Y';

// --- アイコンコンポーネント (SVG) ---
const Icons = {
  Tracker: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Manage: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  History: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Analysis: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Dashboard: ({ active }: { active: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
};

export default function App() {
  // --- State ---
  const [password, setPassword] = useState(localStorage.getItem('app_password') || '');
  const [savePassword, setSavePassword] = useState(!!localStorage.getItem('app_password')); // パスワード保存設定
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  
  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TRACKER);
  const [categoryTab, setCategoryTab] = useState<Category>('Morning');
  
  // UI State
  const [focusIndex, setFocusIndex] = useState<number>(0);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null); // 時刻編集中のログID
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => localStorage.getItem('focus_mode') === 'true'); // フォーカスモード
  const [postponedTasks, setPostponedTasks] = useState<string[]>([]); // 後回しにしたタスク（セッション中）
  const [skippedToday, setSkippedToday] = useState<string[]>(() => {
    // 今日スキップしたタスク（日が変わったらリセット）
    const saved = localStorage.getItem('skipped_today');
    if (saved) {
      const { date, ids } = JSON.parse(saved);
      const today = new Date().toDateString();
      if (date === today) return ids;
    }
    return [];
  });
  
  // History
  const [historySortDesc, setHistorySortDesc] = useState(true);

  // 完了フィードバック
  const [progressPulse, setProgressPulse] = useState(false);
  const [showCheckPop, setShowCheckPop] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('sound_enabled') !== 'false');

  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingEmoji, setIsGeneratingEmoji] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(() => (localStorage.getItem('analysis_period') as AnalysisPeriod) || '1W');
  const [selectedAnalysisRoutines, setSelectedAnalysisRoutines] = useState<string[]>(() => {
    const saved = localStorage.getItem('analysis_selected_routines');
    return saved ? JSON.parse(saved) : [];
  });

  // Dashboard
  const [weekOffset, setWeekOffset] = useState(0);

  // --- Synchronization ---
  const sync = useCallback(async (action: 'fetch' | 'save', data?: {r: Routine[], l: RoutineLog[]}) => {
    const headers = { "X-App-Password": password, "Content-Type": "application/json" };
    try {
      if (action === 'fetch') {
        const res = await fetch(`${WORKER_URL}/data`, { headers });
        if (res.status === 401) return setIsAuthorized(false);
        const json = await res.json();
        setRoutines(json.routines || []);
        setLogs(json.logs || []);
        setIsAuthorized(true);
      } else if (data) {
        await fetch(`${WORKER_URL}/data`, { method: "POST", headers, body: JSON.stringify({ routines: data.r, logs: data.l }) });
      }
    } catch (e) { console.error(e); }
  }, [password]);

  // ログイン処理
  const handleLogin = () => {
    if (savePassword) {
      localStorage.setItem('app_password', password);
    } else {
      localStorage.removeItem('app_password');
    }
    sync('fetch');
  };

  useEffect(() => { if (password && savePassword) sync('fetch'); }, []); // 初回ロード時、保存済みなら自動ログイン試行

  // --- 完了フィードバック（サウンド＆アニメーション） ---
  const playCompletionFeedback = useCallback(() => {
    // プログレスバーのパルスアニメーション
    setProgressPulse(true);
    setTimeout(() => setProgressPulse(false), 600);

    // チェックマーク ポップアニメーション
    setShowCheckPop(true);
    setTimeout(() => setShowCheckPop(false), 500);

    // サウンドフィードバック（Web Audio API）
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // 心地よい完了音: 2音の短いチャイム
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.setValueAtTime(1318.5, audioCtx.currentTime + 0.1); // E6

        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        // Audio API非対応環境では無視
      }
    }
  }, [soundEnabled]);

  // --- Initial Time Check ---
  useEffect(() => {
    const hour = new Date().getHours();
    let initialCat: Category = 'Morning';
    if (hour >= 4 && hour < 12) initialCat = 'Morning';
    else if (hour >= 12 && hour < 17) initialCat = 'Afternoon';
    else initialCat = 'Evening';
    setCategoryTab(initialCat);
  }, []);

  // --- Helpers ---
  const currentCategoryRoutines = useMemo(() =>
    routines.filter(r => (r.category || 'Morning') === categoryTab).sort((a,b) => a.order - b.order),
  [routines, categoryTab]);

  // 進捗計算: 今日の完了数と最初の未完了タスクのインデックス
  const { completedCount, totalCount, firstIncompleteIndex, activeRoutines } = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);

    // 今日スキップしたタスクを除外
    const active = currentCategoryRoutines.filter(r => !skippedToday.includes(r.id));

    let completed = 0;
    const incompleteIds: string[] = [];

    // 完了数と未完了リストを集計
    active.forEach((r) => {
      const isDone = logs.some(l => l.routineId === r.id && l.timestamp >= today);
      if (isDone) {
        completed++;
      } else {
        incompleteIds.push(r.id);
      }
    });

    // 次に表示するタスクを決定（ラウンドロビン方式）
    let nextTaskId: string | null = null;

    // 1. 後回しにしていない未完了タスクがあれば優先
    const notPostponed = incompleteIds.filter(id => !postponedTasks.includes(id));
    if (notPostponed.length > 0) {
      nextTaskId = notPostponed[0];
    }
    // 2. 全て後回しの場合、postponedTasksの順番（キュー先頭）で表示
    else if (postponedTasks.length > 0) {
      // postponedTasksの順番で、未完了のものを探す
      for (const id of postponedTasks) {
        if (incompleteIds.includes(id)) {
          nextTaskId = id;
          break;
        }
      }
    }

    const firstIncomplete = nextTaskId ? active.findIndex(r => r.id === nextTaskId) : -1;

    return {
      completedCount: completed,
      totalCount: active.length,
      firstIncompleteIndex: firstIncomplete,
      activeRoutines: active
    };
  }, [currentCategoryRoutines, logs, skippedToday, postponedTasks]);

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= currentCategoryRoutines.length) return;
    
    const fromRoutine = currentCategoryRoutines[from];
    const toRoutine = currentCategoryRoutines[to];
    
    const newRoutines = [...routines];
    const fromIdx = newRoutines.findIndex(r => r.id === fromRoutine.id);
    const toIdx = newRoutines.findIndex(r => r.id === toRoutine.id);
    
    const [moved] = newRoutines.splice(fromIdx, 1);
    newRoutines.splice(toIdx, 0, moved);

    const updated = newRoutines.map((r, i) => ({ ...r, order: i }));
    setRoutines(updated);
    setFocusIndex(to);
    sync('save', { r: updated, l: logs });
  };

  // 時刻更新処理
  const updateLogTime = (logId: string, newTimeStr: string) => {
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog) return;

    const [hours, minutes] = newTimeStr.split(':').map(Number);
    const newDate = new Date(targetLog.timestamp);
    newDate.setHours(hours, minutes);

    const updatedLogs = logs.map(l => l.id === logId ? { ...l, timestamp: newDate.getTime() } : l);
    setLogs(updatedLogs);
    setEditingLogId(null);
    sync('save', { r: routines, l: updatedLogs });
  };

  const suggestEmoji = async (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    setIsGeneratingEmoji(routineId);
    try {
      const res = await fetch(`${WORKER_URL}/gemini`, {
        method: "POST",
        headers: { "X-App-Password": password, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `タスク名「${routine.title}」に合う絵文字を1つだけ記号で答えてください。` })
      });
      const data = await res.json();
      const emoji = data.text.trim().substring(0, 2);
      const updated = routines.map((r) => r.id === routineId ? { ...r, emoji } : r);
      setRoutines(updated);
      sync('save', { r: updated, l: logs });
    } catch (e) { console.error(e); }
    setIsGeneratingEmoji(null);
  };

  const toggleAnalysisSelection = (id: string) => {
    let newSelection = selectedAnalysisRoutines.includes(id)
      ? selectedAnalysisRoutines.filter(sid => sid !== id)
      : [...selectedAnalysisRoutines, id];
    if (newSelection.length === 0) newSelection = [id];
    setSelectedAnalysisRoutines(newSelection);
    localStorage.setItem('analysis_selected_routines', JSON.stringify(newSelection));
  };

  const changeAnalysisPeriod = (p: AnalysisPeriod) => {
    setAnalysisPeriod(p);
    localStorage.setItem('analysis_period', p);
  };

  // --- Graph Data Logic ---
  const getGraphData = () => {
    const now = new Date();
    let startDate = new Date();
    if (analysisPeriod === '1W') startDate.setDate(now.getDate() - 7);
    if (analysisPeriod === '1M') startDate.setMonth(now.getMonth() - 1);
    if (analysisPeriod === '6M') startDate.setMonth(now.getMonth() - 6);
    if (analysisPeriod === '1Y') startDate.setFullYear(now.getFullYear() - 1);

    const filteredLogs = logs.filter(l => l.timestamp >= startDate.getTime());
    const dataMap: {[key: string]: any} = {};
    
    filteredLogs.forEach(l => {
      const d = new Date(l.timestamp);
      const dateKey = `${d.getMonth()+1}/${d.getDate()}`;
      const r = routines.find(ru => ru.id === l.routineId);
      if (!r || !selectedAnalysisRoutines.includes(r.id)) return;

      if (!dataMap[dateKey]) dataMap[dateKey] = { name: dateKey, originalDate: d.getTime() };
      const hours = d.getHours() + d.getMinutes() / 60;
      dataMap[dateKey][r.title] = hours;
    });

    return Object.values(dataMap).sort((a:any, b:any) => a.originalDate - b.originalDate);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    if ((activeTab !== Tab.MANAGE && activeTab !== Tab.TRACKER) || isEmojiPickerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowDown') { 
        e.preventDefault(); 
        if (e.ctrlKey && activeTab === Tab.MANAGE) moveItem(focusIndex, focusIndex + 1);
        else setFocusIndex(p => Math.min(p + 1, currentCategoryRoutines.length - 1));
      } else if (e.key === 'ArrowUp') { 
        e.preventDefault(); 
        if (e.ctrlKey && activeTab === Tab.MANAGE) moveItem(focusIndex, focusIndex - 1);
        else setFocusIndex(p => Math.max(p - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, routines, focusIndex, isEmojiPickerOpen, categoryTab, sync, logs]);

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold mb-8 text-slate-800 tracking-widest">DAILY LOG</h1>
        <Input type="password" placeholder="合言葉" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} className="mb-4 text-center border-slate-200" />
        
        {/* パスワード保存チェックボックス */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <input 
            type="checkbox" 
            id="savePass" 
            checked={savePassword} 
            onChange={(e) => setSavePassword(e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <label htmlFor="savePass" className="text-sm text-slate-600 cursor-pointer select-none">パスワードを保存する</label>
        </div>

        <Button onClick={handleLogin} className="w-full h-12 bg-slate-900 text-white">ログイン</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white md:pl-64 flex flex-col h-screen overflow-hidden text-slate-900">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-white border-r p-6">
        <h1 className="text-2xl font-bold mb-10 tracking-tighter pl-2">Daily Log</h1>
        <nav className="space-y-2">
          {[{t:Tab.TRACKER, l:'記録', Icon: Icons.Tracker}, {t:Tab.MANAGE, l:'管理', Icon: Icons.Manage}, {t:Tab.HISTORY, l:'履歴', Icon: Icons.History}, {t:Tab.ANALYSIS, l:'分析', Icon: Icons.Analysis}, {t:Tab.DASHBOARD, l:'達成度', Icon: Icons.Dashboard}].map(n => (
            <button key={n.t} onClick={() => setActiveTab(n.t)} className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all flex items-center gap-4 ${activeTab === n.t ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
              <n.Icon active={activeTab === n.t} />
              <span className="text-base">{n.l}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Header */}
        <header className="p-4 md:p-6 bg-white z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center h-10 gap-2">
            {(activeTab === Tab.TRACKER || activeTab === Tab.MANAGE) ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-100 flex-shrink-0">
                  {(['Morning', 'Afternoon', 'Evening'] as Category[]).map(c => (
                    <button key={c} onClick={() => {setCategoryTab(c); setFocusIndex(0);}} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${categoryTab === c ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>
                      {c === 'Morning' ? '朝' : c === 'Afternoon' ? '昼' : '夜'}
                    </button>
                  ))}
                </div>
                {/* 進捗表示 */}
                {activeTab === Tab.TRACKER && totalCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="text-xs font-bold text-slate-500">
                      {completedCount}/{totalCount}
                    </div>
                    <div className="w-10 sm:w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-slate-800 rounded-full transition-all duration-300 ${progressPulse ? 'progress-pulse' : ''}`}
                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                      />
                    </div>
                    {completedCount === totalCount && (
                      <span className="text-xs">✓</span>
                    )}
                  </div>
                )}
              </div>
            ) : <div />}

            {/* 右側: フォーカスモード・サウンド切り替え */}
            {activeTab === Tab.TRACKER && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* サウンド切り替え */}
                <button
                  onClick={() => {
                    const newSound = !soundEnabled;
                    setSoundEnabled(newSound);
                    localStorage.setItem('sound_enabled', String(newSound));
                    if (newSound) playCompletionFeedback();
                  }}
                  className={`p-1.5 rounded-lg text-sm transition-all ${
                    soundEnabled
                      ? 'bg-green-100 text-green-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                  title={soundEnabled ? '効果音ON' : '効果音OFF'}
                >
                  {soundEnabled ? '🔔' : '🔕'}
                </button>
                {/* フォーカスモード切り替え */}
                <button
                  onClick={() => {
                    const newMode = !isFocusMode;
                    setIsFocusMode(newMode);
                    localStorage.setItem('focus_mode', String(newMode));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isFocusMode
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {isFocusMode ? '集中' : '一覧'}
                </button>
              </div>
            )}

            {activeTab === Tab.HISTORY && (
               <button onClick={()=>setHistorySortDesc(!historySortDesc)} className="text-xs font-bold bg-slate-100 px-3 py-1 rounded text-slate-600">
                 並び替え: {historySortDesc ? '新しい順' : '古い順'}
               </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
          <div className="max-w-4xl mx-auto divide-y divide-slate-50 pb-32"> {/* pb-32に増やして下部UIのスペース確保 */}
            
            {/* --- TRACKER (フォーカスモード) --- */}
            {activeTab === Tab.TRACKER && isFocusMode && (
              <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
                {firstIncompleteIndex >= 0 && activeRoutines[firstIncompleteIndex] ? (
                  <>
                    {/* メインカード - 次のタスク */}
                    {(() => {
                      const nextRoutine = activeRoutines[firstIncompleteIndex];
                      return (
                        <div
                          className="w-full max-w-sm bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-xl shadow-amber-200/30 p-8 text-center border-2 border-amber-200 transform transition-all hover:scale-[1.02]"
                        >
                          {/* パルスインジケーター */}
                          <div className="flex justify-center mb-4">
                            <span className="relative flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                            </span>
                          </div>

                          {/* 絵文字 */}
                          <div className="text-7xl mb-4">{nextRoutine.emoji}</div>

                          {/* タスク名 */}
                          <h2 className="text-2xl font-bold text-amber-800 mb-6">{nextRoutine.title}</h2>

                          {/* ボタンエリア */}
                          <div className="flex gap-3">
                            {/* 完了ボタン */}
                            <button
                              onClick={() => {
                                const updated = [{ id: nanoid(), routineId: nextRoutine.id, timestamp: Date.now() }, ...logs];
                                setLogs(updated);
                                sync('save', { r: routines, l: updated });
                                // 後回しリストから削除
                                setPostponedTasks(prev => prev.filter(id => id !== nextRoutine.id));
                                // 完了フィードバック
                                playCompletionFeedback();
                              }}
                              className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-amber-300/50 transition-all active:scale-95"
                            >
                              完了
                            </button>

                            {/* 後でボタン（ラウンドロビン：末尾に移動） */}
                            <button
                              onClick={() => {
                                setPostponedTasks(prev => {
                                  // 既にあれば削除して末尾に追加（ローテーション）
                                  const filtered = prev.filter(id => id !== nextRoutine.id);
                                  return [...filtered, nextRoutine.id];
                                });
                              }}
                              className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-lg font-bold rounded-2xl transition-all active:scale-95"
                            >
                              後で
                            </button>
                          </div>

                          {/* 今日はスキップ */}
                          <button
                            onClick={() => {
                              const newSkipped = [...skippedToday, nextRoutine.id];
                              setSkippedToday(newSkipped);
                              localStorage.setItem('skipped_today', JSON.stringify({
                                date: new Date().toDateString(),
                                ids: newSkipped
                              }));
                              // 後回しリストからも削除
                              setPostponedTasks(prev => prev.filter(id => id !== nextRoutine.id));
                            }}
                            className="mt-4 text-sm text-slate-400 hover:text-slate-600 underline decoration-dotted transition-colors"
                          >
                            今日はスキップ
                          </button>
                        </div>
                      );
                    })()}

                    {/* 残りのタスク */}
                    {totalCount - completedCount > 1 && (
                      <div className="mt-8 text-center">
                        <p className="text-sm text-slate-400 mb-3">残り {totalCount - completedCount - 1} 件</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {activeRoutines
                            .filter((r, i) => {
                              const done = logs.some(l => l.routineId === r.id && l.timestamp >= new Date().setHours(0,0,0,0));
                              return !done && i !== firstIncompleteIndex;
                            })
                            .map(r => (
                              <span
                                key={r.id}
                                className={`text-2xl transition-opacity cursor-pointer ${postponedTasks.includes(r.id) ? 'opacity-30' : 'opacity-50 hover:opacity-100'}`}
                                title={r.title + (postponedTasks.includes(r.id) ? ' (後回し)' : '')}
                              >
                                {r.emoji}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* 全完了時 */
                  <div className="text-center">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">All Done!</h2>
                    <p className="text-slate-500">
                      {categoryTab === 'Morning' ? '朝' : categoryTab === 'Afternoon' ? '昼' : '夜'}のタスクを全て完了しました
                    </p>
                    {/* スキップしたタスクがある場合 */}
                    {skippedToday.filter(id => activeRoutines.some(r => r.id === id) || currentCategoryRoutines.some(r => r.id === id)).length > 0 && (
                      <p className="text-xs text-slate-400 mt-2">
                        ({skippedToday.length}件スキップ)
                      </p>
                    )}
                  </div>
                )}

                {/* 完了済みタスク（小さく表示） */}
                {completedCount > 0 && (
                  <div className="mt-8 w-full max-w-sm">
                    <p className="text-xs text-slate-400 mb-2 text-center">完了済み</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {activeRoutines
                        .filter(r => logs.some(l => l.routineId === r.id && l.timestamp >= new Date().setHours(0,0,0,0)))
                        .map(r => (
                          <span key={r.id} className="text-lg grayscale opacity-40" title={r.title}>
                            {r.emoji}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- TRACKER (通常モード) --- */}
            {activeTab === Tab.TRACKER && !isFocusMode && activeRoutines.map((r, i) => {
              const done = logs.find(l => l.routineId === r.id && l.timestamp >= new Date().setHours(0,0,0,0));
              const isNextTask = i === firstIncompleteIndex;
              const isOtherIncomplete = !done && !isNextTask;
              return (
                // 最初の未完了タスクを強くハイライト、他は薄く
                <div
                  key={r.id}
                  className={`
                    p-2 flex items-center justify-between transition-all
                    ${isNextTask
                      ? 'bg-amber-100 border-l-4 border-amber-500 shadow-md shadow-amber-200/50 my-1 mx-2 rounded-r-lg scale-[1.02]'
                      : ''
                    }
                    ${done ? 'opacity-40' : ''}
                    ${isOtherIncomplete ? 'opacity-50' : ''}
                    ${focusIndex === i && !isNextTask ? 'bg-slate-50/80' : ''}
                    hover:bg-slate-50
                  `}
                >
                  <div
                    className="flex items-center gap-3 pl-2 flex-1 cursor-pointer"
                    onClick={() => {
                      const today = new Date().setHours(0,0,0,0);
                      const updated = done ? logs.filter(l => l.id !== done.id) : [{ id: nanoid(), routineId: r.id, timestamp: Date.now() }, ...logs];
                      setLogs(updated); sync('save', { r: routines, l: updated });
                      // 完了時のみフィードバック（取り消し時は鳴らさない）
                      if (!done) playCompletionFeedback();
                    }}
                  >
                    {/* 次のタスクマーカー - パルスアニメーション付き */}
                    {isNextTask && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                    )}
                    <span className={`text-xl w-8 text-center ${done ? 'grayscale' : ''} ${isNextTask ? 'text-2xl' : ''}`}>{r.emoji}</span>
                    <span className={`font-bold ${done ? 'text-slate-400 line-through text-sm' : isNextTask ? 'text-amber-800 text-base' : 'text-slate-600 text-sm'}`}>{r.title}</span>
                    {isNextTask && <span className="text-xs text-amber-600 font-bold ml-2 bg-amber-200 px-2 py-0.5 rounded-full">NEXT</span>}
                  </div>

                  {/* 時刻表示・編集エリア */}
                  {done ? (
                    editingLogId === done.id ? (
                      <input
                        type="time"
                        autoFocus
                        className="text-sm font-mono border rounded px-1 py-0"
                        defaultValue={new Date(done.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        onBlur={(e) => updateLogTime(done.id, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onClick={(e) => { e.stopPropagation(); setEditingLogId(done.id); }}
                        className="text-sm font-mono font-bold text-slate-400 mr-2 cursor-pointer hover:text-slate-600 hover:underline decoration-dotted"
                        title="クリックして時刻を修正"
                      >
                        {new Date(done.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </span>
                    )
                  ) : (
                    <div className="w-5 h-5 border-2 border-slate-100 rounded-full mr-2" />
                  )}
                </div>
              );
            })}

            {/* --- MANAGE --- */}
            {activeTab === Tab.MANAGE && (
              <>
                {currentCategoryRoutines.map((r, i) => (
                  // UI変更: p-3 -> p-2, text-base -> text-sm
                  <div key={r.id} onClick={() => setFocusIndex(i)} className={`p-2 pl-4 flex items-center gap-3 transition-colors hover:bg-slate-50 ${focusIndex === i ? 'bg-slate-50 border-l-4 border-slate-900' : 'pl-5'}`}>
                    <button onClick={() => { setFocusIndex(i); setIsEmojiPickerOpen(true); }} className="text-xl min-w-[32px] hover:scale-110 transition-transform">{r.emoji}</button>
                    <input className="flex-1 font-bold text-sm text-slate-700 bg-transparent border-none focus:ring-0 p-0" value={r.title} onChange={(e) => { const updated = routines.map((ru) => ru.id === r.id ? { ...ru, title: e.target.value } : ru); setRoutines(updated); }} onBlur={() => sync('save', { r: routines, l: logs })} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                    
                    <button onClick={(e) => { e.stopPropagation(); suggestEmoji(r.id); }} disabled={!!isGeneratingEmoji} className="p-2 relative">
                      {isGeneratingEmoji === r.id ? (
                         <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm opacity-30 hover:opacity-100 grayscale hover:grayscale-0 transition-all">🤖</span>
                      )}
                    </button>
                    
                    <button onClick={(e) => { e.stopPropagation(); if(confirm('削除しますか？')){ const u=routines.filter(ru=>ru.id!==r.id); setRoutines(u); sync('save',{r:u,l:logs}); } }} className="text-slate-300 text-lg px-2 hover:text-red-500">×</button>
                  </div>
                ))}
                
                {/* 管理画面用ボトムコントロールバー (固定表示) */}
                <div className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 bg-white/90 backdrop-blur border-t p-3 flex justify-between items-center z-20">
                  <div className="flex-1"></div>
                  {/* 中央：上下移動キー */}
                  <div className="flex gap-1">
                    <button onClick={() => moveItem(focusIndex, focusIndex - 1)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button onClick={() => moveItem(focusIndex, focusIndex + 1)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                  {/* 右端：追加ボタン */}
                  <div className="flex-1 flex justify-end">
                    <button className="flex items-center gap-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-3 rounded-lg transition-colors shadow-lg" onClick={() => { 
                      const nr = { id: nanoid(), title: '新しい習慣', emoji: '✨', color: '', order: routines.length, category: categoryTab }; 
                      const updatedRoutines = [...routines, nr];
                      setRoutines(updatedRoutines); 
                      setFocusIndex(updatedRoutines.filter(r => (r.category || 'Morning') === categoryTab).length - 1);
                      sync('save', { r: updatedRoutines, l: logs }); 
                    }}>
                      <span>＋ 追加</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* --- HISTORY --- */}
            {activeTab === Tab.HISTORY && (
              <div className="divide-y divide-slate-50">
                 {logs.sort((a,b)=> historySortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp).slice(0, 100).map(l => {
                    const r = routines.find(ru => ru.id === l.routineId);
                    return (
                      // UI変更: p-4 -> p-2
                      <div key={l.id} className="p-2 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-lg opacity-80">{r?.emoji}</span>
                          <span className="font-bold text-sm text-slate-600">{r?.title}</span>
                        </div>
                        <div className="text-slate-500 font-mono font-bold text-sm">
                          {new Date(l.timestamp).toLocaleString([], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    );
                 })}
              </div>
            )}

            {/* --- ANALYSIS --- */}
            {activeTab === Tab.ANALYSIS && (
              <div className="p-6 space-y-8">
                {/* Graph Controls */}
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center">
                    {(['1W', '1M', '6M', '1Y'] as AnalysisPeriod[]).map(p => (
                      <button key={p} onClick={() => changeAnalysisPeriod(p)} className={`px-3 py-1 rounded text-xs font-bold ${analysisPeriod === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{p}</button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-h-24 overflow-y-auto">
                    {routines.map(r => (
                      <button key={r.id} onClick={() => toggleAnalysisSelection(r.id)} className={`px-2 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedAnalysisRoutines.includes(r.id) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}>
                        {r.emoji} {r.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Chart */}
                <div className="h-80 w-full">
                  <ResponsiveContainer>
                    <LineChart data={getGraphData()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `${Math.floor(val)}:${Math.round((val % 1) * 60).toString().padStart(2,'0')}`} 
                      />
                      <RechartsTooltip 
                        formatter={(val: number) => `${Math.floor(val)}:${Math.round((val % 1) * 60).toString().padStart(2,'0')}`}
                        labelStyle={{fontSize: '12px', fontWeight: 'bold'}}
                      />
                      <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                      {routines.filter(r => selectedAnalysisRoutines.includes(r.id)).map((r, idx) => (
                        <Line 
                          key={r.id} 
                          type="monotone" 
                          dataKey={r.title} 
                          stroke={`hsl(${idx * 60}, 70%, 50%)`} 
                          strokeWidth={2} 
                          dot={{r: 3}} 
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* AI Analysis */}
                <Button className="w-full h-12 bg-slate-900 text-white rounded-lg font-bold shadow-lg shadow-slate-200" onClick={async()=>{
                  setIsAnalyzing(true);
                  try {
                    const res = await fetch(`${WORKER_URL}/gemini`, { method:"POST", headers:{"X-App-Password":password,"Content-Type":"application/json"}, body:JSON.stringify({prompt:`習慣分析して日本語でアドバイス下さい: Routines: ${JSON.stringify(routines)}, Logs: ${JSON.stringify(logs.slice(0,50))}`})});
                    const d = await res.json(); setAnalysisResult(d.text);
                  } catch(e){setAnalysisResult("通信エラー");}
                  setIsAnalyzing(false);
                }} isLoading={isAnalyzing}>✨ AI分析を実行</Button>
                
                {analysisResult && (
                  <div className="text-sm leading-relaxed text-slate-600 bg-slate-50 p-6 rounded-xl border border-slate-100 whitespace-pre-wrap">{analysisResult}</div>
                )}
              </div>
            )}

            {/* --- DASHBOARD --- */}
            {activeTab === Tab.DASHBOARD && (() => {
              const today = new Date();
              const todayStart = new Date(today); todayStart.setHours(0,0,0,0);
              const todayMs = todayStart.getTime();

              const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c; };
              const formatDate = (d: Date) => `${d.getMonth()+1}/${d.getDate()}`;
              const dayLabel = (d: Date) => ['日','月','火','水','木','金','土'][d.getDay()];

              const computeAchievement = (date: Date) => {
                const ds = startOfDay(date).getTime();
                const de = ds + 86400000;
                const dayLogs = logs.filter(l => l.timestamp >= ds && l.timestamp < de);
                const doneIds = new Set(dayLogs.map(l => l.routineId));
                const catsWithRoutines = new Set<string>();
                const catsDone = new Set<string>();
                for (const r of routines) {
                  const cat = r.category || 'Morning';
                  catsWithRoutines.add(cat);
                  if (doneIds.has(r.id)) catsDone.add(cat);
                }
                const total = catsWithRoutines.size;
                const done = catsDone.size;
                const mark = total === 0 ? '-' : done >= 2 ? '○' : done === 1 ? '△' : '×';
                const cats: Record<string, boolean | null> = {};
                for (const c of ['Morning','Afternoon','Evening']) {
                  cats[c] = catsWithRoutines.has(c) ? catsDone.has(c) : null;
                }
                return { mark, done, total, cats };
              };

              // Week navigation
              const refDate = new Date(today); refDate.setDate(refDate.getDate() + weekOffset * 7);
              const dow = refDate.getDay();
              const monday = new Date(refDate); monday.setDate(refDate.getDate() - ((dow + 6) % 7));
              const weekDays = Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d; });

              const todayA = computeAchievement(today);
              const weekA = weekDays.map(d => ({ date: d, ...computeAchievement(d) }));
              const circleCount = weekA.filter(a => a.mark === '○' && startOfDay(a.date).getTime() <= todayMs).length;

              const markColor = (m: string) => m === '○' ? 'text-green-600' : m === '△' ? 'text-yellow-500' : m === '×' ? 'text-red-400' : 'text-gray-300';
              const markBg = (m: string) => m === '○' ? 'bg-green-50 border-green-200' : m === '△' ? 'bg-yellow-50 border-yellow-200' : m === '×' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';
              const catLabel: Record<string,string> = { Morning: '朝', Afternoon: '昼', Evening: '夜' };
              const catIcon: Record<string,string> = { Morning: '☀️', Afternoon: '🌤', Evening: '🌙' };

              return (
                <div className="p-6 space-y-5">
                  {/* Today */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="text-xs text-slate-400 mb-2 font-medium">今日の達成度</div>
                    <div className="flex items-center gap-4">
                      <div className={`text-5xl font-bold ${markColor(todayA.mark)}`}>{todayA.mark}</div>
                      <div className="flex-1">
                        <div className="flex gap-3">
                          {(['Morning','Afternoon','Evening'] as const).map(cat => {
                            const status = todayA.cats[cat];
                            if (status === null) return null;
                            return (
                              <div key={cat} className={`flex items-center gap-1 text-sm ${status ? 'text-slate-700' : 'text-slate-300'}`}>
                                <span>{catIcon[cat]}</span>
                                <span className="font-medium">{catLabel[cat]}</span>
                                {status ? <span className="text-green-500">✓</span> : <span className="text-slate-300">—</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">{todayA.done}/{todayA.total} カテゴリ完了</div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Calendar */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 text-slate-400 hover:text-slate-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <div className="text-xs font-medium text-slate-500">{formatDate(weekDays[0])} 〜 {formatDate(weekDays[6])}</div>
                      <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} className={`p-1 text-slate-400 hover:text-slate-700 ${weekOffset >= 0 ? 'invisible' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {weekA.map((a, i) => {
                        const isToday = startOfDay(a.date).getTime() === todayMs;
                        const isFuture = startOfDay(a.date).getTime() > todayMs;
                        const m = isFuture ? '-' : a.mark;
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`text-[10px] font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{dayLabel(a.date)}</div>
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg font-bold ${isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${isFuture ? 'bg-gray-50 border-gray-100' : markBg(m)} ${markColor(m)}`}>
                              {isFuture ? '' : m}
                            </div>
                            <div className={`text-[10px] ${isToday ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>{formatDate(a.date)}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-2">
                      <span className="text-sm text-slate-500">今週の</span>
                      <span className="text-lg font-bold text-green-600">○</span>
                      <span className="text-sm text-slate-700 font-semibold">{circleCount}<span className="text-slate-400 font-normal"> / 7 日</span></span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <div className="text-xs text-slate-400 mb-2 font-medium">判定基準</div>
                    <div className="flex justify-around text-sm">
                      <div className="flex items-center gap-1.5"><span className="text-lg font-bold text-green-600">○</span><span className="text-slate-600">2〜3カテゴリ</span></div>
                      <div className="flex items-center gap-1.5"><span className="text-lg font-bold text-yellow-500">△</span><span className="text-slate-600">1カテゴリ</span></div>
                      <div className="flex items-center gap-1.5"><span className="text-lg font-bold text-red-400">×</span><span className="text-slate-600">0カテゴリ</span></div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 pb-6 z-50">
          {[{t:Tab.TRACKER, l:'記録', Icon: Icons.Tracker}, {t:Tab.MANAGE, l:'管理', Icon: Icons.Manage}, {t:Tab.HISTORY, l:'履歴', Icon: Icons.History}, {t:Tab.ANALYSIS, l:'分析', Icon: Icons.Analysis}, {t:Tab.DASHBOARD, l:'達成度', Icon: Icons.Dashboard}].map(n => (
            <button key={n.t} onClick={() => setActiveTab(n.t)} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === n.t ? 'text-slate-900' : 'text-slate-300'}`}>
              <n.Icon active={activeTab === n.t} />
              <span className="text-[10px] font-bold">{n.l}</span>
            </button>
          ))}
        </nav>

        {/* グローバルチェックマーク オーバーレイ */}
        {showCheckPop && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[200]">
            <span className="text-8xl check-pop text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]">✓</span>
          </div>
        )}
      </main>

      {/* Emoji Picker Modal */}
      {isEmojiPickerOpen && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setIsEmojiPickerOpen(false)}>
          <div className="w-full max-w-lg p-6 bg-white shadow-2xl rounded-2xl border" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap gap-3 justify-center max-h-[50vh] overflow-y-auto p-2">
              {EXTENDED_EMOJIS.map(e => (
                <button key={e} onClick={() => { 
                  const currentRoutine = currentCategoryRoutines[focusIndex];
                  if (!currentRoutine) return;
                  const u=routines.map((ru)=>ru.id === currentRoutine.id ? {...ru, emoji:e} : ru); 
                  setRoutines(u); sync('save',{r:u,l:logs}); 
                  setIsEmojiPickerOpen(false); 
                }} className={`text-3xl p-2 hover:scale-125 transition-transform hover:bg-slate-100 rounded-lg`}>{e}</button>
              ))}
            </div>
            <button className="w-full mt-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl" onClick={() => setIsEmojiPickerOpen(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}