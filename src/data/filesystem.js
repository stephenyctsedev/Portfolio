const SEP = '\\';

export const PATHS = {
  myComputer: 'My Computer',
  recycleBin: 'Recycle Bin',
  myDocuments: 'C:\\Documents and Settings\\Stephen\\My Documents',
  desktop: 'C:\\Documents and Settings\\Stephen\\Desktop',
};

const folder = (name, children = [], extra = {}) => ({ name, kind: 'folder', icon: 'folder', children, ...extra });
const file = (name, icon, open) => ({ name, kind: 'file', icon, open });
const exe = (name, app, icon = 'exe') => ({ name, kind: 'exe', icon, open: { app } });
const shortcut = (name, icon, open) => ({ name, kind: 'shortcut', icon, open });
const notepadFile = (name, text) => file(name, 'txt', { app: 'notepad', payload: { title: name, text } });
const mediaFile = (item, slug, index) => ({
  name: item.file,
  kind: 'file',
  icon: item.kind === 'video' ? 'video' : 'image',
  mediaKind: item.kind,
  src: item.src,
  thumb: item.thumb ?? null,
  width: item.width ?? null,
  height: item.height ?? null,
  open: { app: 'viewer', payload: { slug, index, slideshow: false } },
});

// A project that is still playable online gets an Internet Shortcut sitting next to its
// screenshots, the way XP kept .url files in a folder. It goes last so the media indices
// the viewer opens by stay in step with the portfolio record. Games say "Play"; a project
// that is not a game names its own verb in `linkVerb` ("Try", "Open", ...).
const liveLink = (project) => shortcut(`${project.linkVerb ?? 'Play'} ${project.folder}.url`, 'url', { app: 'external', payload: { url: project.url } });
// A project whose code is public also gets a shortcut to its repository, after the live link.
const sourceLink = (project) => shortcut('View source on GitHub.url', 'url', { app: 'external', payload: { url: project.sourceUrl } });

/**
 * The job a project was built at, if any. A project names it in `job` with the start of the
 * job's company line in resume.json ("Acme" matches "Acme, Winnipeg, Canada"), so the record
 * keeps working when the Resume sync rewrites the rest of that line.
 */
export const jobOfProject = (project, resume) => (project.job
  ? resume.experience.find((job) => job.company.startsWith(project.job)) ?? null
  : null);

/** The portfolio projects built at a job, in portfolio order. */
export const projectsOfJob = (job, portfolio) => (portfolio?.projects ?? []).filter((p) => p.job && job.company.startsWith(p.job));

const PICTURES_PATH = `${PATHS.myDocuments}${SEP}My Pictures`;

const projectFolder = (project, resume) => folder(
  project.folder,
  [
    ...project.media.map((item, index) => mediaFile(item, project.slug, index)),
    ...(project.url ? [liveLink(project)] : []),
    ...(project.sourceUrl ? [sourceLink(project)] : []),
  ],
  { icon: 'pictures', project, job: jobOfProject(project, resume) },
);
const driveError = (title, text) => ({ app: 'error', payload: { title, text, buttons: ['Retry', 'Cancel'] } });
const binError = { app: 'error', payload: { title: 'Recycle Bin', text: 'This file is in the Recycle Bin. Restore it before opening it.' } };

/** Windows forbids a trailing dot or space in a name, and ".txt" is appended later ("… Ltd." + ".txt" = "Ltd..txt"). */
const safeName = (company) => company.split(',')[0].replace(/[\\/:*?"<>|]/g, '').replace(/[. ]+$/, '').trim();

/** One file name per job: the company, plus the job title only where two jobs share a company (e.g. several personal projects). */
const projectFileNames = (jobs) => {
  const byCompany = jobs.map((job) => safeName(job.company));
  return jobs.map((job, i) => (byCompany.filter((name) => name === byCompany[i]).length > 1 ? `${byCompany[i]} - ${safeName(job.title)}` : byCompany[i]));
};

const projectText = (project) => [
  `* ${project.name}`,
  `  ${PICTURES_PATH}${SEP}${project.folder}`,
  ...(project.url ? [`  Demo:   ${project.url}`] : []),
  ...(project.sourceUrl ? [`  Source: ${project.sourceUrl}`] : []),
];

const jobText = (job, projects = []) => [
  job.title, job.company, job.period, '', ...job.bullets.map((b) => `- ${b}`),
  ...(projects.length ? ['', 'Projects built in this job:', ...projects.flatMap(projectText)] : []),
].join('\n');

const readmeText = (resume) => `${resume.displayName} — ${resume.title}
==============================

Thanks for looking around my computer.

This is an interactive resume: a three.js cyberpunk bedroom with an old PC
running a fake Windows XP. Everything you see is built from scratch in plain
JavaScript. No Microsoft artwork or sounds are used.

Where to look:
  * Internet Explorer  -> my homepage and the PDF resume
  * My Documents\\My Pictures -> screenshots from every project I have shipped
  * My Documents\\Projects -> one text file per job
  * Start > All Programs > Games -> Minesweeper, Solitaire, Pinball

Contact: ${resume.contact.email}
LinkedIn: ${resume.contact.linkedin}
`;

const todoText = `TODO
----
[x] Learn Unity
[x] Ship mobile apps
[x] Move to Canada
[x] Build a fake Windows XP in a browser
[ ] Defragment C:
[ ] Beat my own Pinball high score
[ ] Get hired (you can help with this one)
`;

export function buildFileSystem(resume, portfolio = { projects: [] }) {
  const fileNames = projectFileNames(resume.experience);
  const projects = resume.experience.map((job, i) => notepadFile(`${fileNames[i]}.txt`, jobText(job, projectsOfJob(job, portfolio))));
  const myDocuments = folder('My Documents', [
    folder('My Pictures', (portfolio.projects ?? []).map((project) => projectFolder(project, resume)), { icon: 'pictures' }),
    folder('My Music', []),
    folder('Projects', projects),
    file('resume.pdf', 'pdf', { app: 'reader' }),
    notepadFile('readme.txt', readmeText(resume)),
    notepadFile('todo.txt', todoText),
  ], { icon: 'documents' });
  const desktop = folder('Desktop', [
    shortcut('Internet Explorer', 'ie', { app: 'iexplore' }),
    shortcut('My Documents', 'documents', { app: 'explorer', payload: { path: PATHS.myDocuments } }),
  ]);
  const cDrive = { name: 'Local Disk (C:)', kind: 'drive', icon: 'drive', children: [
    folder('Documents and Settings', [folder('Stephen', [desktop, myDocuments], { icon: 'user' })]),
    folder('Program Files', [
      folder('Internet Explorer', [exe('iexplore.exe', 'iexplore', 'ie')]),
      folder('Windows NT', [folder('Pinball', [exe('pinball.exe', 'pinball', 'pinball')])]),
    ]),
    folder('WINDOWS', [folder('system32', [exe('winmine.exe', 'winmine', 'mine'), exe('sol.exe', 'sol', 'cards'), exe('notepad.exe', 'notepad', 'notepad')])]),
  ] };
  const root = { name: PATHS.myComputer, kind: 'root', icon: 'computer', children: [
    { name: '3½ Floppy (A:)', kind: 'drive', icon: 'floppy', children: [], open: driveError('3½ Floppy (A:)', 'Please insert a disk into drive A:.') },
    cDrive,
    { name: 'CD Drive (D:)', kind: 'drive', icon: 'cd', children: [], open: driveError('CD Drive (D:)', 'Please insert a disc into drive D:.') },
    shortcut('Shared Documents', 'documents', { app: 'explorer', payload: { path: PATHS.myDocuments } }),
  ] };
  const recycle = { name: PATHS.recycleBin, kind: 'root', icon: 'recycle', children: [
    file('old_resume_2018.doc', 'txt', binError),
    file('cover_letter_FINAL_v3_really_final.doc', 'txt', binError),
  ] };
  assignPaths(root, '');
  assignPaths(recycle, '');
  return { root, recycle };
}

function assignPaths(node, parent) {
  if (node.kind === 'root') node.path = node.name;
  else if (node.kind === 'drive') node.path = `${node.name.match(/\(([A-Z]):\)/)[1]}:`;
  else node.path = `${parent}${SEP}${node.name}`;
  for (const child of node.children ?? []) assignPaths(child, node.path);
}

export function resolvePath(fs, path) {
  if (!path || path === PATHS.myComputer) return fs.root;
  if (path === PATHS.recycleBin) return fs.recycle;
  if (path.startsWith(`${PATHS.recycleBin}${SEP}`)) {
    const name = path.slice(PATHS.recycleBin.length + 1);
    return fs.recycle.children.find((c) => c.name === name) ?? null;
  }
  const [drive, ...parts] = path.split(SEP);
  let node = fs.root.children.find((c) => c.kind === 'drive' && c.path === drive) ?? null;
  for (const part of parts) {
    if (!node) return null;
    node = node.children?.find((c) => c.name === part) ?? null;
  }
  return node;
}

export function parentPath(path) {
  if (path === PATHS.myComputer || path === PATHS.recycleBin) return null;
  const i = path.lastIndexOf(SEP);
  if (i < 0) return PATHS.myComputer;
  return path.slice(0, i);
}
