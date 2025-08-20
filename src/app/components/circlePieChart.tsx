'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

const DEFAULT_NAMES = ['Ukończone', 'W trakcie', 'Nierozpoczęte', 'Zablokowane'];
const COLORS = ['#1b5e20', '#bfa000', '#d6d6d6', '#4a4a4a'];

interface CirclePieChartProps {
  percents: [number, number, number, number];
  names?: [string?, string?, string?, string?];
  width?: string;
  maxWidth?: string;
}

export default function CirclePieChart({
  percents,
  names,
  width = '45vw',
  maxWidth = '240px',
}: CirclePieChartProps) {
  const data = percents.map((percent, i) => ({
    name: names && names[i] ? names[i] : DEFAULT_NAMES[i],
    percent,
  }));

  const [containerWidth, setContainerWidth] = useState(width);
  const [containerMaxWidth, setContainerMaxWidth] = useState(maxWidth);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function updateSize() {
      const w = window.innerWidth;
      setIsMobile(w < 768);

      if (w < 480) {
        setContainerWidth('70vw');
        setContainerMaxWidth('180px');
      } else if (w < 768) {
        setContainerWidth('60vw');
        setContainerMaxWidth('220px');
      } else {
        setContainerWidth(width);
        setContainerMaxWidth(maxWidth);
      }
    }

    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, maxWidth]);

  return (
    <>
      <div
        className={`container ${isMobile ? 'mobile' : 'desktop'}`}
        style={{
          width: '90vw',
          maxWidth: '800px',
          margin: '0 auto',
          userSelect: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            width: containerWidth,
            maxWidth: containerMaxWidth,
            aspectRatio: '1 / 1',
            flexShrink: 0,
            outline: 'none',
          }}
          tabIndex={-1}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart tabIndex={-1} style={{ outline: 'none' }}>
              <Pie
                data={data}
                dataKey="percent"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="95%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                stroke="none"
                isAnimationActive={false}
                tabIndex={-1}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    tabIndex={-1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div
          className="legend"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '100px',
            fontSize: 'clamp(14px, 1.67vw, 18px)',
            color: '#333',
          }}
        >
          {data.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: COLORS[index % COLORS.length],
                  marginRight: '10px',
                  borderRadius: '2px',
                }}
              />
              <span style={{ marginRight: '6px', fontWeight: 500 }}>{item.percent}%</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
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
        .recharts-pie-sector:focus,
        .recharts-pie-sector:active,
        .recharts-pie-sector:hover,
        path:focus,
        path:active,
        path:hover,
        svg:focus,
        svg:active,
        svg:hover {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }

        svg {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
    </>
  );
}