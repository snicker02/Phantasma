// Phone layout: toggles body.tabbed from a media query and turns panel sections into tabs.
// Section headings become tab labels; hidden sections hide their tab.

export function setupTabs({ strip, sections, storageKey, query }) {
  const mq = matchMedia(query);
  let current = null;
  try { current = localStorage.getItem(storageKey); } catch { /* storage unavailable */ }

  const buttons = new Map();
  for (const sec of sections) {
    const h = sec.querySelector('h2');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tabbtn';
    b.textContent = h ? h.textContent : sec.id;
    b.addEventListener('click', () => select(sec.id));
    strip.appendChild(b);
    buttons.set(sec.id, b);
  }

  function visible() { return sections.filter(s => !s.hidden); }

  function select(id) {
    const vis = visible();
    if (!vis.some(s => s.id === id)) id = vis[0]?.id;
    current = id;
    for (const s of sections) s.classList.toggle('tabon', s.id === id);
    for (const [sid, b] of buttons) {
      b.classList.toggle('on', sid === id);
      b.setAttribute('aria-selected', sid === id ? 'true' : 'false');
    }
    try { localStorage.setItem(storageKey, id); } catch { /* ignore */ }
    const b = buttons.get(id);
    if (b && document.body.classList.contains('tabbed')) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function refresh() {
    for (const s of sections) buttons.get(s.id).hidden = s.hidden;
    select(current);
  }

  function applyMode() {
    document.body.classList.toggle('tabbed', mq.matches);
    refresh();
  }

  const mo = new MutationObserver(refresh);
  for (const s of sections) mo.observe(s, { attributes: true, attributeFilter: ['hidden'] });
  mq.addEventListener ? mq.addEventListener('change', applyMode) : mq.addListener(applyMode);
  applyMode();
  return { select, refresh };
}
