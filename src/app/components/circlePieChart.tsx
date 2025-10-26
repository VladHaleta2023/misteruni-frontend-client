'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const DEFAULT_NAMES = ['Ukończone', 'W trakcie', 'Nierozpoczęte', 'Zablokowane'];
const COLORS = ['#1b5e20', '#bfa000', '#bbbbbb', '#4a4a4a'];

interface CirclePieChartProps {
  percents: [number, number, number, number];
  statistics?: {
    solvedTasksCount: number | null;
    solvedTasksCountCompleted: number | null;
    closedSubtopicsCount: number | null;
    closedTopicsCount: number | null;
    weekLabel: string | null;
    prediction: string | null;
  };
  names?: [string?, string?, string?, string?];
  width?: string;
  maxWidth?: string;
  fontSize?: string;
  onPrev?: () => void;
  onNext?: () => void;
  showStatistic?: boolean;
}

export default function CirclePieChart({
  percents,
  statistics,
  names,
  width = '45vw',
  maxWidth = '280px',
  fontSize = '16px',
  onPrev,
  onNext,
  showStatistic = true,
}: CirclePieChartProps) {
  const data = percents.map((percent, i) => ({
    name: names && names[i] ? names[i] : DEFAULT_NAMES[i],
    percent,
  }));

  const [containerWidth, setContainerWidth] = useState(width);
  const [containerMaxWidth, setContainerMaxWidth] = useState(maxWidth);
  const [containerFontSize, setContainerFontSize] = useState(fontSize);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function updateSize() {
      const w = window.innerWidth;
      setIsMobile(w < 768);

      if (w < 768) {
        setContainerFontSize('14px');
        setContainerWidth('60vw');
        setContainerMaxWidth('220px');
      } else {
        setContainerFontSize(fontSize);
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
          width: containerWidth,
          maxWidth: containerMaxWidth,
          margin: '0 auto',
          userSelect: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: containerWidth,
            maxWidth: containerMaxWidth,
          }}
        >
          {showStatistic && onPrev && (
            <button
              onClick={onPrev}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'absolute',
                left: '-40px',
                zIndex: 2,
              }}
            >
              <ArrowLeft size={24} color="#333" />
            </button>
          )}

          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              flexShrink: 0,
              outline: 'none',
              position: 'relative',
            }}
            tabIndex={-1}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
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
                >
                  {data.slice(0, -1).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {showStatistic && statistics && (
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
                {statistics.weekLabel && (
                  <div
                    style={{
                      fontSize: containerFontSize,
                      color: '#333',
                      marginBottom: '6px',
                    }}
                  >
                    {statistics.weekLabel}
                  </div>
                )}
                {statistics.solvedTasksCount != null && statistics.solvedTasksCountCompleted != null && (
                  <div
                    style={{
                      fontSize: containerFontSize,
                      fontWeight: 600,
                      color: '#333',
                      marginBottom: '6px',
                    }}
                  >
                    +{statistics.solvedTasksCount} ({statistics.solvedTasksCountCompleted})
                  </div>
                )}
                {statistics.prediction != null ? (
                  <div
                    style={{
                      fontSize: containerFontSize,
                      fontWeight: 600,
                      color: '#333',
                    }}
                  >
                    {statistics.prediction}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {showStatistic && onNext && (
            <button
              onClick={onNext}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'absolute',
                right: '-40px',
                zIndex: 2,
              }}
            >
              <ArrowRight size={24} color="#333" />
            </button>
          )}
        </div>

        <div
          className="legend"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: '100px',
            fontSize: containerFontSize,
            color: '#333',
            marginTop: '10px',
          }}
        >
          {data.slice(0, -2).map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'default',
                marginBottom: '4px',
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
        svg {
          user-select: none;
        }
        path {
          outline: none !important;
        }
      `}</style>
    </>
  );
}