(async () => {
  const cfg = window.MATHAS_CONFIG;
  const params = new URLSearchParams(location.search);
  const classKey = (params.get('classe') || 'observation').toLowerCase();
  const currentClass = cfg.classes[classKey] || cfg.classes.observation;

  document.body.classList.add(currentClass.theme);
  document.getElementById('classLabel').textContent = currentClass.label;
  document.title = currentClass.tabTitle || `Math'as ${currentClass.label}`;

  const levelsDef = [
    { key: 'objectif', label: 'Objectif', openByDefault: true },
    { key: 'depassement', label: 'Dépassement', openByDefault: false },
    { key: 'revision', label: 'Révision', openByDefault: false },
    { key: 'outil', label: 'Outils', openByDefault: true }
  ];

  const levelsHost = document.getElementById('levels');
  const dailyHost = document.getElementById('dailyApps');
  const dailyCount = document.getElementById('dailyCount');

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

    const [classes, applications, classApplications] = await Promise.all([
      apiGet(`${url}/rest/v1/classes?select=id,slug,nom`, headers),
      apiGet(`${url}/rest/v1/applications?select=id,nom,url,miniature_url,description,actif&actif=eq.true`, headers),
      apiGet(`${url}/rest/v1/class_applications?select=class_id,application_id,visible,du_jour,niveau,domaine,ordre`, headers)
    ]);

    const classRow =
      classes.find(row => row.slug === slug) ||
      classes.find(row => row.slug === 'observation');

    if (!classRow) {
      throw new Error('Classe introuvable dans Supabase.');
    }

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
          order: settings.ordre ?? 0
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

  function countLabel(n) {
    return `${n} app${n > 1 ? 's' : ''}`;
  }

  function renderHub(allApps) {
    levelsHost.innerHTML = '';

    const visibleApps = allApps.filter(app => app.visible);
    const dailyApps = visibleApps.filter(app => app.daily);

    dailyCount.textContent = countLabel(dailyApps.length);
    renderAppsInto(dailyHost, dailyApps, true);

    levelsDef.forEach(levelDef => {
      const node =
        document.getElementById('levelTemplate')
          .content.firstElementChild.cloneNode(true);

      if (levelDef.openByDefault) {
        node.classList.remove('collapsed');
      } else {
        node.classList.add('collapsed');
      }

      const levelApps = visibleApps.filter(app => app.level === levelDef.key);

      node.querySelector('.level-title').textContent = levelDef.label;
      node.querySelector('.level-count').textContent = countLabel(levelApps.length);

      const toggle = node.querySelector('.level-toggle');
      toggle.setAttribute('aria-expanded', String(levelDef.openByDefault));

      toggle.addEventListener('click', () => {
        const collapsed = node.classList.toggle('collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
      });

      renderAppsInto(node.querySelector('.level-apps'), levelApps, true);

      levelsHost.appendChild(node);
    });
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

    /* Une application = une seule carte dans son niveau */
    const uniqueApps = [...new Map(apps.map(app => [app.id, app])).values()];

    uniqueApps.forEach(app => {
      host.appendChild(makeAppCard(app));
    });
  }

  function makeAppCard(app) {
    const card =
      document.getElementById('appTemplate')
        .content.firstElementChild.cloneNode(true);

    card.href = app.url || '#';
    card.target = '_self';

    card.querySelector('.app-name').textContent = app.name;

    const initial = card.querySelector('.app-initial');
    initial.textContent =
      (app.name || 'M').trim().charAt(0).toUpperCase();

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
    dailyCount.textContent = '…';
    dailyHost.innerHTML =
      '<p class="empty-state">Chargement des applications…</p>';
    levelsHost.innerHTML = '';
  }

  function renderError(message) {
    dailyCount.textContent = '0 app';
    dailyHost.innerHTML =
      `<p class="empty-state">${message}</p>`;
    levelsHost.innerHTML = '';
  }

  document.getElementById('teacherBtn').addEventListener('click', () => {
    alert('Le panneau enseignant sera ajouté à l’étape suivante.');
  });
})();
