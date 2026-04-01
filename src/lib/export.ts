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

function generateRoomOverlayYAML(room: Room, indent: string): string {
  const slug = room.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
  const lines: string[] = [];

  lines.push(`${indent}# --- Room: ${room.name} ---`);
  lines.push(`${indent}- type: image`);
  lines.push(`${indent}  entity: ${room.entity || 'light.change_me'}`);
  lines.push(`${indent}  image: /local/floorplan/overlays/${slug}_glow.png`);
  lines.push(`${indent}  state_filter:`);
  lines.push(`${indent}    "on": opacity(0.75)`);
  lines.push(`${indent}    "off": opacity(0)`);
  lines.push(`${indent}    "unavailable": opacity(0.15)`);
  lines.push(`${indent}  tap_action:`);
  lines.push(`${indent}    action: toggle`);
  lines.push(`${indent}  style:`);
  lines.push(`${indent}    top: "50%"`);
  lines.push(`${indent}    left: "50%"`);
  lines.push(`${indent}    width: "100%"`);
  lines.push(`${indent}    mix-blend-mode: screen`);
  lines.push(`${indent}    pointer-events: auto`);

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
  for (const room of rooms) {
    lines.push(generateRoomOverlayYAML(room, '  '));
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

  // Draw the polygon filled with the room's glow color
  ctx.beginPath();
  room.polygon.forEach((pt, i) => {
    const x = (pt.leftPct / 100) * bgWidth;
    const y = (pt.topPct / 100) * bgHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  // Parse hex color and create a warm glow fill
  const color = room.overlayColor || '#FFA500';
  ctx.fillStyle = color;
  ctx.fill();

  return canvas.toDataURL('image/png');
}

function generateReadme(project: FloorplanProject): string {
  const rooms = project.rooms || [];
  const roomSection = rooms.length > 0
    ? `\n## Room Overlays\n\n${rooms.map(r => {
        const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
        return `- **${r.name}**: \`/local/floorplan/overlays/${slug}_glow.png\` → entity: \`${r.entity || 'light.change_me'}\``;
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
