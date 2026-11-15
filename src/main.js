import './styles/base.css';
import { pickMode, detectEnv, wantsResume } from './modes.js';
import { createSkipLink, hideWhileScreenFocused } from './skipRoom.js';
import { createDesktop } from './xp/createDesktop.js';
import resume from './data/resume.json';
import portfolio from './data/portfolio.json';
import { initAnalytics, track } from './analytics.js';

const REPO_URL = 'https://github.com/stephenyctsedev/XPcomputer';
const pdfHref = `${import.meta.env.BASE_URL}resume/resume-main.pdf`;
const mediaBase = import.meta.env.BASE_URL;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const app = document.querySelector('#app');
const mode = pickMode(detectEnv());
const openResume = wantsResume(location.search);

initAnalytics();
const screenEl = document.createElement('div');
const desktop = createDesktop(screenEl, { resume, portfolio, pdfHref, mediaBase, repoUrl: REPO_URL, reducedMotion, track });

(async () => {
  if (mode === 'room') {
    try {
      // Created before the room's dynamic import so it is usable while the room is still loading.
      // It lives in #app, outside the room's own DOM; the fallback's replaceChildren() below removes it.
      const skipLink = createSkipLink(app, { track });
      const { mountRoom } = await import('./room/mount.js');
      const room = await mountRoom(app, screenEl, desktop, { reducedMotion });
      hideWhileScreenFocused(skipLink, room);
      track('site_mode', { mode: 'room' });
      return;
    } catch (err) {
      console.error('[XPcomputer] 3D room failed to start; falling back to the flat desktop.', err);
      app.replaceChildren();
    }
  }
  mountFlat(app, screenEl, desktop, mode === 'flat' && !openResume);
  track('site_mode', { mode: 'flat' });
})();

/** Center and scale the 1024x768 screen to the viewport; interactive immediately; boots on load. */
function mountFlat(root, screen, desk, showNotice) {
  const stage = document.createElement('div');
  stage.className = showNotice ? 'flat-stage has-notice' : 'flat-stage';
  stage.append(screen);
  root.append(stage);
  if (showNotice) {
    const note = document.createElement('div');
    note.className = 'flat-notice';
    note.textContent = 'The 3D room needs a desktop browser with WebGL2. The computer itself works everywhere.';
    stage.append(note);
  }
  const fit = () => {
    const scale = Math.min(innerWidth / 1024, (innerHeight - (showNotice ? 28 : 0)) / 768);
    screen.style.transform = `scale(${scale})`;
  };
  fit();
  addEventListener('resize', fit);
  desk.setInteractive(true);
  // ?open=resume: skip the boot sequence and show the homepage in Internet Explorer straight away.
  desk.powerOn({ fast: openResume }).then(() => { if (openResume) desk.ctx.registry.launch('iexplore'); });
}
