(async () => {
  const cfg = window.MATHAS_CONFIG;
  const params = new URLSearchParams(location.search);
  const classKey = (params.get('classe') || 'observation').toLowerCase();

  const specialViews = {
    toutes: {
      label: 'Toutes les applis',
      theme: 'theme-toutes',
      tabTitle: "Math'as — Toutes les applis",
      simpleView: true,
      showScores: true
    },
    partage: {
      label: 'Partage',
      theme: 'theme-partage',
      tabTitle: "Math'as — Partage",
      simpleView: true,
      showScores: false
    }
  };

  const currentClass =
    specialViews[classKey] ||
    cfg.classes[classKey] ||
    cfg.classes.observation;

  const isSimpleView = currentClass.simpleView === true;
  const showScoresInSimpleView = currentClass.showScores !== false;

  document.body.classList.add(currentClass.theme);
  if (isSimpleView) document.body.classList.add('simple-view');
  const classLabel = document.getElementById('classLabel');
  classLabel.textContent = currentClass.label;
  if (isSimpleView) classLabel.hidden = true;

  document.title = currentClass.tabTitle || `Math'as ${currentClass.label}`;

  const levelsDef = [
    { key: 'objectif', label: 'Objectif', description: 'Niveau visé', openByDefault: true },
    { key: 'depassement', label: 'Dépassement', description: 'Niveau futur ou difficile', openByDefault: false },
    { key: 'revision', label: 'Révision', description: 'Niveau facile ou rappel', openByDefault: false },
    { key: 'outil', label: 'Outils', description: 'Pour t’aider', openByDefault: true }
  ];

  const levelsHost = document.getElementById('levels');
  const dailySection = document.querySelector('.daily-section');
  const dailyTitle = document.getElementById('dailyTitle');
  const dailyHost = document.getElementById('dailyApps');
  const dailyCount = document.getElementById('dailyCount');

  try {
    setLoading();
    const apps = await loadAppsFromSupabase(classKey);
    renderHub(apps);
  } catch (error) {
    console.error('Mathas loading error:', error);
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

    const classRow = classes.find(row => row.slug === slug);

    if (!classRow) {
      if (slug === 'toutes' || slug === 'partage') {
        throw new Error(
          `La page "${slug}" n'existe pas encore dans Supabase. Exécute setup_toutes_partage.sql.`
        );
      }

      const observation = classes.find(row => row.slug === 'observation');
      if (!observation) throw new Error('Classe introuvable dans Supabase.');
      return buildAppsForClass(
        observation,
        applications,
        classApplications,
        categories,
        applicationCategories
      );
    }

    return buildAppsForClass(
      classRow,
      applications,
      classApplications,
      categories,
      applicationCategories
    );
  }

  function buildAppsForClass(
    classRow,
    applications,
    classApplications,
    categories,
    applicationCategories
  ) {

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

  function countLabel(n) {
    return `${n} app${n > 1 ? 's' : ''}`;
  }

  function renderHub(allApps) {
    levelsHost.innerHTML = '';
    const visibleApps = allApps.filter(app => app.visible);

    if (isSimpleView) {
      levelsHost.hidden = true;
      dailySection.classList.add('simple-apps-section');
      dailyHost.classList.add('simple-app-grid');
      dailyTitle.textContent = currentClass.label;

      const simpleApps = [...visibleApps].sort(
        (a, b) => a.name.localeCompare(b.name, 'fr')
      );

      dailyCount.textContent = countLabel(simpleApps.length);

      renderAppsInto(
        dailyHost,
        simpleApps,
        true,
        {
          showScores: showScoresInSimpleView,
          respectToolLevel: false
        }
      );

      return;
    }

    levelsHost.hidden = false;

    const dailyApps = visibleApps.filter(app => app.daily);

    dailyCount.textContent = countLabel(dailyApps.length);
    renderAppsInto(dailyHost, dailyApps, true);

    levelsDef.forEach(levelDef => {
      const node = document
        .getElementById('levelTemplate')
        .content.firstElementChild
        .cloneNode(true);

      const levelApps = visibleApps.filter(app => app.level === levelDef.key);

      node.querySelector('.level-title').textContent = levelDef.label;
      node.querySelector('.level-description').textContent = levelDef.description || '';
      node.querySelector('.level-count').textContent = countLabel(levelApps.length);

      const toggle = node.querySelector('.level-toggle');

      if (levelDef.openByDefault) {
        node.classList.remove('collapsed');
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        node.classList.add('collapsed');
        toggle.setAttribute('aria-expanded', 'false');
      }

      toggle.addEventListener('click', () => {
        const collapsed = node.classList.toggle('collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
      });

      renderAppsInto(node.querySelector('.level-apps'), levelApps, true);
      levelsHost.appendChild(node);
    });
  }

  function renderAppsInto(host, apps, emptyMessage, options = {}) {
    host.innerHTML = '';

    if (!apps.length) {
      host.classList.add('empty-grid');
      if (emptyMessage) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Aucune application pour le moment.';
        host.appendChild(p);
      }
      return;
    }

    // Dès qu'il y a des applis, on retire le mode 'grille vide'.
    // Sinon la règle CSS de l'état vide force une seule colonne géante.
    host.classList.remove('empty-grid');

    const uniqueApps = [...new Map(apps.map(app => [app.id, app])).values()];

    uniqueApps.forEach(app => {
      host.appendChild(makeAppCard(app, options));
    });
  }

  function makeAppCard(app, options = {}) {
    const card = document.getElementById('appTemplate').content.firstElementChild.cloneNode(true);
    card.href = app.url || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
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

    const scoresHost = card.querySelector('.app-scores');
    const showScores = options.showScores !== false;
    const respectToolLevel = options.respectToolLevel !== false;

    // Pages sans scores (Partage), ou Outils dans les hubs élèves.
    if (!showScores || (respectToolLevel && app.level === 'outil')) {
      scoresHost.remove();
      return card;
    }

    const resultats = getResultats(app.url);

    if (!resultats.dernier && !resultats.meilleur) {
      scoresHost.classList.add('score-list');

      const lastRow = document.createElement('span');
      lastRow.className = 'score-row';
      const lastLabel = document.createElement('strong');
      lastLabel.textContent = 'Dernier :';
      lastLabel.style.textDecoration = 'underline';
      lastLabel.style.fontWeight = '800';
      lastRow.append(lastLabel, document.createTextNode(' Pas de score'));

      const bestRow = document.createElement('span');
      bestRow.className = 'score-row';
      const bestLabel = document.createElement('strong');
      bestLabel.textContent = 'Meilleur :';
      bestLabel.style.textDecoration = 'underline';
      bestLabel.style.fontWeight = '800';
      bestRow.append(bestLabel, document.createTextNode(' Pas de score'));

      scoresHost.replaceChildren(lastRow, bestRow);
      return card;
    }

    scoresHost.classList.add('score-list');
    scoresHost.replaceChildren();

    if (resultats.dernier) {
      scoresHost.appendChild(
        makeScoreRow('Dernier', resultats.dernier)
      );
    }

    if (resultats.meilleur) {
      scoresHost.appendChild(
        makeScoreRow('Meilleur', resultats.meilleur)
      );
    }

    return card;
  }

  function makeScoreRow(label, resultat) {
    const row = document.createElement('span');
    row.className = 'score-row';

    const scoreText =
      resultat.total !== undefined && resultat.total !== null
        ? `${resultat.score}/${resultat.total}`
        : String(resultat.score ?? '');

    const niveauText =
      resultat.niveau ??
      resultat.level ??
      resultat.difficulte ??
      resultat.difficulty ??
      '';

    const dateText = formatScoreDate(resultat.date);

    const details = [scoreText];
    if (niveauText) details.push(String(niveauText));
    if (dateText) details.push(dateText);

    const labelEl = document.createElement('strong');
    labelEl.textContent = `${label} :`;
    labelEl.style.textDecoration = 'underline';
    labelEl.style.fontWeight = '800';

    row.append(labelEl, document.createTextNode(` ${details.join(' • ')}`));
    return row;
  }

  function getResultats(appUrl) {
    try {
      const key = getScoreStorageKey(appUrl);
      if (!key) return { dernier: null, meilleur: null };

      const raw = localStorage.getItem(key);
      if (!raw) return { dernier: null, meilleur: null };

      const data = JSON.parse(raw);

      // Nouveau format attendu :
      // { dernier: {...}, meilleur: {...} }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return {
          dernier: data.dernier ?? null,
          meilleur: data.meilleur ?? null
        };
      }

      // Compatibilité provisoire avec l'ancien format en tableau :
      // le plus récent est affiché comme "Dernier".
      if (Array.isArray(data) && data.length) {
        return {
          dernier: data[0] ?? null,
          meilleur: null
        };
      }

      return { dernier: null, meilleur: null };
    } catch {
      return { dernier: null, meilleur: null };
    }
  }

  function getScoreStorageKey(appUrl) {
    try {
      const url = new URL(appUrl, window.location.origin);
      let path = url.pathname.toLowerCase();

      // Normalisation pour que /MonJeu et /MonJeu/ donnent la même clé.
      if (!path.endsWith('/')) path += '/';

      return `mathas_scores_${path}`;
    } catch {
      return null;
    }
  }

  function formatScoreDate(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('fr-BE', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  function setLoading() {
    dailyCount.textContent = '…';
    dailyHost.innerHTML = '<p class="empty-state">Chargement des applications…</p>';
    levelsHost.innerHTML = '';
  }

  function renderError(message) {
    dailyCount.textContent = '0 app';
    dailyHost.innerHTML = `<p class="empty-state">${message}</p>`;
    levelsHost.innerHTML = '';
  }

})();
