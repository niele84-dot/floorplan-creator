import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FloorplanProject, FloorplanElement, Room } from '@/types/project';

const ICON_SET_LICENSES: Record<string, string> = {
  mdi: 'Material Design Icons - Apache License 2.0 - https://github.com/Templarian/MaterialDesign',
  'mdi-light': 'MDI Light - Apache License 2.0',
  ph: 'Phosphor Icons - MIT License - https://github.com/phosphor-icons/core',
  tabler: 'Tabler Icons - MIT License - https://github.com/tabler/tabler-icons',
  lucide: 'Lucide Icons - ISC License - https://github.com/lucide-icons/lucide',
  heroicons: 'Heroicons - MIT License - https://github.com/tailwindlabs/heroicons',
  ic: 'Google Material Icons - Apache License 2.0',
  carbon: 'Carbon Icons - Apache License 2.0 - https://github.com/carbon-design-system/carbon',
};

function generateElementYAML(el: FloorplanElement, indent: string): string {
  const lines: string[] = [];

  if (el.type === 'conditional') {
    lines.push(`${indent}- type: conditional`);
    if (el.ha.conditions && el.ha.conditions.length > 0) {
      lines.push(`${indent}  conditions:`);
      for (const cond of el.ha.conditions) {
        lines.push(`${indent}    - entity: ${cond.entity}`);
        lines.push(`${indent}      state: "${cond.state}"`);
      }
    }
    lines.push(`${indent}  elements:`);
    const nestedType = el.ha.icon ? 'state-icon' : 'image';
    lines.push(`${indent}    - type: ${nestedType}`);
    if (el.ha.entity) lines.push(`${indent}      entity: ${el.ha.entity}`);
    if (el.ha.icon) lines.push(`${indent}      icon: ${el.ha.icon}`);
    if (el.ha.image) lines.push(`${indent}      image: ${el.ha.image}`);
    lines.push(`${indent}      style:`);
    lines.push(`${indent}        top: "${el.position.topPct.toFixed(1)}%"`);
    lines.push(`${indent}        left: "${el.position.leftPct.toFixed(1)}%"`);
    if (el.size.widthPct && !el.ha.icon) lines.push(`${indent}        width: "${el.size.widthPct.toFixed(1)}%"`);
    if (el.rotationDeg) lines.push(`${indent}        transform: "rotate(${el.rotationDeg}deg)"`);
    return lines.join('\n');
  }

  lines.push(`${indent}- type: ${el.type}`);
  if (el.ha.entity) lines.push(`${indent}  entity: ${el.ha.entity}`);
  if (el.ha.icon) lines.push(`${indent}  icon: ${el.ha.icon}`);
  if (el.ha.image) lines.push(`${indent}  image: ${el.ha.image}`);
  if (el.ha.title) lines.push(`${indent}  title: "${el.ha.title}"`);
  if (el.ha.attribute) lines.push(`${indent}  attribute: ${el.ha.attribute}`);
  if (el.ha.prefix) lines.push(`${indent}  prefix: "${el.ha.prefix}"`);
  if (el.ha.suffix) lines.push(`${indent}  suffix: "${el.ha.suffix}"`);

  if (el.ha.tap_action) {
    lines.push(`${indent}  tap_action:`);
    lines.push(`${indent}    action: ${el.ha.tap_action.action}`);
    if (el.ha.tap_action.navigation_path) {
      lines.push(`${indent}    navigation_path: ${el.ha.tap_action.navigation_path}`);
    }
    if (el.ha.tap_action.service) {
      lines.push(`${indent}    service: ${el.ha.tap_action.service}`);
    }
    if (el.ha.tap_action.service_data) {
      lines.push(`${indent}    service_data:`);
      for (const [key, val] of Object.entries(el.ha.tap_action.service_data)) {
        lines.push(`${indent}      ${key}: ${JSON.stringify(val)}`);
      }
    }
  }

  lines.push(`${indent}  style:`);
  lines.push(`${indent}    top: "${el.position.topPct.toFixed(1)}%"`);
  lines.push(`${indent}    left: "${el.position.leftPct.toFixed(1)}%"`);
  if (el.size.widthPct && el.type === 'image') lines.push(`${indent}    width: "${el.size.widthPct.toFixed(1)}%"`);
  if (el.rotationDeg) lines.push(`${indent}    transform: "rotate(${el.rotationDeg}deg)"`);

  return lines.join('\n');
}

function getPrimaryLinked(room: Room, elements: FloorplanElement[]): FloorplanElement | undefined {
  const ids = room.linkedElementIds || [];
  for (const id of ids) {
    const el = elements.find(e => e.id === id);
    if (el) return el;
  }
  return undefined;
}

function getLinkedEntity(room: Room, elements: FloorplanElement[]): string {
  const linked = getPrimaryLinked(room, elements);
  if (linked?.ha.entity) return linked.ha.entity;
  return room.entity || 'light.change_me';
}

function getLinkedTapAction(room: Room, elements: FloorplanElement[]): string {
  const linked = getPrimaryLinked(room, elements);
  if (linked?.ha.tap_action) {
    const lines: string[] = [];
    lines.push(`    action: ${linked.ha.tap_action.action}`);
    if (linked.ha.tap_action.navigation_path) {
      lines.push(`    navigation_path: ${linked.ha.tap_action.navigation_path}`);
    }
    if (linked.ha.tap_action.service) {
      lines.push(`    service: ${linked.ha.tap_action.service}`);
    }
    return lines.join('\n');
  }
  return '    action: toggle';
}

function generateRoomOverlayYAML(room: Room, elements: FloorplanElement[], indent: string, isSvgBg: boolean): string {
  const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
  const entity = getLinkedEntity(room, elements);
  const lines: string[] = [];

  // Room metadata comment for re-import
  const polygonJson = JSON.stringify(room.polygon.map(p => [+p.leftPct.toFixed(2), +p.topPct.toFixed(2)]));
  lines.push(`${indent}# @room id=${room.id} name="${room.name}" polygon=${polygonJson} color=${room.overlayColor} linked=${(room.linkedElementIds || []).join(',')}`);

  lines.push(`${indent}- type: image`);
  lines.push(`${indent}  entity: ${entity}`);
  lines.push(`${indent}  image: /local/floorplan/overlays/${slug}_glow.png`);
  lines.push(`${indent}  state_filter:`);
  lines.push(`${indent}    "on": opacity(0.75)`);
  lines.push(`${indent}    "off": opacity(0)`);
  lines.push(`${indent}    "unavailable": opacity(0.15)`);
  if (isSvgBg) {
    // Only when background is SVG, the room inherits the linked icon's tap action.
    // For raster backgrounds the overlay is purely state-driven (appears when entity is on).
    lines.push(`${indent}  tap_action:`);
    const tapLines = getLinkedTapAction(room, elements);
    for (const tl of tapLines.split('\n')) {
      lines.push(`${indent}  ${tl}`);
    }
  }
  lines.push(`${indent}  style:`);
  lines.push(`${indent}    top: "50%"`);
  lines.push(`${indent}    left: "50%"`);
  lines.push(`${indent}    width: "100%"`);
  lines.push(`${indent}    pointer-events: ${isSvgBg ? 'auto' : 'none'}`);

  return lines.join('\n');
}

export function generateYAML(project: FloorplanProject): string {
  if (!project.backgroundImage) return '# No background image set';

  const lines: string[] = [
    'type: picture-elements',
    `image: /local/floorplan/${project.backgroundImage.filename}`,
    'elements:',
  ];

  // Room overlays first (render below icons)
  const rooms = project.rooms || [];
  const isSvgBg = !!project.backgroundImage?.filename.toLowerCase().endsWith('.svg');
  for (const room of rooms) {
    lines.push(generateRoomOverlayYAML(room, project.elements, '  ', isSvgBg));
  }

  // Then elements
  for (const el of project.elements) {
    lines.push(generateElementYAML(el, '  '));
  }

  return lines.join('\n');
}

/**
 * Generate a transparent PNG overlay for a room polygon.
 * Draws on an offscreen canvas matching the background image dimensions.
 * Uses a soft glow effect with blur for natural lighting appearance.
 */
function generateRoomOverlayPNG(
  room: Room,
  bgWidth: number,
  bgHeight: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = bgWidth;
  canvas.height = bgHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, bgWidth, bgHeight);

  // Draw the polygon path
  ctx.beginPath();
  room.polygon.forEach((pt, i) => {
    const x = (pt.leftPct / 100) * bgWidth;
    const y = (pt.topPct / 100) * bgHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  // Fill with glow color — use a radial gradient for warmth
  const color = room.overlayColor || '#FFA500';
  
  // Calculate bounding box for gradient
  const xs = room.polygon.map(p => (p.leftPct / 100) * bgWidth);
  const ys = room.polygon.map(p => (p.topPct / 100) * bgHeight);
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  const maxDist = Math.max(
    ...room.polygon.map(p => {
      const dx = (p.leftPct / 100) * bgWidth - cx;
      const dy = (p.topPct / 100) * bgHeight - cy;
      return Math.sqrt(dx * dx + dy * dy);
    })
  );

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist * 1.2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.7, color);
  gradient.addColorStop(1, color + '44'); // fade at edges

  ctx.fillStyle = gradient;
  ctx.fill();

  // Apply a second pass with slight blur for soft edges
  // Draw a slightly larger, semi-transparent version underneath
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = bgWidth;
  tempCanvas.height = bgHeight;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.filter = 'blur(8px)';
  tempCtx.drawImage(canvas, 0, 0);
  
  // Composite: blurred version behind sharp version
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = bgWidth;
  finalCanvas.height = bgHeight;
  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.globalAlpha = 0.6;
  finalCtx.drawImage(tempCanvas, 0, 0);
  finalCtx.globalAlpha = 1.0;
  finalCtx.drawImage(canvas, 0, 0);

  return finalCanvas.toDataURL('image/png');
}

/**
 * Parse room metadata from YAML comment lines.
 * Format: # @room id=xxx name="Room" polygon=[[x,y],...] color=#hex linked=elementId
 */
export function parseRoomComments(yamlText: string): Room[] {
  const rooms: Room[] = [];
  const regex = /^[\s]*#\s*@room\s+id=(\S+)\s+name="([^"]*?)"\s+polygon=(\[.+?\])\s+color=(\S+)\s+linked=(.*)$/gm;
  let match;
  while ((match = regex.exec(yamlText)) !== null) {
    try {
      const polygonArr = JSON.parse(match[3]) as number[][];
      rooms.push({
        id: match[1],
        name: match[2],
        polygon: polygonArr.map(([left, top]) => ({ leftPct: left, topPct: top })),
        linkedElementIds: match[5].trim()
          ? match[5].trim().split(',').map(s => s.trim()).filter(Boolean)
          : [],
        entity: '', // will be resolved from linked element
        overlayColor: match[4],
        zIndex: 0,
      });
    } catch { /* skip malformed */ }
  }
  return rooms;
}

function generateReadme(project: FloorplanProject): string {
  const rooms = project.rooms || [];
  const roomSection = rooms.length > 0
    ? `\n## Room Overlays\n\n${rooms.map(r => {
        const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
        const ids = r.linkedElementIds || [];
        const linkedEls = ids.map(id => project.elements.find(el => el.id === id)).filter(Boolean) as FloorplanElement[];
        const primary = linkedEls[0];
        const entity = primary?.ha.entity || r.entity || 'light.change_me';
        const linkedDesc = linkedEls.length
          ? ` (linked to ${linkedEls.length} icon${linkedEls.length > 1 ? 's' : ''}: ${linkedEls.map(el => el.ha.icon || el.label || el.id.slice(0, 8)).join(', ')})`
          : '';
        return `- **${r.name}**: \`/local/floorplan/overlays/${slug}_glow.png\` → entity: \`${entity}\`${linkedDesc}`;
      }).join('\n')}\n`
    : '';

  return `# ${project.name} — Home Assistant Floorplan

## Quick Setup

### 1. Copy files to Home Assistant

Copy the contents of the \`www/\` folder to your Home Assistant config directory:

\`\`\`
<HA config>/www/floorplan/${project.backgroundImage?.filename || 'background.png'}
<HA config>/www/floorplan/icons/   (if any custom icons)
<HA config>/www/floorplan/overlays/ (room glow overlays)
\`\`\`

Files placed under \`<HA config>/www/\` are accessible at \`/local/\` in Lovelace.

### 2. Add the Lovelace Card

1. Go to your Home Assistant Dashboard
2. Click **Edit Dashboard** (pencil icon)
3. Click **+ Add Card**
4. Scroll down and select **Manual**
5. Paste the contents of \`lovelace/floorplan-picture-elements.yaml\`
6. Click **Save**

### 3. Verify

- Make sure all entity IDs match your actual entities
- Check that images load (no broken icons)
- Coordinates are in percentages — you can fine-tune \`top\` and \`left\` values directly in YAML
${roomSection}
## Troubleshooting

| Problem | Solution |
|---------|----------|
| Missing background image | Verify file is at \`www/floorplan/${project.backgroundImage?.filename}\` and restart HA |
| Icons not showing | Check \`www/floorplan/icons/\` folder exists with SVG files |
| Room overlay not visible | Check \`www/floorplan/overlays/\` has the glow PNGs |
| Wrong entity | Update \`entity:\` in the YAML to match your setup |
| Card not updating | Clear browser cache or hard-refresh (Ctrl+Shift+R) |
| Image path 404 | Paths must start with \`/local/\` (maps to \`www/\`) |

## Project Info

- Created: ${project.createdAt}
- Elements: ${project.elements.length}
- Rooms: ${rooms.length}
- Background: ${project.backgroundImage?.filename || 'none'} (${project.backgroundImage?.originalWidth}x${project.backgroundImage?.originalHeight})

## Re-editing

Import \`project/floorplan-project.json\` back into the Floorplan Builder to continue editing.
`;
}

export async function exportProject(project: FloorplanProject): Promise<void> {
  const zip = new JSZip();

  // Background image
  if (project.backgroundImage) {
    const bgData = project.backgroundImage.dataUrl.split(',')[1];
    zip.file(`www/floorplan/${project.backgroundImage.filename}`, bgData, { base64: true });
  }

  // Room overlay PNGs
  const rooms = project.rooms || [];
  if (rooms.length > 0 && project.backgroundImage) {
    for (const room of rooms) {
      if (room.polygon.length < 3) continue;
      const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
      const pngDataUrl = generateRoomOverlayPNG(
        room,
        project.backgroundImage.originalWidth,
        project.backgroundImage.originalHeight,
      );
      const pngBase64 = pngDataUrl.split(',')[1];
      zip.file(`www/floorplan/overlays/${slug}_glow.png`, pngBase64, { base64: true });
    }
  }

  // Download non-HA-native icon assets
  const HA_NATIVE_SETS = new Set(['mdi', 'mdi-light']);
  const iconSets = new Set<string>();
  for (const el of project.elements) {
    if (el.iconSetId && el.iconName) {
      iconSets.add(el.iconSetId);
      if (!HA_NATIVE_SETS.has(el.iconSetId)) {
        const filename = `${el.iconSetId}-${el.iconName}.svg`;
        try {
          const resp = await fetch(`https://api.iconify.design/${el.iconSetId}/${el.iconName}.svg`);
          const svg = await resp.text();
          zip.file(`www/floorplan/icons/${filename}`, svg);
        } catch { /* skip */ }
      }
    }
  }

  // YAML
  zip.file('lovelace/floorplan-picture-elements.yaml', generateYAML(project));

  // Project JSON
  zip.file('project/floorplan-project.json', JSON.stringify(project, null, 2));

  // README
  zip.file('README.md', generateReadme(project));

  // LICENSES
  if (iconSets.size > 0) {
    const licenseLines = ['Icon Licenses', '=============', ''];
    for (const setId of iconSets) {
      licenseLines.push(ICON_SET_LICENSES[setId] || `${setId} - Unknown license`);
    }
    const hasMdi = project.elements.some(el => el.ha.icon?.startsWith('mdi:'));
    if (hasMdi && !iconSets.has('mdi')) {
      licenseLines.push(ICON_SET_LICENSES['mdi']);
    }
    zip.file('LICENSES.txt', licenseLines.join('\n'));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${project.name.replace(/\s+/g, '-').toLowerCase()}-floorplan.zip`);
}

/**
 * Import a previously exported ZIP. Reconstructs the FloorplanProject by reading
 * `project/floorplan-project.json`. Falls back to YAML + background image if the
 * project JSON is missing.
 */
export async function importProjectZip(file: File | Blob): Promise<FloorplanProject> {
  const zip = await JSZip.loadAsync(file);

  // Preferred path: full project JSON is included by the exporter
  const projectFile = zip.file('project/floorplan-project.json');
  if (projectFile) {
    const text = await projectFile.async('string');
    const proj = JSON.parse(text) as FloorplanProject;
    proj.rooms = (proj.rooms || []).map(r => ({
      ...r,
      linkedElementIds:
        r.linkedElementIds ||
        ((r as unknown as { linkedElementId?: string | null }).linkedElementId
          ? [(r as unknown as { linkedElementId: string }).linkedElementId]
          : []),
    }));
    return proj;
  }

  // Fallback: rebuild from YAML + background image
  const yamlFile = zip.file(/lovelace\/.*\.ya?ml$/i)[0];
  if (!yamlFile) {
    throw new Error("Lo ZIP non contiene né 'project/floorplan-project.json' né un file YAML in 'lovelace/'.");
  }
  const yamlText = await yamlFile.async('string');

  // Find background image referenced in YAML (image: /local/floorplan/<filename>)
  const bgMatch = yamlText.match(/^image:\s*\/local\/floorplan\/(.+)$/m);
  let backgroundImage: FloorplanProject['backgroundImage'] = null;
  if (bgMatch) {
    const filename = bgMatch[1].trim();
    const bgFile = zip.file(`www/floorplan/${filename}`);
    if (bgFile) {
      const blob = await bgFile.async('blob');
      const dataUrl = await blobToDataUrl(blob);
      const { width, height } = await getImageDimensions(dataUrl);
      backgroundImage = {
        filename,
        originalWidth: width,
        originalHeight: height,
        dataUrl,
      };
    }
  }

  const rooms = parseRoomComments(yamlText);

  return {
    name: 'Imported Floorplan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    backgroundImage,
    elements: [], // YAML→elements parsing requires the dedicated parser; users can re-import YAML separately
    rooms,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Impossibile leggere le dimensioni dello sfondo'));
    img.src = dataUrl;
  });
}
