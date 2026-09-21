import { showToast } from './toast';

/** Handles failures centrally; returns true only when copying succeeds.
 * Call directly from a user action so browsers retain clipboard permission.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await writeClipboardText(text);
    showToast('Copied to clipboard.', { type: 'success' });
    return true;
  } catch {
    showToast('Unable to copy to clipboard. Select the text and copy it manually.', {
      type: 'error',
    });
    return false;
  }
}

async function writeClipboardText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Firefox, insecure origins, or browser policy may block the modern API.
  }

  // Support browsers and HTTP origins where the Clipboard API is unavailable.
  const activeElement = document.activeElement as HTMLElement | null;
  const selection = window.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange()
      )
    : [];
  const inputSelection =
    activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
      ? {
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd,
          direction: activeElement.selectionDirection,
        }
      : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  // Keep selectable on iOS without opening the keyboard or scrolling the page.
  textarea.style.cssText =
    'position:fixed;top:0;left:0;opacity:0;font-size:16px;pointer-events:none;';
  document.body.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    if (!document.execCommand('copy')) {
      throw new Error('Clipboard access was blocked. Select the text and copy it manually.');
    }
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach(range => selection.addRange(range));
    }
    if (inputSelection?.start != null && inputSelection.end != null) {
      (activeElement as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
        inputSelection.start,
        inputSelection.end,
        inputSelection.direction ?? undefined
      );
    }
  }
}
