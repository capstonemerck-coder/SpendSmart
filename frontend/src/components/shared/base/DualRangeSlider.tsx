import { useRef, useState } from 'react';

interface DualRangeSliderProps {
  minValue: number;
  maxValue: number;
  onChange?: (min: number, max: number) => void;
  disabled?: boolean;
}

export function DualRangeSlider({ minValue, maxValue, onChange, disabled }: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [showSaturationTooltip, setShowSaturationTooltip] = useState(false);

  const minPos = ((minValue + 100) / 200) * 100;
  const maxPos = ((maxValue + 100) / 200) * 100;
  const saturationPoint = 30;
  const saturationPos = ((saturationPoint + 100) / 200) * 100;

  const getValueFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pos * 200 - 100);
  };

  const startDrag = (thumb: 'min' | 'max') => (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !onChange) return;
    e.preventDefault();
    e.stopPropagation();

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const val = getValueFromClientX(clientX);
      if (thumb === 'min') {
        onChange(Math.max(-100, Math.min(0, Math.min(val, maxValue))), maxValue);
      } else {
        onChange(minValue, Math.max(0, Math.min(100, Math.max(val, minValue))));
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onChange) return;
    const val = getValueFromClientX(e.clientX);
    const pos = ((val + 100) / 200) * 100;
    const distToMin = Math.abs(pos - minPos);
    const distToMax = Math.abs(pos - maxPos);
    if (distToMin < distToMax) {
      onChange(Math.max(-100, Math.min(0, val)), maxValue);
    } else {
      onChange(minValue, Math.max(0, Math.min(100, val)));
    }
  };

  return (
    <div className="flex items-center w-64">
      <div
        ref={trackRef}
        className={`relative h-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-full flex-1 ${!disabled ? 'cursor-pointer' : ''}`}
        onClick={handleTrackClick}
      >
        {/* Active range - left side (negative) */}
        {minValue < 0 && (
          <div
            className={`absolute h-full rounded-full ${disabled ? 'bg-[var(--ink-400)]' : 'bg-[var(--brand)]'}`}
            style={{ left: `${minPos}%`, width: `${50 - minPos}%`, top: '-1px', height: 'calc(100% + 2px)' }}
          />
        )}

        {/* Active range - right side (positive, before saturation) */}
        {maxValue > 0 && maxValue <= saturationPoint && (
          <div
            className={`absolute h-full rounded-full ${disabled ? 'bg-[var(--ink-400)]' : 'bg-[var(--brand)]'}`}
            style={{ left: '50%', width: `${maxPos - 50}%`, top: '-1px', height: 'calc(100% + 2px)' }}
          />
        )}

        {/* Active range - right side (positive, up to saturation) */}
        {maxValue > saturationPoint && (
          <>
            <div
              className={`absolute h-full ${disabled ? 'bg-[var(--ink-400)]' : 'bg-[var(--brand)]'}`}
              style={{ left: '50%', width: `${saturationPos - 50}%`, top: '-1px', height: 'calc(100% + 2px)' }}
            />
            {/* Beyond saturation - dull red */}
            <div
              className="absolute h-full rounded-r-full"
              style={{
                left: `${saturationPos}%`,
                width: `${maxPos - saturationPos}%`,
                top: '-1px',
                height: 'calc(100% + 2px)',
                backgroundColor: '#dc2626',
                opacity: 0.6
              }}
            />
          </>
        )}

        {/* Center marker */}
        <div className="absolute h-2 w-px bg-[var(--ink-300)] top-1/2 -translate-y-1/2" style={{ left: '50%' }} />

        {/* Saturation point marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-5"
          style={{ left: `${saturationPos}%` }}
          onMouseEnter={() => setShowSaturationTooltip(true)}
          onMouseLeave={() => setShowSaturationTooltip(false)}
        >
          <div className="w-2 h-2 bg-orange-500 border border-orange-600 rotate-45 shadow-sm" />
          {showSaturationTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap shadow-lg">
              Saturation point
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
            </div>
          )}
        </div>

        {/* Min handle */}
        <div
          className={`absolute w-3.5 h-3.5 bg-white border-2 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm z-10 ${disabled ? 'border-[var(--ink-400)]' : 'border-[var(--brand)] cursor-grab active:cursor-grabbing'}`}
          style={{ left: `${minPos}%` }}
          onMouseDown={startDrag('min')}
          onTouchStart={startDrag('min')}
          onClick={(e) => e.stopPropagation()}
        />
        {/* Max handle */}
        <div
          className={`absolute w-3.5 h-3.5 bg-white border-2 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm z-10 ${disabled ? 'border-[var(--ink-400)]' : 'border-[var(--brand)] cursor-grab active:cursor-grabbing'}`}
          style={{ left: `${maxPos}%` }}
          onMouseDown={startDrag('max')}
          onTouchStart={startDrag('max')}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}