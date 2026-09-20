(async () => {
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
    { key: 'outil', label: 'Outils', domains: false }
  ];
  const domainLabels = {
    calcul: 'Calcul',
    geometrie: 'Géométrie',
    grandeurs: 'Grandeurs'
  };

  const levelsHost = document.getElementById('levels');
  const dailyHost = document.getElementById('dailyApps');

  try {
    setLoading();
    const apps = await loadAppsFromSupabase(classKey);
    renderHub(apps);
  } catch (error) {
    console.error(error);
    renderError('Impossible de charger les applications pour le moment.');
  }

  async function loadAppsFromSupabase(slug) {
    const { url, publishableKey } = cfg.supabase;
    const headers = {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`
    };

    const [classes, applications, classApplications, categories, applicationCategories] = await Promise.all([
      apiGet(`${url}/rest/v1/classes?select=id,slug,nom`, headers),
      apiGet(`${url}/rest/v1/applications?select=id,nom,url,miniature_url,description,actif&actif=eq.true`, headers),
      apiGet(`${url}/rest/v1/class_applications?select=class_id,application_id,visible,du_jour,niveau,domaine,ordre`, headers),
      apiGet(`${url}/rest/v1/categories?select=id,nom`, headers),
      apiGet(`${url}/rest/v1/application_categories?select=application_id,category_id`, headers)
    ]);

    const classRow = classes.find(row => row.slug === slug) || classes.find(row => row.slug === 'observation');
    if (!classRow) throw new Error('Classe introuvable dans Supabase.');

    const categoryById = new Map(categories.map(cat => [cat.id, cat.nom]));
    const categoriesByApp = new Map();
    applicationCategories.forEach(link => {
      if (!categoriesByApp.has(link.application_id)) categoriesByApp.set(link.application_id, []);
      const name = categoryById.get(link.category_id);
      if (name) categoriesByApp.get(link.application_id).push(name);
    });

    const settingsByApp = new Map(
      classApplications
        .filter(row => row.class_id === classRow.id)
        .map(row => [row.application_id, row])
    );

    return applications
      .map(app => {
        const settings = settingsByApp.get(app.id);
        if (!settings) return null;
        return {
          id: app.id,
          name: app.nom,
          url: app.url,
          image: app.miniature_url,
          description: app.description,
          visible: settings.visible !== false,
          daily: settings.du_jour === true,
          level: settings.niveau,
          domain: settings.domaine,
          order: settings.ordre ?? 0,
          categories: categoriesByApp.get(app.id) || []
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
  }

  async function apiGet(endpoint, headers) {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase ${response.status}: ${detail}`);
    }
    return response.json();
  }

  function renderHub(allApps) {
    levelsHost.innerHTML = '';
    const visibleApps = allApps.filter(app => app.visible);
    const dailyApps = visibleApps.filter(app => app.daily);
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
          content.appendChild(makeDomain(levelDef.key, domainKey, visibleApps));
        });
      } else {
        const apps = visibleApps.filter(app => app.level === 'outil');
        const host = document.createElement('div');
        host.className = 'app-grid';
        renderAppsInto(host, apps, true);
        content.appendChild(host);
      }
      levelsHost.appendChild(node);
    });
  }

  function makeDomain(levelKey, domainKey, visibleApps) {
    const node = document.getElementById('domainTemplate').content.firstElementChild.cloneNode(true);
    node.querySelector('.domain-title').textContent = domainLabels[domainKey];
    const toggle = node.querySelector('.domain-toggle');
    const content = node.querySelector('.domain-content');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      content.hidden = open;
    });

    const apps = visibleApps.filter(app => app.level === levelKey && app.domain === domainKey);
    const categories = new Map();

    apps.forEach(app => {
      const appCategories = app.categories.length ? app.categories : ['Autres'];
      appCategories.forEach(cat => {
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
      [...categories.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'fr'))
        .forEach(([name, catApps]) => categoryList.appendChild(makeCategory(name, catApps)));
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
    card.target = '_self';
    card.querySelector('.app-name').textContent = app.name;

    const initial = card.querySelector('.app-initial');
    initial.textContent = (app.name || 'M').trim().charAt(0).toUpperCase();

    if (app.image) {
      const img = document.createElement('img');
      img.src = app.image;
      img.alt = '';
      img.loading = 'lazy';
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

  function setLoading() {
    dailyHost.innerHTML = '<p class="empty-state">Chargement des applications…</p>';
    levelsHost.innerHTML = '';
  }

  function renderError(message) {
    dailyHost.innerHTML = `<p class="empty-state">${message}</p>`;
    levelsHost.innerHTML = '';
  }

  document.getElementById('teacherBtn').addEventListener('click', () => {
    alert('Le panneau enseignant sera ajouté à l’étape suivante.');
  });
})();
