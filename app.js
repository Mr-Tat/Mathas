(() => {
  const cfg = window.MATHAS_CONFIG;
  const params = new URLSearchParams(location.search);
  const classKey = (params.get('classe') || 'observation').toLowerCase();
  const currentClass = cfg.classes[classKey] || cfg.classes.observation;

  document.body.classList.add(currentClass.theme);
  document.getElementById('classLabel').textContent = currentClass.label;

  const levelsDef = [
    { key: 'objectif', label: 'Objectif', domains: true },
    { key: 'depassement', label: 'Dépassement', domains: true },
    { key: 'revision', label: 'Révision', domains: true },
    { key: 'outils', label: 'Outils', domains: false }
  ];
  const domainLabels = { calcul: 'Calcul', geometrie: 'Géométrie', grandeurs: 'Grandeurs' };

  const levelsHost = document.getElementById('levels');
  const dailyHost = document.getElementById('dailyApps');

  const visibleApps = cfg.apps.filter(app => {
    const c = app.classes?.[classKey];
    return c && c.visible !== false;
  });

  const dailyApps = visibleApps.filter(app => app.classes[classKey].daily === true);
  renderAppsInto(dailyHost, dailyApps, true);

  levelsDef.forEach(levelDef => {
    const node = document.getElementById('levelTemplate').content.firstElementChild.cloneNode(true);
    node.querySelector('.level-title').textContent = levelDef.label;
    const toggle = node.querySelector('.level-toggle');
    toggle.addEventListener('click', () => {
      const collapsed = node.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });

    const content = node.querySelector('.level-content');
    if (levelDef.domains) {
      ['calcul', 'geometrie', 'grandeurs'].forEach(domainKey => {
        content.appendChild(makeDomain(levelDef.key, domainKey));
      });
    } else {
      const apps = visibleApps.filter(app => app.classes[classKey].level === 'outils');
      const host = document.createElement('div');
      host.className = 'app-grid';
      renderAppsInto(host, apps, true);
      content.appendChild(host);
    }
    levelsHost.appendChild(node);
  });

  function makeDomain(levelKey, domainKey) {
    const node = document.getElementById('domainTemplate').content.firstElementChild.cloneNode(true);
    node.querySelector('.domain-title').textContent = domainLabels[domainKey];
    const toggle = node.querySelector('.domain-toggle');
    const content = node.querySelector('.domain-content');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      content.hidden = open;
    });

    const apps = visibleApps.filter(app => {
      const c = app.classes[classKey];
      return c.level === levelKey && (app.domains || []).includes(domainKey);
    });

    const categories = new Map();
    apps.forEach(app => {
      (app.categories || ['Autres']).forEach(cat => {
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat).push(app);
      });
    });

    const categoryList = node.querySelector('.category-list');
    if (!categories.size) {
      const p = document.createElement('p');
      p.className = 'empty-state';
      p.textContent = 'Aucune application pour le moment.';
      categoryList.appendChild(p);
    } else {
      [...categories.entries()].sort(([a],[b]) => a.localeCompare(b, 'fr')).forEach(([name, catApps]) => {
        categoryList.appendChild(makeCategory(name, catApps));
      });
    }
    return node;
  }

  function makeCategory(name, apps) {
    const node = document.getElementById('categoryTemplate').content.firstElementChild.cloneNode(true);
    node.querySelector('.category-name').textContent = name;
    node.querySelector('.category-count').textContent = `${apps.length} app${apps.length > 1 ? 's' : ''}`;
    const toggle = node.querySelector('.category-toggle');
    const content = node.querySelector('.category-content');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      content.hidden = open;
    });
    renderAppsInto(node.querySelector('.category-apps'), apps, false);
    return node;
  }

  function renderAppsInto(host, apps, emptyMessage) {
    host.innerHTML = '';
    if (!apps.length) {
      if (emptyMessage) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Aucune application pour le moment.';
        host.appendChild(p);
      }
      return;
    }
    apps.forEach(app => host.appendChild(makeAppCard(app)));
  }

  function makeAppCard(app) {
    const card = document.getElementById('appTemplate').content.firstElementChild.cloneNode(true);
    card.href = app.url || '#';
    card.querySelector('.app-name').textContent = app.name;
    const initial = card.querySelector('.app-initial');
    initial.textContent = (app.name || 'M').trim().charAt(0).toUpperCase();

    if (app.image) {
      const img = document.createElement('img');
      img.src = app.image;
      img.alt = '';
      card.querySelector('.app-thumb').replaceChildren(img);
    }

    const scores = getScores(app.id);
    card.querySelector('.app-scores').textContent = scores.length
      ? scores.slice(0, 3).map(s => `${s.score}/${s.total}`).join(' · ')
      : 'Pas encore de score';
    return card;
  }

  function getScores(appId) {
    try {
      const raw = localStorage.getItem(`mathas_scores_${appId}`);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  document.getElementById('teacherBtn').addEventListener('click', () => {
    alert('Le panneau enseignant sera ajouté lors de la connexion à Supabase.');
  });
})();
