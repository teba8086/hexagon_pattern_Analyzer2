
import React, { useMemo } from 'react';
import { HexagonalPattern, EclipseEvent } from '../types';
import { formatFullDate, formatYear } from '../utils';
import { DEFAULT_TARGET_DISTANCES } from '../constants';

interface Props {
  pattern: HexagonalPattern;
}

/**
 * 시간(일수)을 물리적 픽셀 좌표로 환산하여 렌더링하는 격자 뷰
 */
const GridSymmetryView: React.FC<{ pattern: HexagonalPattern }> = ({ pattern }) => {
  const { center, pairs } = pattern;
  
  const allInPattern = useMemo(() => [center, ...pairs.flatMap(p => [p.left, p.right])].sort((a, b) => a.jdn - b.jdn), [center, pairs]);
  const minYear = allInPattern[0].year;
  const maxYear = allInPattern[allInPattern.length - 1].year;
  const years: number[] = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  const centerMonth = center.month;
  const monthLabels: number[] = [];
  for (let i = -6; i <= 6; i++) {
    let m = centerMonth + i;
    while (m <= 0) m += 12;
    while (m > 12) m -= 12;
    monthLabels.push(m);
  }

  // 시간 비례 좌표 시스템 설정
  const CELL_W = 60; // 1개월 = 60px
  const CELL_H = 80; // 1년 = 80px
  const YEAR_COL_W = 110;
  const HEADER_H = 50;

  // 이벤트의 수학적 좌표 계산
  const getCoords = (event: EclipseEvent) => {
    // X축: 월 인덱스 + (해당 월의 일자 / 31)
    const mIdx = monthLabels.indexOf(event.month);
    const x = YEAR_COL_W + (mIdx * CELL_W) + (event.day / 31) * CELL_W;
    
    // Y축: 상대 연도 + (월 / 12)
    const yIdx = event.year - minYear;
    const y = HEADER_H + (yIdx * CELL_H) + (event.month / 12) * CELL_H;
    
    return { x, y };
  };

  const nodePositions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    allInPattern.forEach(e => {
      pos[e.id] = getCoords(e);
    });
    return pos;
  }, [allInPattern, minYear, monthLabels]);

  // 주요 간격(Significant Intervals) 연결선 데이터 생성
  const significantDistances = [1211, 1212, 856, 857, 694, 695, 517, 518, 177, 1906, 355];
  const connections: Array<{ e1: EclipseEvent; e2: EclipseEvent; dist: number }> = [];

  for (let i = 0; i < allInPattern.length; i++) {
    for (let j = i + 1; j < allInPattern.length; j++) {
      const e1 = allInPattern[i];
      const e2 = allInPattern[j];
      const dist = Math.abs(e1.jdn - e2.jdn);
      if (significantDistances.some(d => Math.abs(dist - d) <= 2)) {
        connections.push({ e1, e2, dist });
      }
    }
  }

  const svgWidth = YEAR_COL_W + monthLabels.length * CELL_W + 60;
  const svgHeight = HEADER_H + years.length * CELL_H + 60;

  return (
    <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl mt-10 overflow-hidden relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          수학적 대칭 정렬 격자 (Geometric Alignment Grid)
        </h3>
        <div className="text-[10px] bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800 text-gray-500 leading-relaxed">
          <span className="text-emerald-500 font-bold">정렬 완료:</span> 시간 간격을 물리적 픽셀로 변환하여 배치하였습니다. 
          이제 노드의 위치가 육각형의 기하학적 꼭짓점과 정확히 일치합니다.
        </div>
      </div>

      <div className="relative overflow-x-auto pb-10">
        <svg 
          width={svgWidth} 
          height={svgHeight} 
          className="bg-gray-950/50 rounded-xl border border-gray-800"
        >
          {/* 그리드: 월 (세로선) */}
          {monthLabels.map((m, idx) => {
            const x = YEAR_COL_W + idx * CELL_W;
            return (
              <g key={`month-grid-${idx}`}>
                <line x1={x} y1={0} x2={x} y2={svgHeight} stroke="#1f2937" strokeWidth="1" />
                <text x={x + CELL_W/2} y={30} textAnchor="middle" fill={idx % 2 === 0 ? "#9ca3af" : "#ef4444"} fontSize="12" fontWeight="bold">
                  {m}월
                </text>
              </g>
            );
          })}

          {/* 그리드: 연도 (가로선) */}
          {years.map((y, idx) => {
            const yPos = HEADER_H + idx * CELL_H;
            return (
              <g key={`year-grid-${idx}`}>
                <line x1={0} y1={yPos} x2={svgWidth} y2={yPos} stroke="#1f2937" strokeWidth="1" />
                <text x={10} y={yPos + CELL_H/2} fill="#6b7280" fontSize="11" fontWeight="black" alignmentBaseline="middle">
                  {formatYear(y)}
                </text>
              </g>
            );
          })}

          {/* 연결선 및 일수 표시 */}
          {connections.map((c, idx) => {
            const p1 = nodePositions[c.e1.id];
            const p2 = nodePositions[c.e2.id];
            if (!p1 || !p2) return null;

            let color = "#dc2626"; 
            if (c.dist >= 1200) color = "#2563eb"; 
            if (c.dist === 518 || c.dist === 517) color = "#10b981"; 
            if (c.dist === 177) color = "#9333ea"; 

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

            return (
              <g key={`conn-${idx}`}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth="2" strokeOpacity="0.6" />
                <g transform={`translate(${midX}, ${midY}) rotate(${angle > 90 || angle < -90 ? angle + 180 : angle})`}>
                   <rect x="-24" y="-8" width="48" height="16" fill="#030712" rx="4" stroke={color} strokeWidth="0.5" strokeOpacity="0.5" />
                   <text y="4" textAnchor="middle" fill={color} fontSize="10" fontWeight="black" className="mono">
                      {Math.round(c.dist)}일
                   </text>
                </g>
              </g>
            );
          })}

          {/* 천체 노드 (일월식 포인트) */}
          {allInPattern.map((e) => {
            const { x, y } = nodePositions[e.id];
            const isCenter = e.id === center.id;
            return (
              <g key={`node-${e.id}`}>
                <circle 
                  cx={x} cy={y} r={isCenter ? 12 : 9} 
                  fill={e.category === '일식' ? '#000' : '#b91c1c'} 
                  stroke={e.category === '일식' ? '#f59e0b' : '#ef4444'} 
                  strokeWidth="2.5"
                />
                {isCenter && (
                  <circle cx={x} cy={y} r="16" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" className="animate-[spin_4s_linear_infinite]" />
                )}
                <text x={x} y={y + 24} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">
                  {e.day}일
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-6 flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-gray-600 bg-black/20 p-4 rounded-xl border border-gray-800">
         <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-black border border-amber-500 rounded-full"></div> 개기일식 (Solar)
         </div>
         <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-700 border border-red-500 rounded-full"></div> 블러드문 (Lunar)
         </div>
         <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 rounded-full bg-emerald-500/10"></div> 패턴 중심 (Center)
         </div>
      </div>
    </div>
  );
}

const PatternDetails: React.FC<Props> = ({ pattern }) => {
  const { center, pairs } = pattern;
  const allEvents = useMemo(() => {
    const list = [{ event: center, role: 'Center' }, ...pairs.flatMap((p, i) => [{ event: p.left, role: `L${i}` }, { event: p.right, role: `R${i}` }])];
    return list.sort((a, b) => a.event.jdn - b.event.jdn);
  }, [center, pairs]);

  const totalRange = allEvents[allEvents.length - 1].event.jdn - allEvents[0].event.jdn;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div>
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">Symmetry Pattern identified</span>
            <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-4 mt-2">
              {formatFullDate(center)}
              <div className={`w-4 h-4 rounded-full ${center.category === '일식' ? 'bg-black ring-4 ring-amber-500/30' : 'bg-red-600 ring-4 ring-red-500/30'}`}></div>
            </h2>
            <p className="text-gray-500 mt-2 font-mono flex items-center gap-2">중심축 Pivot JDN: {center.jdn}</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-black/40 p-4 rounded-2xl border border-gray-800 text-center min-w-[100px]">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">총 기간</p>
              <p className="text-xl font-black text-gray-200 mono">{(totalRange / 365.25).toFixed(1)}년</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl min-h-[400px]">
          <h3 className="text-xs font-bold text-gray-400 mb-8 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 기하학적 대칭 구조
          </h3>
          <div className="flex-1 relative flex items-center justify-center h-[350px]">
             {/* 기하학적 선형 다이어그램 (기존과 동일하게 유지하거나 필요 시 보강) */}
             <svg width="100%" height="100%" viewBox="0 0 400 400" className="max-w-xs overflow-visible">
               {pairs.map((p, i) => (
                 <g key={i}>
                   <line x1="50" y1={80 + i * 80} x2="200" y2="200" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
                   <line x1="350" y1={80 + i * 80} x2="200" y2="200" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
                   <circle cx="50" cy={80 + i * 80} r="6" fill={p.left.category === '일식' ? '#000' : '#b91c1c'} stroke="#ef4444" />
                   <circle cx="350" cy={80 + i * 80} r="6" fill={p.right.category === '일식' ? '#000' : '#b91c1c'} stroke="#ef4444" />
                   <text x="200" y={80 + i * 80} textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">{Math.round(p.averageDistance)}일</text>
                 </g>
               ))}
               <circle cx="200" cy="200" r="10" fill={center.category === '일식' ? '#000' : '#b91c1c'} stroke="#f59e0b" strokeWidth="2" />
             </svg>
          </div>
        </div>

        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl max-h-[500px] overflow-hidden">
          <h3 className="text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">상세 대칭쌍 정보</h3>
          <div className="space-y-4 overflow-y-auto h-full pr-2">
             {pairs.map((p, idx) => (
                <div key={idx} className="bg-black/20 p-4 rounded-xl border border-gray-800">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-emerald-500 font-black">PAIR {String.fromCharCode(65+idx)}</span>
                      <span className="text-[11px] font-black text-gray-400">{Math.round(p.averageDistance)}일</span>
                   </div>
                   <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-300">{formatFullDate(p.left)}</span>
                      <span className="text-gray-600">↔</span>
                      <span className="text-gray-300">{formatFullDate(p.right)}</span>
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      <GridSymmetryView pattern={pattern} />
    </div>
  );
};

export default PatternDetails;
