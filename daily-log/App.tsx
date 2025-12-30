import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routine, RoutineLog, Tab, Category } from './types';
import { Button, Card, Input } from './components/ui';
import { nanoid } from 'nanoid';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const WORKER_URL = "https://my-gemini-worker.01-yen-ambient.workers.dev";

const EXTENDED_EMOJIS = [
  '☀️', '🏃', '🧘', '💧', '💊', '📚', '🧹', '🥗', '🌤', '☕️', '💻', '🚶', '🍎', '💪', '🦷', '🛁', '🌙', '🕯', '📝', '🧘‍♀️', '🛌', '🧼', '🥦', '🥛',
  '🍳', '🚲', '🎸', '🎨', '🎧', '🛀', '🧼', '🧴', '👔', '💼', '💻', '📱', '🔋', '🗑', '🧺', '🛒', '🛍', '💸', '💳', '🎁', '🎂', '🎈', '🎉', '🎊',
  '🐶', '🐱', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🐧', '🐦', '🐤', '🦋', '🐝', '🐞', '🦗', '🕷', '🕸'
];

export default function App() {
  const [password, setPassword] = useState(localStorage.getItem('app_password') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.TRACKER);
  const [categoryTab, setCategoryTab] = useState<Category>((localStorage.getItem('active_category') as Category) || 'Morning');
  
  const [focusIndex, setFocusIndex] = useState<number>(0);
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

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

  useEffect(() => { if (password) sync('fetch'); }, [password, sync]);

  const moveItem = (from: number, to: number) => {
    const currentRoutines = routines.filter(r => (r.category || 'Morning') === categoryTab);
    if (to < 0 || to >= currentRoutines.length) return;
    const newRoutines = [...routines];
    const fromRoutine = currentRoutines[from];
    const toRoutine = currentRoutines[to];
    const fromIdx = routines.findIndex(r => r.id === fromRoutine.id);
    const toIdx = routines.findIndex(r => r.id === toRoutine.id);
    const [moved] = newRoutines.splice(fromIdx, 1);
    newRoutines.splice(toIdx, 0, moved);
    const updated = newRoutines.map((r, i) => ({ ...r, order: i }));
    setRoutines(updated);
    setFocusIndex(to);
    sync('save', { r: updated, l: logs });
  };

  const suggestEmoji = async (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
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
  };

  useEffect(() => {
    if ((activeTab !== Tab.MANAGE && activeTab !== Tab.TRACKER) || isEmojiPickerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const currentList = routines.filter(r => (r.category || 'Morning') === categoryTab);
      if (e.key === 'ArrowDown') { 
        e.preventDefault(); 
        if (e.ctrlKey && activeTab === Tab.MANAGE) moveItem(focusIndex, focusIndex + 1);
        else setFocusIndex(p => Math.min(p + 1, currentList.length - 1));
      } else if (e.key === 'ArrowUp') { 
        e.preventDefault(); 
        if (e.ctrlKey && activeTab === Tab.MANAGE) moveItem(focusIndex, focusIndex - 1);
        else setFocusIndex(p => Math.max(p - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, routines, focusIndex, isEmojiPickerOpen, categoryTab]);

  const exportCSV = () => {
    const header = "Date,Time,Habit,Category\n";
    const body = logs.filter(l => historyFilter === 'ALL' || l.routineId === historyFilter).map(l => {
      const r = routines.find(ru => ru.id === l.routineId);
      return `${new Date(l.timestamp).toLocaleDateString()},${new Date(l.timestamp).toLocaleTimeString()},"${r?.title}","${r?.category}"`;
    }).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([header + body], { type: 'text/csv' }));
    link.download = `logs.csv`; link.click();
  };

  if (!isAuthorized) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold mb-8 text-slate-800 tracking-widest">DAILY LOG</h1>
        <Input type="password" placeholder="合言葉" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sync('fetch')} className="mb-4 text-center border-slate-200" />
        <Button onClick={()=>sync('fetch')} className="w-full h-12 bg-slate-900">ログイン</Button>
      </div>
    </div>
  );

  const currentCategoryRoutines = routines.filter(r => (r.category || 'Morning') === categoryTab);

  return (
    <div className="min-h-screen bg-white md:pl-64 flex flex-col h-screen overflow-hidden text-slate-900">
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-white border-r p-6">
        <h1 className="text-lg font-bold mb-10 tracking-tighter">DAILY LOG</h1>
        <nav className="space-y-1">
          {[{t:Tab.TRACKER, l:'記録', i:'✓'}, {t:Tab.MANAGE, l:'管理', i:'⚙'}, {t:Tab.HISTORY, l:'履歴', i:'🕒'}, {t:Tab.ANALYSIS, l:'分析', i:'✨'}].map(n => (
            <button key={n.t} onClick={() => setActiveTab(n.t)} className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all flex items-center gap-3 ${activeTab === n.t ? 'bg-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
              <span className="text-lg">{n.i}</span>{n.l}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <header className="p-4 md:p-10 pb-4 border-b bg-white z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {activeTab === Tab.TRACKER && '記録'}
              {activeTab === Tab.MANAGE && '管理'}
              {activeTab === Tab.HISTORY && '履歴'}
              {activeTab === Tab.ANALYSIS && '分析'}
            </h2>
            {(activeTab === Tab.TRACKER || activeTab === Tab.MANAGE) && (
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                {(['Morning', 'Afternoon', 'Evening'] as Category[]).map(c => (
                  <button key={c} onClick={() => {setCategoryTab(c); localStorage.setItem('active_category', c); setFocusIndex(0);}} className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all uppercase tracking-tighter ${categoryTab === c ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400'}`}>
                    {c === 'Morning' ? '朝' : c === 'Afternoon' ? '昼' : '夜'}
                  </button>
                ))}
              </div>
            )}
            {activeTab === Tab.MANAGE && (
              <button className="text-sm font-bold text-slate-900 underline underline-offset-4" onClick={() => { 
                const nr = { id: nanoid(), title: '新しい習慣', emoji: '✨', color: '', order: routines.length, category: categoryTab }; 
                setRoutines([...routines, nr]); 
                setFocusIndex(currentCategoryRoutines.length);
                sync('save', { r: [...routines, nr], l: logs }); 
              }}>追加</button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto divide-y divide-slate-50">
            {activeTab === Tab.TRACKER && currentCategoryRoutines.map((r, i) => {
              const done = logs.find(l => l.routineId === r.id && l.timestamp >= new Date().setHours(0,0,0,0));
              return (
                <div key={r.id} onClick={() => { const today = new Date().setHours(0,0,0,0); const updated = done ? logs.filter(l => l.id !== done.id) : [{ id: nanoid(), routineId: r.id, timestamp: Date.now() }, ...logs]; setLogs(updated); sync('save', { r: routines, l: updated }); }} className={`p-5 flex items-center justify-between transition-colors cursor-pointer hover:bg-slate-50 ${focusIndex === i ? 'bg-slate-50/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <span className={`text-xl ${done ? 'opacity-20 transition-opacity' : ''}`}>{r.emoji}</span>
                    <span className={`font-bold text-sm ${done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{r.title}</span>
                  </div>
                  {done ? (
                    <span className="text-[10px] font-mono text-slate-400">{new Date(done.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  ) : (
                    <div className="w-5 h-5 border-2 border-slate-100 rounded-full" />
                  )}
                </div>
              );
            })}

            {activeTab === Tab.MANAGE && currentCategoryRoutines.map((r, i) => (
              <div key={r.id} onClick={() => setFocusIndex(i)} className={`p-4 pl-6 flex items-center gap-4 transition-colors hover:bg-slate-50 ${focusIndex === i ? 'bg-slate-50 border-l-4 border-slate-900' : 'pl-7'}`}>
                <button onClick={() => { setFocusIndex(i); setIsEmojiPickerOpen(true); }} className="text-xl transition-transform active:scale-125">{r.emoji}</button>
                <input className="flex-1 font-bold text-sm text-slate-700 bg-transparent border-none focus:ring-0 p-0" value={r.title} onChange={(e) => { const updated = routines.map((ru) => ru.id === r.id ? { ...ru, title: e.target.value } : ru); setRoutines(updated); }} onBlur={() => sync('save', { r: routines, l: logs })} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                <button onClick={() => suggestEmoji(r.id)} className="text-xs opacity-20 hover:opacity-100 transition-opacity p-2">🤖</button>
                <button onClick={() => { if(confirm('削除しますか？')){ const u=routines.filter(ru=>ru.id!==r.id); setRoutines(u); sync('save',{r:u,l:logs}); } }} className="text-slate-300 text-lg px-2">×</button>
              </div>
            ))}

            {activeTab === Tab.HISTORY && (
              <div className="divide-y divide-slate-50">
                 <div className="p-4 bg-slate-50/50 flex gap-4">
                    <select className="flex-1 bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none" value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)}>
                      <option value="ALL">すべて</option>
                      {routines.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                    <button onClick={exportCSV} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">CSV保存</button>
                 </div>
                 {logs.filter(l=>historyFilter==='ALL'||l.routineId===historyFilter).sort((a,b)=>b.timestamp-a.timestamp).slice(0, 50).map(l => {
                    const r = routines.find(ru => ru.id === l.routineId);
                    return (
                      <div key={l.id} className="p-5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="text-lg opacity-60">{r?.emoji}</span>
                          <span className="font-bold text-sm text-slate-600">{r?.title}</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">{new Date(l.timestamp).toLocaleString([], {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                      </div>
                    );
                 })}
              </div>
            )}

            {activeTab === Tab.ANALYSIS && (
              <div className="p-6 space-y-8">
                <Button className="w-full h-14 bg-slate-900 text-white rounded-none font-bold" onClick={async()=>{
                  setIsAnalyzing(true);
                  try {
                    const res = await fetch(`${WORKER_URL}/gemini`, { method:"POST", headers:{"X-App-Password":password,"Content-Type":"application/json"}, body:JSON.stringify({prompt:`習慣分析して: ${JSON.stringify(routines)}, Logs: ${JSON.stringify(logs.slice(0,50))}`})});
                    const d = await res.json(); setAnalysisResult(d.text);
                  } catch(e){setAnalysisResult("通信エラー");}
                  setIsAnalyzing(false);
                }} isLoading={isAnalyzing}>分析実行</Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="h-64"><ResponsiveContainer><PieChart><Pie data={routines.map(r=>({name:r.title, value:logs.filter(l=>l.routineId===r.id).length})).filter(v=>v.value>0)} dataKey="value" cx="50%" cy="50%" outerRadius={60} fill="#f8fafc" stroke="#e2e8f0" label={{fontSize: 8}} /></PieChart></ResponsiveContainer></div>
                   <div className="h-64"><ResponsiveContainer><BarChart data={routines.map(r=>({name:r.title, count:logs.filter(l=>l.routineId===r.id).length})).filter(v=>v.count>0)}><XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} /><YAxis hide /><Bar dataKey="count" fill="#f8fafc" /></BarChart></ResponsiveContainer></div>
                </div>
                <div className="text-sm leading-relaxed text-slate-600 border-t pt-6 whitespace-pre-wrap">{analysisResult || "分析ボタンを押すとここに結果が表示されます。"}</div>
              </div>
            )}
          </div>
        </div>

        {activeTab === Tab.MANAGE && (
          <div className="fixed bottom-[100px] left-0 right-0 md:left-64 flex justify-center gap-10 p-4 pointer-events-none opacity-20 hover:opacity-100 transition-opacity">
            <button onClick={() => moveItem(focusIndex, focusIndex - 1)} className="pointer-events-auto w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xl">▲</button>
            <button onClick={() => moveItem(focusIndex, focusIndex + 1)} className="pointer-events-auto w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xl">▼</button>
          </div>
        )}

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-4 pb-8 z-50">
          {[{t:Tab.TRACKER, l:'記録', i:'✓'}, {t:Tab.MANAGE, l:'管理', i:'⚙'}, {t:Tab.HISTORY, l:'履歴', i:'🕒'}, {t:Tab.ANALYSIS, l:'分析', i:'✨'}].map(item => (
            <button key={item.t} onClick={() => setActiveTab(item.t)} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === item.t ? 'text-slate-900' : 'text-slate-300'}`}>
              <span className="text-xl font-bold">{item.i}</span>
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.l}</span>
            </button>
          ))}
        </nav>
      </main>

      {/* Emoji Picker Modal */}
      {isEmojiPickerOpen && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex items-center justify-center p-6" onClick={() => setIsEmojiPickerOpen(false)}>
          <div className="w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex flex-wrap gap-4 justify-center max-h-[60vh] overflow-y-auto">
              {EXTENDED_EMOJIS.map(e => (
                <button key={e} onClick={() => { const u=routines.map((ru,idx)=>ru.id === currentCategoryRoutines[focusIndex].id ? {...ru, emoji:e} : ru); setRoutines(u); sync('save',{r:u,l:logs}); setIsEmojiPickerOpen(false); }} className={`text-3xl p-2 hover:scale-125 transition-transform`}>{e}</button>
              ))}
            </div>
            <button className="w-full mt-10 text-xs font-black uppercase tracking-widest text-slate-400" onClick={() => setIsEmojiPickerOpen(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}