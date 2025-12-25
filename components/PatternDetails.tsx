
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

  const CELL_W = 100; 
  const CELL_H = 110;  // 정상적인 밸런스로 복구
  const YEAR_COL_W = 110;
  const HEADER_H = 90; // 상단 여백 적정 수준 유지

  const getCoords = (event: EclipseEvent) => {
    const mIdx = monthLabels.indexOf(event.month);
    const x = YEAR_COL_W + (mIdx * CELL_W) + (event.day / 31) * CELL_W;
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

  const significantDistances = [1211, 1212, 856, 857, 694, 695, 517, 518, 177, 176, 1906, 355];
  
  const connections = useMemo(() => {
    const list: Array<{ e1: EclipseEvent; e2: EclipseEvent; dist: number; priority: number }> = [];
    for (let i = 0; i < allInPattern.length; i++) {
      for (let j = i + 1; j < allInPattern.length; j++) {
        const e1 = allInPattern[i];
        const e2 = allInPattern[j];
        const dist = Math.abs(e1.jdn - e2.jdn);
        
        const isMatch = significantDistances.some(d => Math.abs(dist - d) <= 1.5);
        if (isMatch) {
          const targetDistances = [177, 517, 694, 856, 1211, 1906, 355];
          const isCoreTarget = targetDistances.some(td => Math.abs(dist - td) < 0.5);
          list.push({ e1, e2, dist, priority: isCoreTarget ? 2 : 1 });
        }
      }
    }
    return list.sort((a, b) => a.dist - b.dist);
  }, [allInPattern]);

  const svgTotalWidth = YEAR_COL_W + monthLabels.length * CELL_W + 60;
  const svgTotalHeight = HEADER_H + years.length * CELL_H + 150; 

  return (
    <div className="bg-gray-900 rounded-3xl p-5 border border-gray-800 shadow-2xl mt-4 overflow-hidden relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Symmetry Grid View (Border Outside Placement)
        </h3>
        <span className="text-[9px] text-amber-500 font-black tracking-tight uppercase">Amber Axis Mode</span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${svgTotalWidth} ${svgTotalHeight}`}
          width="100%"
          height="auto"
          preserveAspectRatio="xMidYMid meet"
          className="bg-gray-950/60 rounded-xl border border-gray-800/30"
        >
          {/* 가로/세로 축 (노란색 Amber 강조) */}
          {monthLabels.map((m, idx) => {
            const x = YEAR_COL_W + idx * CELL_W;
            return (
              <g key={`month-grid-${idx}`}>
                <line x1={x} y1={0} x2={x} y2={svgTotalHeight} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="2 2" />
                <text x={x + CELL_W/2} y={45} textAnchor="middle" fill="#f59e0b" fontSize="16" fontWeight="900">{m}월</text>
              </g>
            );
          })}
          {years.map((y, idx) => {
            const yPos = HEADER_H + idx * CELL_H;
            return (
              <g key={`year-grid-${idx}`}>
                <line x1={0} y1={yPos} x2={svgTotalWidth} y2={yPos} stroke="#1f2937" strokeWidth="0.5" />
                <text x={10} y={yPos + CELL_H/2} fill="#f59e0b" fontSize="16" fontWeight="900" alignmentBaseline="middle">{formatYear(y)}</text>
              </g>
            );
          })}

          {/* 연결선 */}
          {connections.map((c, idx) => {
            const p1 = nodePositions[c.e1.id];
            const p2 = nodePositions[c.e2.id];
            if (!p1 || !p2) return null;

            let color = "#ef4444"; 
            if (c.dist >= 1200) color = "#3b82f6"; 
            if (c.dist >= 517 && c.dist <= 518) color = "#10b981"; 
            if (c.dist >= 176 && c.dist <= 177) color = "#a855f7"; 

            return (
              <line key={`line-${idx}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth="2" strokeOpacity={c.priority === 1 ? "0.15" : "0.45"} />
            );
          })}

          {/* 연결선 일수 레이블 */}
          {connections.map((c, idx) => {
            const p1 = nodePositions[c.e1.id];
            const p2 = nodePositions[c.e2.id];
            if (!p1 || !p2) return null;

            let color = "#ff4444"; 
            if (c.dist >= 1200) color = "#60a5fa"; 
            if (c.dist >= 517 && c.dist <= 518) color = "#34d399"; 

            let vOffset = 0;
            if (c.dist >= 1900) vOffset = 25;      
            else if (c.dist >= 1200) vOffset = 18; 
            else if (c.dist >= 517) vOffset = -25; 
            else vOffset = -22;                    

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 + vOffset;
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

            return (
              <g key={`label-${idx}`} transform={`translate(${midX}, ${midY}) rotate(${angle > 90 || angle < -90 ? angle + 180 : angle})`}>
                 <rect x="-24" y="-11" width="48" height="22" fill="#000000" rx="4" stroke={color} strokeWidth="1" />
                 <text y="4" textAnchor="middle" fill={color} fontSize="11" fontWeight="900" className="mono">
                    {Math.round(c.dist)}d
                 </text>
              </g>
            );
          })}

          {/* 천체 노드 및 날짜 (육각형 연결선 밖으로 "진짜" 밀어내기) */}
          {allInPattern.map((e) => {
            const { x, y } = nodePositions[e.id];
            const isCenter = e.id === center.id;
            const dateStr = formatFullDate(e);
            
            /**
             * [날짜 배치 핵심 원칙]
             * 과거 노드: 육각형 윗변보다 더 위로 (-35px) -> 선과 분리됨
             * 미래 노드: 육각형 아랫변보다 더 아래로 (+45px) -> 선과 분리됨
             * 중앙 노드: 노드 바로 아래로 (+50px) -> 노드와 분리됨
             */
            let yOffset = 0;
            if (isCenter) {
              yOffset = 50; 
            } else if (e.jdn < center.jdn) {
              yOffset = -35; // 위쪽 과거 노드 -> 위로 밀기
            } else {
              yOffset = 45;  // 아래쪽 미래 노드 -> 아래로 밀기
            }

            return (
              <g key={`node-${e.id}`}>
                <circle 
                  cx={x} cy={y} r={isCenter ? 14 : 7} 
                  fill={e.category === '일식' ? '#000' : '#b91c1c'} 
                  stroke={e.category === '일식' ? '#f59e0b' : '#ef4444'} 
                  strokeWidth={isCenter ? "4" : "2"}
                />
                
                {/* 텍스트 가독성을 위한 깔끔한 반투명 박스 (방해되지 않을 정도) */}
                <rect 
                  x={x - 80} 
                  y={y + yOffset - 16} 
                  width="160" 
                  height="30" 
                  fill="rgba(0,0,0,0.6)" 
                  rx="4"
                />
                
                <text 
                  x={x} 
                  y={y + yOffset + 6} 
                  textAnchor="middle" 
                  fill="#ffffff" 
                  fontSize="17" 
                  fontWeight="900" 
                  className="mono"
                  style={{ textShadow: '0 0 5px rgba(0,0,0,1)' }}
                >
                  {dateStr}
                </text>
              </g>
            );
          })}
        </svg>
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
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div>
            <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">Symmetry Pattern</span>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 mt-1">
              {formatFullDate(center)}
              <div className={`w-5 h-5 rounded-full ${center.category === '일식' ? 'bg-black ring-4 ring-amber-500/30' : 'bg-red-600 ring-4 ring-red-500/30'}`}></div>
            </h2>
          </div>
          <div className="bg-black/40 px-4 py-2 rounded-xl border border-gray-800 text-center">
            <p className="text-[9px] text-gray-500 uppercase font-bold">총 기간</p>
            <p className="text-xl font-black text-gray-200 mono">{(totalRange / 365.25).toFixed(1)}년</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col items-center justify-center min-h-[250px]">
          <h3 className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest self-start">기하학적 대칭 구조</h3>
          <svg width="100%" height="200" viewBox="0 0 400 320" className="max-w-xs overflow-visible">
            {pairs.map((p, i) => (
              <g key={i}>
                <line x1="60" y1={40 + i * 60} x2="200" y2="160" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.2" />
                <line x1="340" y1={40 + i * 60} x2="200" y2="160" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.2" />
                <circle cx="60" cy={40 + i * 60} r="5" fill={p.left.category === '일식' ? '#000' : '#b91c1c'} stroke="#ef4444" />
                <circle cx="340" cy={40 + i * 60} r="5" fill={p.right.category === '일식' ? '#000' : '#b91c1c'} stroke="#ef4444" />
                <text x="200" y={40 + i * 60} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">{Math.round(p.averageDistance)}일</text>
              </g>
            ))}
            <circle cx="200" cy="160" r="10" fill={center.category === '일식' ? '#000' : '#b91c1c'} stroke="#f59e0b" strokeWidth="2" />
          </svg>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl overflow-hidden max-h-[300px]">
          <h3 className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">상세 대칭쌍</h3>
          <div className="space-y-2 overflow-y-auto h-full pr-2 scrollbar-hide">
             {pairs.map((p, idx) => (
                <div key={idx} className="bg-black/20 p-3 rounded-lg border border-gray-800 text-[11px]">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-emerald-500 font-black uppercase">Pair {idx + 1}</span>
                      <span className="font-black text-gray-400">{Math.round(p.averageDistance)}일</span>
                   </div>
                   <div className="flex justify-between font-mono text-gray-300">
                      <span>{formatFullDate(p.left)}</span>
                      <span className="text-gray-600 px-2">↔</span>
                      <span>{formatFullDate(p.right)}</span>
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
