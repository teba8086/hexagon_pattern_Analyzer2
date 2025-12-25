
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
        {/* Total Events Card */}
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-2 overflow-hidden whitespace-nowrap">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">TOTAL EVENTS</p>
            <p className="text-[10px] text-gray-400 font-bold">(로드 데이터)</p>
          </div>
          <p className={`text-2xl font-black mono tracking-tighter ${eventCount > 0 ? 'text-gray-100' : 'text-gray-700'}`}>
            {eventCount.toLocaleString()}
          </p>
        </div>

        {/* Found Patterns Card */}
        <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-2 overflow-hidden whitespace-nowrap">
            <p className="text-[9px] text-emerald-800 uppercase font-black tracking-tighter">FOUND PATTERNS</p>
            <p className="text-[10px] text-emerald-600 font-bold">(분석 결과)</p>
          </div>
          <p className={`text-2xl font-black mono tracking-tighter ${patternCount > 0 ? 'text-emerald-500' : 'text-gray-800'}`}>
            {patternCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 flex-1 rounded-2xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-800 bg-gray-900/80">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Identified Hexagons (패턴 목록)</h3>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-2 scrollbar-hide">
          {eventCount === 0 ? (
            <div className="text-center py-20 px-6 text-gray-600 font-bold text-xs uppercase italic">CSV 업로드 대기 중</div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-20 px-6 text-amber-500/50 font-black text-xs uppercase">분석 버튼을 눌러주세요</div>
          ) : (
            patterns.map((p, idx) => (
              <button
                key={p.center.id}
                onClick={() => onSelectPattern(p)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative ${
                  selectedPatternId === p.center.id 
                  ? 'bg-emerald-600 border-emerald-400 shadow-lg text-white' 
                  : 'bg-black/30 border-gray-800 hover:border-gray-700 text-gray-400'
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedPatternId === p.center.id ? 'text-emerald-200' : 'text-emerald-500/70'}`}>Pattern #{idx + 1}</span>
                  <span className="text-lg font-black mono leading-none tracking-tighter">{formatFullDate(p.center)}</span>
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
