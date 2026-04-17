import React from 'react';
import { LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CollapsiblePanelProps {
  side: 'left' | 'right';
  title: string;
  icon: LucideIcon;
  collapsed: boolean;
  onToggle: () => void;
  width?: string; // tailwind width class e.g. 'w-64'
  children: React.ReactNode;
}

export function CollapsiblePanel({
  side,
  title,
  icon: Icon,
  collapsed,
  onToggle,
  width = 'w-64',
  children,
}: CollapsiblePanelProps) {
  const borderClass = side === 'left' ? 'border-r' : 'border-l';

  if (collapsed) {
    const ChevronIcon = side === 'left' ? ChevronRight : ChevronLeft;
    return (
      <div
        className={`w-9 flex-shrink-0 ${borderClass} border-border bg-card flex flex-col items-center py-2 gap-2`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggle}
          title={`Apri ${title}`}
        >
          <ChevronIcon className="h-3.5 w-3.5" />
        </Button>
        <button
          onClick={onToggle}
          className="flex flex-col items-center gap-1.5 px-1 py-2 rounded hover:bg-accent transition-colors group"
          title={`Apri ${title}`}
        >
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          <span
            className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground tracking-wider uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {title}
          </span>
        </button>
      </div>
    );
  }

  const ChevronIcon = side === 'left' ? ChevronLeft : ChevronRight;

  return (
    <div className={`${width} flex-shrink-0 ${borderClass} border-border bg-card flex flex-col h-full relative`}>
      <div className="h-8 flex items-center justify-between px-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggle}
          title={`Chiudi ${title}`}
        >
          <ChevronIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
