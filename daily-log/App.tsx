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
  
  // History
  const [historySortDesc, setHistorySortDesc] = useState(true);

  // Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingEmoji, setIsGeneratingEmoji] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(() => (localStorage.getItem('analysis_period') as AnalysisPeriod) || '1W');
  const [selectedAnalysisRoutines, setSelectedAnalysisRoutines] = useState<string[]>(() => {
    const saved = localStorage.getItem('analysis_selected_routines');
    return saved ? JSON.parse(saved) : [];
  });

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
          {[{t:Tab.TRACKER, l:'記録', Icon: Icons.Tracker}, {t:Tab.MANAGE, l:'管理', Icon: Icons.Manage}, {t:Tab.HISTORY, l:'履歴', Icon: Icons.History}, {t:Tab.ANALYSIS, l:'分析', Icon: Icons.Analysis}].map(n => (
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
          <div className="max-w-4xl mx-auto flex justify-between items-center h-10">
            {(activeTab === Tab.TRACKER || activeTab === Tab.MANAGE) ? (
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                {(['Morning', 'Afternoon', 'Evening'] as Category[]).map(c => (
                  <button key={c} onClick={() => {setCategoryTab(c); setFocusIndex(0);}} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${categoryTab === c ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>
                    {c === 'Morning' ? '朝' : c === 'Afternoon' ? '昼' : '夜'}
                  </button>
                ))}
              </div>
            ) : <div />}
            
            {activeTab === Tab.HISTORY && (
               <button onClick={()=>setHistorySortDesc(!historySortDesc)} className="text-xs font-bold bg-slate-100 px-3 py-1 rounded text-slate-600">
                 並び替え: {historySortDesc ? '新しい順' : '古い順'}
               </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
          <div className="max-w-4xl mx-auto divide-y divide-slate-50 pb-32"> {/* pb-32に増やして下部UIのスペース確保 */}
            
            {/* --- TRACKER --- */}
            {activeTab === Tab.TRACKER && currentCategoryRoutines.map((r, i) => {
              const done = logs.find(l => l.routineId === r.id && l.timestamp >= new Date().setHours(0,0,0,0));
              return (
                // UI変更: p-3 -> p-2, text-base -> text-sm でコンパクト化
                <div key={r.id} className={`p-2 flex items-center justify-between transition-colors hover:bg-slate-50 ${focusIndex === i ? 'bg-slate-50/80' : ''}`}>
                  <div 
                    className="flex items-center gap-3 pl-2 flex-1 cursor-pointer"
                    onClick={() => { 
                      const today = new Date().setHours(0,0,0,0); 
                      const updated = done ? logs.filter(l => l.id !== done.id) : [{ id: nanoid(), routineId: r.id, timestamp: Date.now() }, ...logs]; 
                      setLogs(updated); sync('save', { r: routines, l: updated }); 
                    }}
                  >
                    <span className={`text-xl w-8 text-center ${done ? 'opacity-20 grayscale transition-all' : ''}`}>{r.emoji}</span>
                    <span className={`font-bold text-sm ${done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{r.title}</span>
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
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 pb-6 z-50">
          {[{t:Tab.TRACKER, l:'記録', Icon: Icons.Tracker}, {t:Tab.MANAGE, l:'管理', Icon: Icons.Manage}, {t:Tab.HISTORY, l:'履歴', Icon: Icons.History}, {t:Tab.ANALYSIS, l:'分析', Icon: Icons.Analysis}].map(n => (
            <button key={n.t} onClick={() => setActiveTab(n.t)} className={`flex flex-col items-center gap-1 w-16 transition-all ${activeTab === n.t ? 'text-slate-900' : 'text-slate-300'}`}>
              <n.Icon active={activeTab === n.t} />
              <span className="text-[10px] font-bold">{n.l}</span>
            </button>
          ))}
        </nav>
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