
## Piano: Disegno Stanze Poligonali

### 1. Nuovo tipo di elemento "room"
- Aggiungere `room` ai tipi di elemento in `project.ts`
- Proprietà: `name`, `polygon` (array di punti percentuali), `linkedElementId` (icona collegata), `overlayColor` (colore glow)

### 2. Strumento di disegno poligonale sul canvas
- Modalità "Disegna Stanza" attivabile dalla toolbar
- Click per aggiungere vertici, doppio-click o click sul primo punto per chiudere il poligono
- Visualizzazione in tempo reale del poligono durante il disegno
- **Snapping**: griglia magnetica (toggle on/off con pulsante o tasto `S`)

### 3. Visualizzazione stanze sul canvas
- Rendering dei poligoni con fill semi-trasparente e bordo
- Nome della stanza visualizzato al centro del poligono
- Possibilità di selezionare e spostare i vertici dopo il disegno

### 4. Linking visivo stanza ↔ icona
- Icona "catena" (🔗) visibile sulla stanza selezionata
- Click sulla catena → modalità selezione icona → click su un'icona per collegarla
- Linea tratteggiata visiva tra stanza e icona collegata
- Scollegamento tramite click sulla catena quando già collegata

### 5. Pannello proprietà stanza
- Nome stanza (editabile)
- Colore overlay
- Icona collegata (con possibilità di cambiare/rimuovere)
- Entity HA associata
- Lista vertici (con possibilità di aggiungere/rimuovere)

### 6. Generazione overlay PNG per export
- Al momento dell'export, generare canvas con il poligono della stanza → PNG trasparente
- Includere nel ZIP come `/www/floorplan/overlays/{room-name}_glow.png`
- Generare YAML con `state_filter` e `mix-blend-mode: screen`

### File da creare/modificare:
- `src/types/project.ts` - Aggiungere tipo Room
- `src/components/RoomDrawingTool.tsx` - Nuovo componente disegno
- `src/components/RoomOverlay.tsx` - Rendering stanze sul canvas
- `src/components/RoomPropertiesPanel.tsx` - Pannello proprietà stanza
- `src/components/CanvasEditor.tsx` - Integrare strumento disegno
- `src/components/EditorToolbar.tsx` - Pulsante "Disegna Stanza" + toggle snapping
- `src/contexts/ProjectContext.tsx` - Actions per stanze
- `src/lib/export.ts` - Generazione overlay PNG e YAML
