export interface PlainTextPasteEvent {
  clipboardData: { getData(type: string): string } | null;
  preventDefault(): void;
  stopImmediatePropagation(): void;
}

export function handlePlainTextPaste(
  event: PlainTextPasteEvent,
  insert: (text: string) => void,
): boolean {
  const text = event.clipboardData?.getData('text/plain') ?? '';
  if (!text) return false;

  event.preventDefault();
  event.stopImmediatePropagation();
  insert(text);
  return true;
}
