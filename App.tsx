
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  EclipseEvent, 
  HexagonalPattern, 
  SymmetryPair 
} from './types';
import { 
  dateToJDN, 
  parseEclipseDate, 
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

  // CSV 파싱 및 데이터 설정
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
    setIsLoading(false);
    return results;
  }, []);

  // 대칭 패턴 찾기 로직
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

  // 초기 실행: 기본 데이터 로드
  useEffect(() => {
    if (DEFAULT_CSV_DATA) {
      processCSV(DEFAULT_CSV_DATA);
    }
  }, [processCSV]);

  // 패턴 선택 시 상세 컨테이너를 상단으로 스크롤 (UX 해결책)
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
            <div className="bg-emerald-600 p-2 rounded-lg shadow-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-100">천체 대칭 분석기 (Celestial Symmetry)</h1>
                <span className="px-2 py-0.5 bg-gray-800 text-emerald-500 text-[10px] font-black rounded border border-gray-700">{APP_VERSION}</span>
              </div>
              <p className="text-[10px] text-emerald-500 font-mono uppercase tracking-[0.2em]">6,000년 일월식 통합 분석 (BC 4000 ~ AD 2100)</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.onchange = (e: any) => {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    if (evt.target?.result) {
                      processCSV(evt.target.result as string);
                    }
                  };
                  reader.readAsText(file);
                };
                fileInput.click();
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs transition font-semibold"
            >
              CSV 직접 업로드
            </button>
            <button 
              onClick={findPatterns}
              disabled={data.length === 0 || isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-600 border border-emerald-500/50 rounded-lg text-xs transition font-bold shadow-lg"
            >
              {isLoading ? `${searchProgress}% 분석 중...` : '육각도형 분석 실행 (Analyze)'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* 왼쪽 사이드바 (패턴 목록) */}
        <div className="lg:w-[350px] flex flex-col gap-4 h-full overflow-hidden shrink-0">
          <Dashboard 
            eventCount={data.length} 
            patternCount={patterns.length}
            patterns={patterns}
            onSelectPattern={handleSelectPattern}
            selectedPatternId={selectedPattern?.center.id}
          />
        </div>

        {/* 오른쪽 상세 영역 (상세 보기 컨테이너) */}
        <div 
          ref={detailsContainerRef}
          className="flex-1 overflow-y-auto pr-2 scroll-smooth bg-gray-900/30 rounded-2xl border border-gray-800/50"
        >
          {selectedPattern ? (
            <PatternDetails pattern={selectedPattern} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-10 text-center">
               <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6 border border-gray-700">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
               </div>
               <h3 className="text-xl font-bold text-gray-400">분석된 패턴을 선택해 주세요</h3>
               <p className="text-gray-600 mt-4 max-w-sm mx-auto text-sm">
                 {data.length > 0 
                    ? patterns.length > 0 
                      ? "왼쪽 목록에서 패턴을 클릭하면 상세한 기하학적 대칭 구조가 나타납니다." 
                      : "'분석 실행' 버튼을 눌러 육각도형 패턴을 찾아보세요."
                    : "데이터가 로드되지 않았습니다."
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
