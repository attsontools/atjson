import type { JsonPathSegment, JsonValue } from '../types/json';

export type DeleteJsonNodeResult =
  | { ok: true; value: JsonValue }
  | { ok: false };

type JsonContainer = JsonValue[] | Record<string, JsonValue>;

function isContainer(value: JsonValue): value is JsonContainer {
  return value !== null && typeof value === 'object';
}

function hasSegment(container: JsonContainer, segment: JsonPathSegment): boolean {
  return Array.isArray(container)
    ? typeof segment === 'number'
      && Number.isInteger(segment)
      && segment >= 0
      && segment < container.length
    : typeof segment === 'string' && Object.hasOwn(container, segment);
}

function childAt(container: JsonContainer, segment: JsonPathSegment): JsonValue {
  return Array.isArray(container)
    ? container[segment as number]
    : container[segment as string];
}

export function deleteJsonNode(
  root: JsonValue,
  path: readonly JsonPathSegment[],
): DeleteJsonNodeResult {
  if (path.length === 0) return { ok: false };

  const trail: Array<{ container: JsonContainer; segment: JsonPathSegment }> = [];
  let current = root;
  for (const segment of path) {
    if (!isContainer(current) || !hasSegment(current, segment)) return { ok: false };
    trail.push({ container: current, segment });
    current = childAt(current, segment);
  }

  let replacement: JsonValue | undefined;
  for (let index = trail.length - 1; index >= 0; index--) {
    const { container, segment } = trail[index];
    if (Array.isArray(container)) {
      const next = [...container];
      if (index === trail.length - 1) next.splice(segment as number, 1);
      else next[segment as number] = replacement!;
      replacement = next;
    } else {
      const next = { ...container };
      if (index === trail.length - 1) delete next[segment as string];
      else next[segment as string] = replacement!;
      replacement = next;
    }
  }

  return { ok: true, value: replacement! };
}
