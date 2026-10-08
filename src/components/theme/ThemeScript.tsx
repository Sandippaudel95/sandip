/* Runs before first paint, inline in <head>.
 *
 * Without this the page renders in light, then swaps to dark once React
 * hydrates — a white flash on every load for anyone using dark mode. The
 * script is deliberately tiny and dependency-free so it costs nothing.
 *
 * "system" is the default and is stored as the absence of a preference,
 * so a visitor who never touches the control follows their OS for life. */
const script = `(function(){try{
var s=localStorage.getItem('theme');
var dark = s==='dark' || ((!s||s==='system') && matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark', dark);
document.documentElement.dataset.theme = s || 'system';
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
