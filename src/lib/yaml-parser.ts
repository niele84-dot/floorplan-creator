import { FloorplanElement, ElementType, TapAction } from '@/types/project';

/**
 * Parse YAML elements array back into FloorplanElement[].
 * Tries to match existing elements by entity+type to preserve IDs and metadata.
 */
export function parseYAMLToElements(
  yamlElements: any[],
  existingElements: FloorplanElement[]
): FloorplanElement[] {
  if (!Array.isArray(yamlElements)) return [];

  return yamlElements.map((yamlEl, index) => {
    const type = (yamlEl.type || 'state-icon') as ElementType;
    const entity = yamlEl.entity || '';
    const style = yamlEl.style || {};

    // Try to find matching existing element
    const existing = existingElements.find(
      ex => ex.ha.entity === entity && ex.type === type
    );

    const topPct = parsePercent(style.top);
    const leftPct = parsePercent(style.left);
    const widthPct = parsePercent(style.width);
    const rotationDeg = parseRotation(style.transform);

    // Parse tap_action
    let tap_action: TapAction | undefined;
    if (yamlEl.tap_action) {
      tap_action = {
        action: yamlEl.tap_action.action || 'toggle',
        navigation_path: yamlEl.tap_action.navigation_path,
        service: yamlEl.tap_action.service,
        service_data: yamlEl.tap_action.service_data,
      };
    }

    // Handle conditional type
    if (type === 'conditional') {
      const conditions = (yamlEl.conditions || []).map((c: any) => ({
        entity: c.entity || '',
        state: String(c.state ?? ''),
        state_not: c.state_not,
      }));

      // Get nested element info
      const nested = yamlEl.elements?.[0] || {};
      const nestedStyle = nested.style || {};

      return {
        id: existing?.id || crypto.randomUUID(),
        type: 'conditional' as ElementType,
        position: {
          leftPct: parsePercent(nestedStyle.left) || leftPct,
          topPct: parsePercent(nestedStyle.top) || topPct,
        },
        size: {
          widthPct: parsePercent(nestedStyle.width) || existing?.size.widthPct || 5,
          heightPct: existing?.size.heightPct,
          scale: existing?.size.scale || 1,
          lockAspectRatio: existing?.size.lockAspectRatio,
        },
        rotationDeg: parseRotation(nestedStyle.transform) || 0,
        zIndex: existing?.zIndex || index,
        ha: {
          entity: nested.entity || entity,
          icon: nested.icon,
          image: nested.image,
          conditions,
          tap_action,
        },
        assetRef: existing?.assetRef,
        iconSetId: existing?.iconSetId,
        iconName: existing?.iconName,
      } as FloorplanElement;
    }

    // Determine icon info from ha.icon field (e.g. "mdi:lightbulb")
    let iconSetId = existing?.iconSetId;
    let iconName = existing?.iconName;
    if (yamlEl.icon && yamlEl.icon.includes(':')) {
      const [set, ...rest] = yamlEl.icon.split(':');
      iconSetId = set;
      iconName = rest.join(':');
    }

    return {
      id: existing?.id || crypto.randomUUID(),
      type,
      position: { leftPct, topPct },
      size: {
        widthPct: widthPct || existing?.size.widthPct || 5,
        heightPct: existing?.size.heightPct,
        scale: existing?.size.scale || 1,
        lockAspectRatio: existing?.size.lockAspectRatio,
      },
      rotationDeg,
      zIndex: existing?.zIndex || index,
      ha: {
        entity: entity || undefined,
        icon: yamlEl.icon,
        image: yamlEl.image,
        title: yamlEl.title,
        attribute: yamlEl.attribute,
        prefix: yamlEl.prefix,
        suffix: yamlEl.suffix,
        tap_action,
      },
      assetRef: existing?.assetRef,
      iconSetId,
      iconName,
      label: existing?.label,
    } as FloorplanElement;
  });
}

function parsePercent(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const str = String(value).replace('%', '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function parseRotation(transform: string | undefined): number {
  if (!transform) return 0;
  const match = String(transform).match(/rotate\((\d+(?:\.\d+)?)deg\)/);
  return match ? parseFloat(match[1]) : 0;
}
