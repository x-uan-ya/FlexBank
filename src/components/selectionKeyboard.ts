import type { KeyboardEvent } from 'react';

/** Web-only keyboard support for existing selectable cards and theme previews. */
export function selectionKeyboard(event: KeyboardEvent<HTMLElement>, onSelect: () => void) {
  if (event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    if (!event.repeat) onSelect();
    return;
  }
  if (event.currentTarget.getAttribute('role') !== 'radio') return;
  const group = event.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const options = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
  const index = options.indexOf(event.currentTarget);
  const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % options.length
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + options.length - 1) % options.length
    : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : undefined;
  if (next === undefined || index < 0 || !options[next]) return;
  event.preventDefault();
  options[next].focus();
  options[next].click();
}
