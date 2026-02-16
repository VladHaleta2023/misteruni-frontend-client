'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect, useRef } from 'react';

const DEFAULT_NAMES = ['Ukończone', 'W trakcie', 'Nierozpoczęte'];
const COLORS = ['#1b5e20', '#bfa000', '#bbbbbb'];

interface CirclePieChartProps {
  percents: [number, number, number];
  prediction: string | null;
  names?: [string?, string?, string?, string?];
  width?: string;
  maxWidth?: string;
  fontSize?: string;
  showStatistic?: boolean;
}

export default function CirclePieChart({
  percents,
  prediction,
  names,
  width = '60vw', // Уменьшено с 70vw
  maxWidth = '280px', // Уменьшено с 280px
  fontSize = '16px',
  showStatistic = true,
}: CirclePieChartProps) {
  const [containerWidth, setContainerWidth] = useState(width);
  const [containerMaxWidth, setContainerMaxWidth] = useState(maxWidth);
  const [containerFontSize, setContainerFontSize] = useState(fontSize);
  const [isMobile, setIsMobile] = useState(false);
  const initializedRef = useRef(false);

  const data = percents.map((percent, i) => ({
    name: names && names[i] ? names[i] : DEFAULT_NAMES[i],
    percent,
  }));

  useEffect(() => {
    if (initializedRef.current) return;
    
    function updateSize() {
      const w = window.innerWidth;
      setIsMobile(w < 768);

      if (w < 768) {
        setContainerFontSize('16px');
        setContainerWidth('60vw');
        setContainerMaxWidth('220px');
      } else {
        setContainerFontSize(fontSize);
        setContainerWidth(width);
        setContainerMaxWidth(maxWidth);
      }
    }

    updateSize();
    
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 100);
    };

    window.addEventListener('resize', handleResize);
    initializedRef.current = true;
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [width, maxWidth, fontSize]);

  return (
    <>
      <div
        className={`container ${isMobile ? 'mobile' : 'desktop'}`}
        style={{
          width: containerWidth,
          maxWidth: containerMaxWidth,
          margin: '0 auto',
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          touchAction: 'manipulation',
        }}
        tabIndex={-1}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: '100%',
            height: 'auto',
          }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="percent"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"  // Уменьшено (было 60%)
                  outerRadius="85%"  // Уменьшено (было 85%)
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {showStatistic && prediction && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                {prediction != null && (
                  <div
                    style={{
                      fontSize: isMobile ? 
                        (parseInt(containerFontSize) * 0.85) + 'px' : 
                        containerFontSize,
                      fontWeight: 600,
                      color: '#333',
                    }}
                  >
                    {prediction}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="legend"
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: isMobile ? 
              (parseInt(containerFontSize) * 0.9) + 'px' : // Уменьшен размер шрифта легенды
              containerFontSize,
            color: '#333',
          }}
        >
          {data.slice(0, -1).map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              <div
                style={{
                  width: '12px', // Уменьшено с 14px
                  height: '12px', // Уменьшено с 14px
                  backgroundColor: COLORS[index % COLORS.length],
                  marginRight: '8px', // Уменьшено с 10px
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              />
              <span style={{ marginRight: '5px', fontWeight: 500 }}>{item.percent}%</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .container.desktop {
          flex-direction: row;
          flex-wrap: nowrap;
        }
        .container.mobile {
          flex-direction: column;
          flex-wrap: nowrap;
        }
      `}</style>

      <style jsx global>{`
        * {
          -webkit-tap-highlight-color: transparent;
        }
        *:focus {
          outline: none !important;
        }
        svg {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        path {
          outline: none !important;
        }
        button:focus {
          outline: none !important;
        }
      `}</style>
    </>
  );
}