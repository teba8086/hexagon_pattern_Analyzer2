
import React from 'react';
import { HexagonalPattern } from '../types';
import { formatFullDate, formatYear } from '../utils';

interface Props {
  eventCount: number;
  patternCount: number;
  patterns: HexagonalPattern[];
  onSelectPattern: (p: HexagonalPattern) => void;
  selectedPatternId?: string;
}

const Dashboard: React.FC<Props> = ({ eventCount, patternCount, patterns, onSelectPattern, selectedPatternId }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-xl">
          <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Total Events (총 이벤트)</p>
          <p className="text-2xl font-black text-gray-200 mono tracking-tighter">{eventCount.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-xl">
          <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest mb-1">Found Patterns (검색 결과)</p>
          <p className="text-2xl font-black text-emerald-500 mono tracking-tighter">{patternCount.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-gray-900 flex-1 rounded-2xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/80 backdrop-blur-md">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Identified Hexagons (육각도형 목록)</h3>
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-2 scrollbar-hide">
          {patterns.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="text-xs text-gray-600 font-bold">대칭 분석을 실행하세요 (Run Analysis)</p>
            </div>
          ) : (
            patterns.map((p, idx) => (
              <button
                key={p.center.id}
                onClick={() => onSelectPattern(p)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative group overflow-hidden ${
                  selectedPatternId === p.center.id 
                  ? 'bg-emerald-600 border-emerald-400 shadow-[0_10px_20px_rgba(5,150,105,0.3)] text-white' 
                  : 'bg-black/30 border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                {selectedPatternId === p.center.id && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-white opacity-50"></div>
                )}
                
                <div className="flex flex-col relative z-10">
                  <div className="flex items-center justify-between mb-2">
                     <span className={`text-[9px] font-black uppercase tracking-widest ${selectedPatternId === p.center.id ? 'text-emerald-200' : 'text-emerald-500/70'}`}>Pattern #{String(idx + 1).padStart(2, '0')} (패턴)</span>
                     <span className={`text-[10px] font-mono ${selectedPatternId === p.center.id ? 'text-white/60' : 'text-gray-600'}`}>Score: {p.score.toFixed(2)}</span>
                  </div>
                  <span className="text-lg font-black mono leading-none tracking-tighter">{formatFullDate(p.center)}</span>
                  <div className="flex gap-1.5 mt-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedPatternId === p.center.id ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                      {p.center.category === '일식' ? 'Solar (일식)' : 'Lunar (월식)'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedPatternId === p.center.id ? 'bg-white/20 text-white' : 'bg-gray-800 text-emerald-500/70 border border-gray-700'}`}>
                      4 Pairs (4쌍 대칭)
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
