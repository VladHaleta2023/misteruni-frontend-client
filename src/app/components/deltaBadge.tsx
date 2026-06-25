'use client';

interface DeltaBadgeProps {
  currentValue: number | undefined;
  previousValue: number | undefined;
  sufix?: string
}

const getDelta = (
  currentValue: number | undefined, 
  previousValue: number | undefined
): number | null => {
  if (currentValue == null || previousValue == null) return null;
  return currentValue - previousValue;
};

export default function FormatText({ currentValue, previousValue, sufix = "" }: DeltaBadgeProps) {
  const delta = getDelta(currentValue, previousValue);
  
  if (delta === null || delta === 0) return null;
  
  const color = delta >= 0 ? '#1b5e20' : '#b71c1c';
  const prefix = delta >= 0 ? '+' : '';
  const displayDelta = Number.isInteger(delta) ? delta : parseFloat(delta.toFixed(2));
  
  return (
    <span style={{ color }}>
      {prefix}{displayDelta}{sufix}
    </span>
  );
}