export function normalizeDownloadFilename(
  title: string,
  extension: string,
  fallback = 'json-output',
): string {
  const ext = extension.replace(/^\.+/, '').trim().toLowerCase();
  const sanitized = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '');
  const base = sanitized || fallback;
  if (!ext || base.toLowerCase().endsWith(`.${ext}`)) return base;
  return `${base}.${ext}`;
}

export interface TextDownloadDependencies {
  createObjectUrl(blob: Blob): string;
  clickDownload(url: string, filename: string): void;
  revokeObjectUrl(url: string): void;
}

const browserTextDownloadDependencies: TextDownloadDependencies = {
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  clickDownload: (url, filename) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
  },
  revokeObjectUrl: (url) => {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
};

export function downloadText(
  text: string,
  title: string,
  extension: string,
  mimeType = 'text/plain;charset=utf-8',
  dependencies: TextDownloadDependencies = browserTextDownloadDependencies,
): string {
  const filename = normalizeDownloadFilename(title, extension);
  const url = dependencies.createObjectUrl(new Blob([text], { type: mimeType }));
  try {
    dependencies.clickDownload(url, filename);
  } finally {
    dependencies.revokeObjectUrl(url);
  }
  return filename;
}
