
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  EclipseEvent, 
  HexagonalPattern, 
  SymmetryPair 
} from './types';
import { 
  dateToJDN, 
  parseEclipseDate, 
  formatFullDate
} from './utils';
import { 
  DEFAULT_TARGET_DISTANCES, 
  MAX_WINDOW_DAYS, 
  DEFAULT_TOLERANCE 
} from './constants';
import { DEFAULT_CSV_DATA } from './defaultData';
import Dashboard from './components/Dashboard';
import PatternDetails from './components/PatternDetails';

const APP_VERSION = "v1.5.0";

const App: React.FC = () => {
  const [data, setData] = useState<EclipseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [patterns, setPatterns] = useState<HexagonalPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<HexagonalPattern | null>(null);
  const [searchProgress, setSearchProgress] = useState(0);
  
  const dataRef = useRef<EclipseEvent[]>([]);
  const detailsContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processCSV = useCallback((csvText: string) => {
    setIsLoading(true);
    const lines = csvText.split(/\r?\n/);
    const results: EclipseEvent[] = [];

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || idx === 0 || trimmedLine.includes('날짜 및 시간')) return;
      
      const parts = trimmedLine.split(',');
      if (parts.length < 3) return;

      const dateInfo = parseEclipseDate(parts[0]);
      if (!dateInfo) return;

      const jdn = dateToJDN(dateInfo.year, dateInfo.month, dateInfo.day);
      
      results.push({
        id: `e-${idx}-${jdn}`,
        originalDateStr: parts[0].trim(),
        year: dateInfo.year,
        month: dateInfo.month,
        day: dateInfo.day,
        timeStr: dateInfo.time,
        kind: parts[1].trim() as any,
        category: parts[2].trim() as any,
        jdn
      });
    });

    results.sort((a, b) => a.jdn - b.jdn);
    dataRef.current = results;
    setData(results);
    setPatterns([]); 
    setSelectedPattern(null);
    setIsLoading(false);
    return results;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        processCSV(text);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadResultsCSV = () => {
    if (patterns.length === 0) return;

    const headers = [
      "Pattern ID", "Center Date", "Center Type",
      "Pair A (L Date)", "Pair A (R Date)", "Pair A (Avg Dist)",
      "Pair B (L Date)", "Pair B (R Date)", "Pair B (Avg Dist)",
      "Pair C (L Date)", "Pair C (R Date)", "Pair C (Avg Dist)",
      "Pair D (L Date)", "Pair D (R Date)", "Pair D (Avg Dist)"
    ];

    const rows = patterns.map((p, idx) => {
      const row = [
        `#${idx + 1}`,
        formatFullDate(p.center),
        p.center.category
      ];

      // 4개의 쌍(Pair A-D)을 고정적으로 출력
      for (let i = 0; i < 4; i++) {
        const pair = p.pairs[i];
        if (pair) {
          row.push(formatFullDate(pair.left));
          row.push(formatFullDate(pair.right));
          row.push(pair.averageDistance.toFixed(1));
        } else {
          row.push("", "", "");
        }
      }
      return row.join(",");
    });

    const csvContent = "\ufeff" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `eclipse_patterns_v1.5.0_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const findPatterns = useCallback(async () => {
    const currentData = dataRef.current;
    if (currentData.length === 0) return;
    
    setIsLoading(true);
    setSearchProgress(0);
    setPatterns([]);
    setSelectedPattern(null);

    const found: HexagonalPattern[] = [];
    const targetSet = [...DEFAULT_TARGET_DISTANCES];

    const solvePattern = (center: EclipseEvent, potentialPairs: SymmetryPair[]): SymmetryPair[] | null => {
      const groups = targetSet.map(target => 
        potentialPairs.filter(p => Math.abs(p.averageDistance - target) <= DEFAULT_TOLERANCE)
      );
      if (groups.some(g => g.length === 0)) return null;

      const result: SymmetryPair[] = [];
      const usedIds = new Set<string>();

      const backtrack = (targetIdx: number): boolean => {
        if (targetIdx === targetSet.length) return true;
        for (const pair of groups[targetIdx]) {
          if (!usedIds.has(pair.left.id) && !usedIds.has(pair.right.id)) {
            usedIds.add(pair.left.id);
            usedIds.add(pair.right.id);
            result.push(pair);
            if (backtrack(targetIdx + 1)) return true;
            result.pop();
            usedIds.delete(pair.left.id);
            usedIds.delete(pair.right.id);
          }
        }
        return false;
      };

      if (backtrack(0)) return result;
      return null;
    };

    const CHUNK_SIZE = 100;
    for (let i = 0; i < currentData.length; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, currentData.length);
      for (let centerIdx = i; centerIdx < end; centerIdx++) {
        const center = currentData[centerIdx];
        const leftCandidates: EclipseEvent[] = [];
        const rightCandidates: EclipseEvent[] = [];

        for (let j = centerIdx - 1; j >= 0; j--) {
          if (center.jdn - currentData[j].jdn > MAX_WINDOW_DAYS) break;
          leftCandidates.push(currentData[j]);
        }
        for (let k = centerIdx + 1; k < currentData.length; k++) {
          if (currentData[k].jdn - center.jdn > MAX_WINDOW_DAYS) break;
          rightCandidates.push(currentData[k]);
        }

        const potentialPairs: SymmetryPair[] = [];
        for (const L of leftCandidates) {
          for (const R of rightCandidates) {
            const dL = center.jdn - L.jdn;
            const dR = R.jdn - center.jdn;
            if (Math.abs(dL - dR) <= DEFAULT_TOLERANCE) {
              potentialPairs.push({
                left: L, right: R, distanceLeft: dL, distanceRight: dR,
                averageDistance: (dL + dR) / 2, diff: Math.abs(dL - dR)
              });
            }
          }
        }

        const validSet = solvePattern(center, potentialPairs);
        if (validSet) {
          found.push({
            center,
            pairs: validSet.sort((a, b) => b.averageDistance - a.averageDistance),
            score: validSet.reduce((acc, p) => acc + (1 - p.diff / (DEFAULT_TOLERANCE + 0.1)), 0)
          });
        }
      }
      setSearchProgress(Math.floor((end / currentData.length) * 100));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setPatterns(found);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (DEFAULT_CSV_DATA) {
      processCSV(DEFAULT_CSV_DATA);
    }
  }, [processCSV]);

  const handleSelectPattern = useCallback((p: HexagonalPattern) => {
    setSelectedPattern(p);
    if (detailsContainerRef.current) {
      detailsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen h-screen flex flex-col bg-gray-950 overflow-hidden">
      <header className="bg-gray-900 border-b border-gray-800 p-4 shrink-0 z-50 shadow-lg">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-xl ring-1 ring-emerald-400/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-100">천체 대칭 분석기 (Celestial Hexagon)</h1>
                <span className="px-2 py-0.5 bg-gray-800 text-emerald-500 text-[10px] font-black rounded border border-gray-700">{APP_VERSION}</span>
              </div>
              <p className="text-[10px] text-emerald-500 font-mono uppercase tracking-[0.2em]">External CSV Data Analysis</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".csv,.txt"
            />
            <button 
              onClick={triggerFileUpload}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm transition font-bold text-gray-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              CSV 업로드
            </button>
            <button 
              onClick={findPatterns}
              disabled={data.length === 0 || isLoading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 border border-emerald-500/50 rounded-xl text-sm transition font-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {isLoading ? `${searchProgress}% 분석 중...` : '분석 실행'}
            </button>
            <button 
              onClick={downloadResultsCSV}
              disabled={patterns.length === 0 || isLoading}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-emerald-500/30 disabled:border-gray-800 disabled:text-gray-600 rounded-xl text-sm transition font-bold text-emerald-500 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              결과 다운로드
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <div className="lg:w-[380px] flex flex-col gap-4 h-full overflow-hidden shrink-0">
          <Dashboard 
            eventCount={data.length} 
            patternCount={patterns.length}
            patterns={patterns}
            onSelectPattern={handleSelectPattern}
            selectedPatternId={selectedPattern?.center.id}
          />
        </div>

        <div 
          ref={detailsContainerRef}
          className="flex-1 overflow-y-auto pr-1 scroll-smooth bg-black/20 rounded-3xl border border-gray-800/30"
        >
          {selectedPattern ? (
            <PatternDetails pattern={selectedPattern} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center">
               <div className="relative mb-10">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
                  <div className="w-24 h-24 bg-gray-900 rounded-3xl flex items-center justify-center border border-gray-800 relative z-10">
                     <svg className="w-12 h-12 text-emerald-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                  </div>
               </div>
               <h3 className="text-2xl font-black text-gray-400">데이터를 업로드하고 분석을 시작하세요</h3>
               <p className="text-gray-600 mt-4 max-w-sm mx-auto text-sm leading-relaxed">
                 {data.length > 0 
                    ? "상단의 '분석 실행' 버튼을 누르시면 대칭 패턴을 찾아냅니다."
                    : "엑셀이나 CSV 파일을 업로드해 주세요. (날짜, 종류, 구분 형식)"
                 }
               </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
