import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  precision?: number;
}

export function NumberStepper({
  value,
  onChange,
  step = 0.5,
  min = -Infinity,
  max = Infinity,
  className,
  precision = 2,
}: NumberStepperProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const round = (v: number) => Number(v.toFixed(precision));
  const change = (delta: number) => onChange(round(clamp(value + delta)));

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
        onClick={() => change(-step)}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        value={value}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        step={step}
        onChange={e => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(round(clamp(n)));
        }}
        className="h-8 text-xs bg-secondary font-mono text-center px-1"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
        onClick={() => change(step)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
