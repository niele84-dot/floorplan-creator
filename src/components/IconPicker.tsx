import React, { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface IconResult {
  prefix: string;
  name: string;
  fullName: string;
}

const ICON_SETS = [
  { id: 'mdi', name: 'Material Design Icons', license: 'Apache-2.0' },
  { id: 'mdi-light', name: 'MDI Light', license: 'Apache-2.0' },
  { id: 'ph', name: 'Phosphor', license: 'MIT' },
  { id: 'tabler', name: 'Tabler Icons', license: 'MIT' },
  { id: 'lucide', name: 'Lucide', license: 'ISC' },
  { id: 'heroicons', name: 'Heroicons', license: 'MIT' },
  { id: 'ic', name: 'Google Material', license: 'Apache-2.0' },
  { id: 'carbon', name: 'Carbon', license: 'Apache-2.0' },
];

export function IconPicker() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IconResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [haFriendly, setHaFriendly] = useState(true);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);

  const searchIcons = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const prefixes = haFriendly ? 'mdi,mdi-light' : (selectedSet || ICON_SETS.map(s => s.id).join(','));
      const resp = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=60&prefixes=${prefixes}`);
      const data = await resp.json();
      const icons: IconResult[] = (data.icons || []).map((fullName: string) => {
        const [prefix, ...rest] = fullName.split(':');
        return { prefix, name: rest.join(':'), fullName };
      });
      setResults(icons);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [haFriendly, selectedSet]);

  useEffect(() => {
    const timer = setTimeout(() => searchIcons(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchIcons]);

  const handleDragStart = (e: React.DragEvent, icon: IconResult) => {
    const isMdi = icon.prefix === 'mdi' || icon.prefix === 'mdi-light';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'icon-drop',
      prefix: icon.prefix,
      name: icon.name,
      fullName: icon.fullName,
      isMdi,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const currentLicense = selectedSet
    ? ICON_SETS.find(s => s.id === selectedSet)?.license
    : haFriendly ? 'Apache-2.0' : null;

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-3 border-b border-border space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Icon Library</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ha-mode" checked={haFriendly} onCheckedChange={setHaFriendly} className="scale-75" />
          <Label htmlFor="ha-mode" className="text-xs text-muted-foreground">HA Friendly (MDI)</Label>
        </div>
        {!haFriendly && (
          <div className="flex flex-wrap gap-1">
            {ICON_SETS.map(set => (
              <Badge
                key={set.id}
                variant={selectedSet === set.id ? 'default' : 'secondary'}
                className="text-[10px] cursor-pointer"
                onClick={() => setSelectedSet(selectedSet === set.id ? null : set.id)}
              >
                {set.name}
              </Badge>
            ))}
          </div>
        )}
        {currentLicense && (
          <p className="text-[10px] text-muted-foreground">License: {currentLicense}</p>
        )}
      </div>
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 grid grid-cols-4 gap-1">
          {loading && <p className="col-span-4 text-xs text-muted-foreground p-2">Searching...</p>}
          {!loading && query && results.length === 0 && (
            <p className="col-span-4 text-xs text-muted-foreground p-2">No results</p>
          )}
          {!query && !loading && (
            <p className="col-span-4 text-xs text-muted-foreground p-2">Type to search icons</p>
          )}
          {results.map(icon => (
            <div
              key={icon.fullName}
              draggable
              onDragStart={e => handleDragStart(e, icon)}
              className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-secondary cursor-grab active:cursor-grabbing transition-colors group"
              title={`${icon.fullName}\n${ICON_SETS.find(s => s.id === icon.prefix)?.license || 'Unknown license'}`}
            >
              <img
                src={`https://api.iconify.design/${icon.prefix}/${icon.name}.svg?color=%23${getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim().replace(/\s/g, '') ? '94a3b8' : '94a3b8'}`}
                alt={icon.name}
                className="w-7 h-7 opacity-70 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
              <span className="text-[9px] text-muted-foreground mt-1 truncate w-full text-center">
                {icon.name.length > 12 ? icon.name.slice(0, 12) + '…' : icon.name}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
