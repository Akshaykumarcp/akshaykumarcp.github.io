/* ============================================================
   AKSHAY KUMAR C P — Portfolio App Engine
   JSON-driven rendering, filtering, animations
   ============================================================ */

/* ── Data Store ── */
const DATA = { projects: null, researchLog: null, certifications: null, timeline: null };

/* ── Entry-point ── */
document.addEventListener('DOMContentLoaded', async () => {
  initNav();
  applyDynamicExperience();
  initHeroTyping();
  initScrollAnimations();
  await loadAllData();
  renderAll();
  initFilters();
  initCountUp();
  initScrollSpy();
});

/* ================================================================
   DYNAMIC YEARS OF EXPERIENCE
   Career start: Jun 2019 — Software Development Engineer, ML (Flexera)
   ================================================================ */
const CAREER_START_DATE = new Date(2019, 5, 1); // month is 0-indexed: 5 = June

function getYearsExperience() {
  const now = new Date();
  let years = now.getFullYear() - CAREER_START_DATE.getFullYear();
  const anniversary = new Date(now.getFullYear(), CAREER_START_DATE.getMonth(), CAREER_START_DATE.getDate());
  if (now < anniversary) years--;
  return years;
}

function applyDynamicExperience() {
  const years = getYearsExperience();

  const heroEl = document.getElementById('hero-experience-text');
  if (heroEl) heroEl.textContent = `${years}+ years shipping AI to production`;

  const metricEl = document.getElementById('metric-years-experience');
  if (metricEl) metricEl.dataset.countup = String(years);
}

/* ── Data Loading ── */
async function loadAllData() {
  try {
    const [p, r, c, t] = await Promise.all([
      fetch('data/projects.json').then(r => r.json()),
      fetch('data/research-log.json').then(r => r.json()),
      fetch('data/certifications.json').then(r => r.json()),
      fetch('data/timeline.json').then(r => r.json()),
    ]);
    DATA.projects       = p;
    DATA.researchLog    = r;
    DATA.certifications = c;
    DATA.timeline       = t;
  } catch (e) {
    console.error('Data load failed:', e);
  }
}

/* ── Master Render ── */
function renderAll() {
  renderProjects();
  renderMoreProjects();
  renderResearchLog();
  renderResearchStats();
  renderCertifications();
  renderSkills();
  renderAwards();
  renderTimeline();
}

/* ================================================================
   PROJECTS
   ================================================================ */
function renderProjects(filter = 'All') {
  const container = document.getElementById('projects-grid');
  if (!container || !DATA.projects) return;

  const projects = filter === 'All'
    ? DATA.projects.featured
    : DATA.projects.featured.filter(p => p.category.includes(filter));

  container.innerHTML = projects.map(p => projectCardHTML(p)).join('');
  triggerFadeIn(container.querySelectorAll('.project-card'));
}

function projectCardHTML(p) {
  const badges = p.category.map(c =>
    `<span class="category-badge">${c}</span>`
  ).join('');

  const claudeCodeBadge = p.claudeCode
    ? `<span class="claude-code-badge">⚡ Claude Code CLI</span>`
    : '';

  const companyBadge = p.company
    ? `<span class="company-badge" data-company="${escHtml(p.company)}">${escHtml(p.company)}</span>`
    : '';

  const archItems = p.architecture.map(a =>
    `<li>${escHtml(a)}</li>`
  ).join('');

  const techTags = p.stack.map(t =>
    `<span class="tech-tag">${escHtml(t)}</span>`
  ).join('');

  const impactItems = p.impact.map(i => {
    const bold = i.replace(/([€\d][^\s]*(?:M|%|K\+|x|hours?)?)/g, '<strong>$1</strong>');
    return `<li>${bold}</li>`;
  }).join('');

  const contributionHTML = p.contributions && p.contributions.length
    ? `<div class="contrib-section">
          <div class="contrib-label">My Contribution</div>
          <ul class="contrib-list">${p.contributions.map(c => `<li>${escHtml(c)}</li>`).join('')}</ul>
        </div>`
    : '';

  const highlightClass = p.highlight ? ' highlight-card' : '';

  return `
    <article class="project-card fade-in-up${highlightClass}" data-categories='${JSON.stringify(p.category)}'>
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-category-badges">${badges}${claudeCodeBadge}</div>
          <div class="card-title">${escHtml(p.title)}</div>
          <div class="card-subtitle">${escHtml(p.subtitle)}</div>
        </div>
        <div class="card-header-right">
          <div class="card-period t-mono-sm">${escHtml(p.period)}</div>
          ${companyBadge}
        </div>
      </div>
      <div class="card-body">
        <ul class="arch-list">${archItems}</ul>
        <div class="tech-tags">${techTags}</div>
        ${contributionHTML}
        <div class="impact-section">
          <div class="impact-label">Impact</div>
          <ul class="impact-list">${impactItems}</ul>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-role">${escHtml(p.role)}</span>
      </div>
    </article>`;
}

function renderMoreProjects() {
  const container = document.getElementById('more-projects-grid');
  if (!container || !DATA.projects) return;

  container.innerHTML = DATA.projects.more.map(p => {
    const tags = p.stack.map(t => `<span class="mini-tag">${escHtml(t)}</span>`).join('');
    const impact = p.impact[0] ? `<p class="mini-impact">${escHtml(p.impact[0])}</p>` : '';
    const companyBadge = p.company
      ? `<span class="company-badge company-badge-sm" data-company="${escHtml(p.company)}">${escHtml(p.company)}</span>`
      : '';
    return `
      <div class="mini-card fade-in-up">
        <div class="mini-card-title">${escHtml(p.title)}</div>
        <div class="mini-card-subtitle">${escHtml(p.subtitle)} &middot; <span class="text-muted t-mono-sm">${escHtml(p.period)}</span> ${companyBadge}</div>
        <div class="mini-tech-tags">${tags}</div>
        ${impact}
      </div>`;
  }).join('');
  triggerFadeIn(container.querySelectorAll('.mini-card'));
}

/* ================================================================
   RESEARCH LOG
   ================================================================ */
const TYPE_ICON = {
  paper:  '📄',
  tool:   '🔧',
  repo:   '📦',
  course: '📚',
  blog:   '📝',
  idea:   '💡',
};

const LOG_PAGE_SIZE = 2; // date-groups shown per page
let currentLogPage = 1;

function getFilteredLogGroups(filter) {
  return DATA.researchLog.entries
    .map(dayGroup => ({
      date: dayGroup.date,
      items: filter === 'all' ? dayGroup.items : dayGroup.items.filter(i => i.type === filter),
    }))
    .filter(dayGroup => dayGroup.items.length > 0);
}

function renderResearchLog(filter = 'all', page = 1) {
  const container = document.getElementById('research-feed');
  if (!container || !DATA.researchLog) return;

  const groups = getFilteredLogGroups(filter);
  const totalPages = Math.max(1, Math.ceil(groups.length / LOG_PAGE_SIZE));
  currentLogPage = Math.min(Math.max(1, page), totalPages);

  const start = (currentLogPage - 1) * LOG_PAGE_SIZE;
  const pageGroups = groups.slice(start, start + LOG_PAGE_SIZE);

  container.innerHTML = pageGroups.map(dayGroup => {
    const formattedDate = formatDate(dayGroup.date);
    const itemsHTML = dayGroup.items.map(item => entryHTML(item)).join('');

    return `
      <div class="date-group">
        <div class="date-header">${formattedDate}</div>
        ${itemsHTML}
      </div>`;
  }).join('');

  triggerFadeIn(container.querySelectorAll('.log-entry'));
  renderLogPagination(filter, totalPages);
}

function renderLogPagination(filter, totalPages) {
  const wrap = document.getElementById('research-pagination');
  if (!wrap) return;

  if (totalPages <= 1) {
    wrap.innerHTML = '';
    return;
  }

  const pageBtns = Array.from({ length: totalPages }, (_, i) => i + 1).map(n =>
    `<button class="log-page-btn${n === currentLogPage ? ' active' : ''}" data-page="${n}">${n}</button>`
  ).join('');

  wrap.innerHTML = `
    <button class="log-page-btn log-page-nav" data-page="${currentLogPage - 1}" ${currentLogPage === 1 ? 'disabled' : ''}>‹ Prev</button>
    ${pageBtns}
    <button class="log-page-btn log-page-nav" data-page="${currentLogPage + 1}" ${currentLogPage === totalPages ? 'disabled' : ''}>Next ›</button>`;

  wrap.querySelectorAll('.log-page-btn[data-page]:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      renderResearchLog(filter, parseInt(btn.dataset.page, 10));
      document.getElementById('research-feed').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function entryHTML(item) {
  const icon = TYPE_ICON[item.type] || '📌';
  const title = item.url
    ? `<a href="${item.url}" target="_blank" rel="noopener">${escHtml(item.title)}</a>`
    : escHtml(item.title);

  let meta = '';
  if (item.authors) meta += item.authors;
  if (item.source)  meta += (meta ? ' · ' : '') + item.source;
  if (item.stars)   meta += (meta ? ' · ' : '') + `★ ${item.stars}`;

  const tags = (item.tags || []).map(t =>
    `<span class="entry-tag">#${escHtml(t)}</span>`
  ).join('');

  const note = item.note
    ? `<div class="entry-note">${escHtml(item.note)}</div>`
    : '';

  let progress = '';
  if (item.type === 'course' && item.progress != null) {
    const pct = item.progress;
    const label = pct === 100 ? 'Complete ✓' : `${pct}%`;
    progress = `
      <div class="course-progress">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="progress-label">${label}</span>
      </div>`;
  }

  return `
    <div class="log-entry fade-in-up" data-type="${item.type}">
      <div class="entry-icon">${icon}</div>
      <div class="entry-content">
        <div class="entry-title">${title}</div>
        ${meta ? `<div class="entry-meta">${escHtml(meta)}</div>` : ''}
        <div class="entry-tags">${tags}</div>
        ${note}
        ${progress}
      </div>
    </div>`;
}

function renderResearchStats() {
  const sidebar = document.getElementById('research-sidebar');
  if (!sidebar || !DATA.researchLog) return;

  // Count types
  const counts = {};
  let totalTags = {};
  DATA.researchLog.entries.forEach(day => {
    day.items.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
      (item.tags || []).forEach(tag => {
        totalTags[tag] = (totalTags[tag] || 0) + 1;
      });
    });
  });

  // Top 6 tags
  const topTags = Object.entries(totalTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const statsHTML = [
    { icon: '📄', label: 'Papers',  key: 'paper' },
    { icon: '🔧', label: 'Tools',   key: 'tool' },
    { icon: '📦', label: 'Repos',   key: 'repo' },
    { icon: '📚', label: 'Courses', key: 'course' },
  ].map(s => `
    <div class="stat-item">
      <span class="stat-value" data-countup="${counts[s.key] || 0}">${counts[s.key] || 0}</span>
      <span class="stat-key">${s.icon} ${s.label}</span>
    </div>`).join('');

  const tagCloud = topTags.map(([tag, count]) =>
    `<span class="cloud-tag">#${tag} <span class="count">${count}</span></span>`
  ).join('');

  sidebar.innerHTML = `
    <div class="sidebar-card">
      <div class="sidebar-card-title">This Log</div>
      <div class="stats-grid-2">${statsHTML}</div>
    </div>
    <div class="sidebar-card">
      <div class="sidebar-card-title">Top Tags</div>
      <div class="tag-cloud">${tagCloud}</div>
    </div>`;
}

/* ================================================================
   CERTIFICATIONS
   ================================================================ */
function renderCertifications() {
  const container = document.getElementById('certs-grid');
  if (!container || !DATA.certifications) return;

  const ordered = [...DATA.certifications.certifications]
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first, matches Career Arc convention

  container.innerHTML = ordered.map(c => certCardHTML(c)).join('');
  triggerFadeIn(container.querySelectorAll('.cert-card'));
}

function certCardHTML(c) {
  const iconClass = `cert-icon-${c.icon}`;
  const abbrev = c.icon === 'azure' ? 'AZ' : c.icon === 'aws' ? 'AWS' : c.icon === 'databricks' ? 'DB' : c.icon === 'oracle' ? 'OCI' : c.icon === 'dataiku' ? 'DK' : c.icon === 'igmguru' ? 'IGM' : '•';
  const verifyLink = c.url
    ? `<a href="${c.url}" target="_blank" rel="noopener" class="cert-verify">verify ↗</a>`
    : '';
  const year = c.date ? new Date(c.date).getFullYear() : '';

  return `
    <div class="cert-card fade-in-up">
      <div class="cert-card-top">
        <div class="cert-provider-icon ${iconClass}">${abbrev}</div>
        ${year ? `<span class="cert-year t-mono-sm">${year}</span>` : ''}
      </div>
      <div class="cert-name">${escHtml(c.name)}</div>
      <div class="cert-provider">${escHtml(c.provider)}</div>
      ${verifyLink}
    </div>`;
}

const SKILL_LEVEL_DOTS = { Working: 1, Advanced: 2, Expert: 3 };

function parseProjectPeriod(period) {
  const years = (String(period).match(/\d{4}/g) || []).map(Number);
  if (!years.length) return null;
  const present = /present/i.test(period);
  return { start: years[0], end: present ? new Date().getFullYear() : years[years.length - 1], present };
}

function skillEvidence(projectIds) {
  if (!projectIds || !projectIds.length || !DATA.projects) return '';

  const all = [...DATA.projects.featured, ...DATA.projects.more];
  const periods = projectIds
    .map(id => all.find(p => p.id === id))
    .filter(Boolean)
    .map(p => parseProjectPeriod(p.period))
    .filter(Boolean);
  if (!periods.length) return '';

  const since = Math.min(...periods.map(p => p.start));
  const lastUsed = periods.some(p => p.present) ? 'now' : Math.max(...periods.map(p => p.end));
  const noun = periods.length === 1 ? 'project' : 'projects';
  return `${periods.length} ${noun} · since ${since} · last used ${lastUsed}`;
}

function renderSkills() {
  const container = document.getElementById('skills-matrix-body');
  if (!container || !DATA.certifications) return;

  container.innerHTML = DATA.certifications.skillGroups.map((g, gi) => {
    const rows = g.skills.map(s => {
      const dots = Array.from({ length: 3 }, (_, i) =>
        `<i class="${i < (SKILL_LEVEL_DOTS[s.level] || 0) ? 'on' : ''}"></i>`
      ).join('');
      const evidence = skillEvidence(s.projects);
      return `
        <div class="skill-row">
          <div class="skill-domain">${escHtml(s.domain)}</div>
          <div class="skill-detail">
            <div class="skill-techs">${escHtml(s.techs)}</div>
            ${evidence ? `<div class="skill-evidence">${escHtml(evidence)}</div>` : ''}
          </div>
          <div class="skill-level" data-level="${escHtml(s.level)}">
            <span class="level-dots" aria-hidden="true">${dots}</span>
            <span class="level-label">${escHtml(s.level)}</span>
          </div>
        </div>`;
    }).join('');

    return `
      <details class="skill-group fade-in-up"${gi === 0 ? ' open' : ''}>
        <summary class="skill-group-head">
          <span class="skill-group-name">${escHtml(g.group)}</span>
          <span class="skill-group-count">${g.skills.length} ${g.skills.length === 1 ? 'skill' : 'skills'}</span>
        </summary>
        <div class="skill-group-body">${rows}</div>
      </details>`;
  }).join('');

  triggerFadeIn(container.querySelectorAll('.skill-group'));

  const domains = document.getElementById('skills-domains');
  if (domains && DATA.certifications.domains) {
    domains.innerHTML = `<span class="domains-label">Industry domains</span>` +
      DATA.certifications.domains.map(d => `<span class="domain-chip">${escHtml(d)}</span>`).join('');
  }
}

const AWARD_TYPE_ICON = { promotion: '📈', award: '🏆' };

function renderAwards() {
  const container = document.getElementById('awards-list');
  if (!container || !DATA.certifications) return;

  const ordered = [...DATA.certifications.awards]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = ordered.map(a => {
    const title = a.url
      ? `<a href="${a.url}" target="_blank" rel="noopener">${escHtml(a.title)}</a>`
      : escHtml(a.title);
    const icon = AWARD_TYPE_ICON[a.type] || '🏅';
    return `
      <div class="award-item fade-in-up" data-type="${a.type || ''}">
        <span class="award-icon">${icon}</span>
        <div class="award-content">
          <div class="award-title">${title}</div>
          <div class="award-meta">${escHtml(a.org)} &middot; ${escHtml(a.year)}</div>
        </div>
      </div>`;
  }).join('');
  triggerFadeIn(container.querySelectorAll('.award-item'));
}

/* ================================================================
   TIMELINE
   ================================================================ */
const TIMELINE_TYPE_META = {
  current:   { label: 'Now',         icon: '⚡' },
  award:     { label: 'Recognition', icon: '🏆' },
  milestone: { label: 'Promotion',   icon: '📈' },
  role:      { label: 'Role',        icon: '💼' },
  education: { label: 'Education',  icon: '🎓' },
  start:     { label: 'Origin',      icon: '🚀' },
};

function renderTimeline() {
  const container = document.getElementById('timeline-wrap');
  if (!container || !DATA.timeline) return;

  container.innerHTML = DATA.timeline.entries.map(node => {
    const tagsHTML = node.tags && node.tags.length
      ? `<div class="timeline-tags">${node.tags.map(t => `<span class="timeline-tag">${escHtml(t)}</span>`).join('')}</div>`
      : '';

    const durationHTML = node.duration
      ? `<span class="t-mono-sm text-muted"> · ${escHtml(node.duration)}</span>`
      : '';

    const typeMeta = TIMELINE_TYPE_META[node.type] || { label: node.type, icon: '•' };
    const badgeHTML = `<span class="timeline-type-badge" data-type="${node.type}">${typeMeta.icon} ${typeMeta.label}</span>`;

    return `
      <div class="timeline-node fade-in-up" data-type="${node.type}">
        <div class="timeline-dot"></div>
        <div class="timeline-year-row">
          <div class="timeline-year">${escHtml(node.label)}${durationHTML}</div>
          ${badgeHTML}
        </div>
        <div class="timeline-title">${escHtml(node.title)}</div>
        ${node.org ? `<div class="timeline-org">${escHtml(node.org)}</div>` : ''}
        <div class="timeline-desc">${escHtml(node.description)}</div>
        ${tagsHTML}
      </div>`;
  }).join('');
  triggerFadeIn(container.querySelectorAll('.timeline-node'));
}

/* ================================================================
   FILTERS
   ================================================================ */
function initFilters() {
  // Project filters
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter);
    });
  });

  // Research log filters
  document.querySelectorAll('.log-filter-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.log-filter-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderResearchLog(btn.dataset.type, 1);
    });
  });
}

/* ================================================================
   COUNT-UP ANIMATION
   ================================================================ */
function initCountUp() {
  const targets = document.querySelectorAll('[data-countup]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCountUp(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  targets.forEach(t => obs.observe(t));
}

function animateCountUp(el) {
  const raw = el.dataset.countup || el.textContent;
  const prefix = raw.match(/^[^\d]*/)?.[0] || '';
  const suffix = raw.match(/[^\d.]*$/)?.[0] || '';
  const num = parseFloat(raw.replace(/[^\d.]/g, ''));

  if (isNaN(num)) return;
  const duration = 1600;
  const steps = 50;
  const increment = num / steps;
  let current = 0;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current = Math.min(current + increment, num);
    const display = Number.isInteger(num) ? Math.round(current) : current.toFixed(1);
    el.textContent = prefix + display + suffix;
    if (step >= steps) clearInterval(timer);
  }, duration / steps);
}

/* ================================================================
   HERO TYPING EFFECT
   ================================================================ */
function getTypingPhrases() {
  return [
    'Building production AI systems at scale',
    `${getYearsExperience()}+ years of shipping ML to production`,
    'From research papers to deployed pipelines',
    'Architecting GenAI platforms that deliver ROI',
  ];
}

function initHeroTyping() {
  const el = document.getElementById('hero-subtitle-text');
  const cursor = document.getElementById('typing-cursor');
  if (!el) return;

  const TYPING_PHRASES = getTypingPhrases();
  let phraseIdx = 0, charIdx = 0, deleting = false;

  function tick() {
    const phrase = TYPING_PHRASES[phraseIdx];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++charIdx);
      if (charIdx === phrase.length) {
        deleting = true;
        setTimeout(tick, 2200);
        return;
      }
      setTimeout(tick, 52);
    } else {
      el.textContent = phrase.slice(0, --charIdx);
      if (charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % TYPING_PHRASES.length;
        setTimeout(tick, 400);
        return;
      }
      setTimeout(tick, 28);
    }
  }
  tick();
}

/* ================================================================
   SCROLL SPY
   ================================================================ */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  const nav = document.getElementById('site-nav');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => obs.observe(s));

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

/* ================================================================
   SCROLL ANIMATIONS
   ================================================================ */
function initScrollAnimations() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-in-up').forEach(el => obs.observe(el));
}

function triggerFadeIn(els) {
  // Re-observe newly rendered elements
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });

  els.forEach((el, i) => {
    el.style.transitionDelay = `${i * 60}ms`;
    obs.observe(el);
  });
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function initNav() {
  const toggle   = document.getElementById('nav-toggle');
  const overlay  = document.getElementById('mobile-overlay');
  const panel    = document.getElementById('mobile-panel');
  const closeBtn = document.getElementById('mobile-close');

  function openMenu() {
    overlay.classList.add('open');
    panel.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    overlay.classList.remove('open');
    panel.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (toggle)   toggle.addEventListener('click', openMenu);
  if (overlay)  overlay.addEventListener('click', closeMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  document.querySelectorAll('.mobile-nav-link').forEach(l => {
    l.addEventListener('click', closeMenu);
  });
}

/* ================================================================
   UTILITIES
   ================================================================ */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}
