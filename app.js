(async () => {
  const cfg = window.MATHAS_CONFIG;
  const IMAGE_BUCKET = 'mathas-images';
  const IMAGE_PUBLIC_PREFIX = `${cfg.supabase.url}/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const IMAGE_RENDER_NONCE = Date.now().toString(36);

  refreshStaticMathasImages();
  const params = new URLSearchParams(location.search);
  const shareToken = (params.get('partage') || '').trim();

  let classKey = (params.get('classe') || 'observation').toLowerCase();
  let currentClass = null;
  let sharePayload = null;
  let invalidShare = false;
  let invalidClass = false;

  if (shareToken) {
    try {
      sharePayload = await loadSharePayload(shareToken);
    } catch (error) {
      console.error('Mathas share resolution error:', error);
      invalidShare = true;
    }

    if (!sharePayload || sharePayload.valid !== true) {
      invalidShare = true;
      currentClass = {
        label: 'Partage',
        theme: 'theme-partage',
        tabTitle: "Math'as — Partage",
        simpleView: true,
        showScores: false,
        sectionKeys: ['niveau1', 'niveau2', 'niveau3', 'calculs_ecrits', 'outil', 'autre']
      };
    } else {
      currentClass = {
        label: sharePayload.public_name || 'Partage',
        theme: 'theme-partage',
        tabTitle: "Math'as — Partage",
        simpleView: true,
        showScores: false,
        sectionKeys: ['niveau1', 'niveau2', 'niveau3', 'calculs_ecrits', 'outil', 'autre']
      };
    }
  } else {
    currentClass = cfg.classes[classKey] || null;
    invalidClass = !currentClass;

    if (invalidClass) {
      currentClass = {
        label: 'Math’as',
        theme: 'theme-observation',
        tabTitle: "Math'as",
        simpleView: false,
        showScores: true
      };
    }
  }

  const isSimpleView = currentClass.simpleView === true;
  const showScoresInSimpleView = currentClass.showScores !== false;

  document.body.classList.add(currentClass.theme);
  if (isSimpleView) document.body.classList.add('simple-view');
  const classLabel = document.getElementById('classLabel');
  classLabel.textContent = currentClass.label;

  let simpleTopCount = null;

  if (isSimpleView) {
    classLabel.hidden = false;

    const line = document.createElement('div');
    line.className = 'simple-class-line';

    classLabel.parentNode.insertBefore(line, classLabel);
    line.appendChild(classLabel);

    simpleTopCount = document.createElement('span');
    simpleTopCount.className = 'count-pill simple-top-count';
    simpleTopCount.textContent = '0 app';
    line.appendChild(simpleTopCount);
  }

  document.title = currentClass.tabTitle || `Math'as ${currentClass.label}`;

  const levelsDef = [
    { key: 'objectif', label: 'Objectif', description: 'Niveau visé', openByDefault: true },
    { key: 'calculs_ecrits', label: 'Calculs écrits', description: 'Calculs posés et techniques écrites', openByDefault: true },
    { key: 'depassement', label: 'Dépassement', description: 'Niveau futur ou difficile', openByDefault: false },
    { key: 'revision', label: 'Révision', description: 'Niveau facile ou rappel', openByDefault: false },
    { key: 'outil', label: 'Outils', description: 'Pour t’aider', openByDefault: true },
    {
      key: 'jeux',
      label: 'Jeux',
      description: 'Pour jouer',
      openByDefault: false,
      confirmBeforeOpen: true
    }
  ];

  const simpleSectionMeta = {
    niveau1: { key: 'niveau1', label: 'Niveau 1', openByDefault: true },
    niveau2: { key: 'niveau2', label: 'Niveau 2', openByDefault: true },
    niveau3: { key: 'niveau3', label: 'Niveau 3', openByDefault: true },
    calculs_ecrits: { key: 'calculs_ecrits', label: 'Calculs écrits', openByDefault: true },
    outil: { key: 'outil', label: 'Outils', openByDefault: true },
    autre: { key: 'autre', label: 'Autre', openByDefault: true },
    exterieur: { key: 'exterieur', label: 'Extérieur', openByDefault: true }
  };

  const simpleLevelsDef = (
    currentClass.sectionKeys || ['niveau1', 'niveau2', 'niveau3', 'calculs_ecrits', 'outil', 'autre']
  )
    .map(key => simpleSectionMeta[key])
    .filter(Boolean);

  const levelsHost = document.getElementById('levels');
  const dailySection = document.querySelector('.daily-section');
  const dailyHeading = dailySection.querySelector('.section-heading');
  const dailyTitle = document.getElementById('dailyTitle');
  const dailyHost = document.getElementById('dailyApps');
  const dailyCount = document.getElementById('dailyCount');

  if (invalidShare) {
    renderInactiveShare();
    return;
  }

  if (invalidClass) {
    renderError('Cette page Math’as n’existe pas.');
    return;
  }

  try {
    setLoading();
    const apps = shareToken
      ? buildAppsFromSharePayload(sharePayload)
      : await loadAppsFromSupabase(classKey);
    renderHub(apps);
  } catch (error) {
    console.error('Mathas loading error:', error);
    renderError('Impossible de charger les applications pour le moment.');
  }

  function freshMathasImageUrl(url, nonce = IMAGE_RENDER_NONCE) {
    if (!url || typeof url !== 'string' || !url.startsWith(IMAGE_PUBLIC_PREFIX)) return url;
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('cacheNonce', String(nonce));
      return parsed.toString();
    } catch {
      const joiner = url.includes('?') ? '&' : '?';
      return `${url}${joiner}cacheNonce=${encodeURIComponent(String(nonce))}`;
    }
  }

  function refreshStaticMathasImages() {
    document.querySelectorAll(`img[src^="${IMAGE_PUBLIC_PREFIX}"]`).forEach(img => {
      img.src = freshMathasImageUrl(img.getAttribute('src'));
    });
  }

  async function loadSharePayload(token) {
    const { url, publishableKey } = cfg.supabase;
    const response = await fetch(`${url}/rest/v1/rpc/get_shared_page`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_token: token })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase ${response.status}: ${detail}`);
    }

    return response.json();
  }

  function buildAppsFromSharePayload(payload) {
    const rows = Array.isArray(payload?.apps) ? payload.apps : [];

    return rows
      .map(row => ({
        id: row.application_id,
        name: row.nom,
        url: row.url,
        image: row.miniature_url,
        description: row.description,
        visible: true,
        daily: false,
        level: row.niveau || 'niveau1',
        domain: null,
        order: row.ordre ?? 0,
        categories: []
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fr'));
  }

  function renderInactiveShare() {
    if (dailySection) dailySection.hidden = true;
    if (simpleTopCount) simpleTopCount.textContent = 'Lien inactif';
    levelsHost.hidden = false;
    levelsHost.innerHTML = '';

    const panel = document.createElement('section');
    panel.className = 'panel share-inactive-panel';

    const title = document.createElement('h2');
    title.textContent = 'Ce lien de partage n’est plus actif';

    const text = document.createElement('p');
    text.textContent = 'Demande un nouveau lien à la personne qui te l’a transmis.';

    panel.append(title, text);
    levelsHost.appendChild(panel);
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
      throw new Error(`Page introuvable dans Supabase : ${slug}`);
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
      // "Toutes" et "Partage" utilisent maintenant leurs propres sections.
      dailySection.hidden = true;
      levelsHost.hidden = false;

      const count = countLabel(visibleApps.length);
      dailyCount.textContent = count;
      if (simpleTopCount) simpleTopCount.textContent = count;

      simpleLevelsDef.forEach(levelDef => {
        const node = document
          .getElementById('levelTemplate')
          .content.firstElementChild
          .cloneNode(true);

        node.classList.add('simple-level');

        const levelApps = visibleApps
          .filter(app => app.level === levelDef.key)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

        node.querySelector('.level-title').textContent = levelDef.label;
        node.querySelector('.level-description').textContent = '';
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

        renderAppsInto(
          node.querySelector('.level-apps'),
          levelApps,
          true,
          {
            showScores: showScoresInSimpleView,
            respectToolLevel: false
          }
        );

        levelsHost.appendChild(node);
      });

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

      toggle.addEventListener('click', async () => {
        const isCollapsed = node.classList.contains('collapsed');

        // Fermer une section déjà ouverte reste immédiat.
        if (!isCollapsed) {
          node.classList.add('collapsed');
          toggle.setAttribute('aria-expanded', 'false');
          return;
        }

        // Pour "Jeux", deux confirmations sont nécessaires à chaque ouverture.
        if (levelDef.confirmBeforeOpen) {
          const teacherOk = await askJeuxQuestion("Ton prof est d'accord ?");
          if (!teacherOk) return;

          const reallySure = await askJeuxQuestion('Tu es sûr ?');
          if (!reallySure) return;
        }

        node.classList.remove('collapsed');
        toggle.setAttribute('aria-expanded', 'true');
      });

      renderAppsInto(node.querySelector('.level-apps'), levelApps, true);
      levelsHost.appendChild(node);
    });
  }


  function askJeuxQuestion(message) {
    return new Promise(resolve => {
      const backdrop = document.createElement('div');
      backdrop.className = 'jeux-confirm-backdrop';

      const bubble = document.createElement('div');
      bubble.className = 'jeux-confirm-bubble';
      bubble.setAttribute('role', 'dialog');
      bubble.setAttribute('aria-modal', 'true');
      bubble.setAttribute('aria-label', message);
      bubble.tabIndex = -1;

      const question = document.createElement('p');
      question.className = 'jeux-confirm-question';
      question.textContent = message;

      const actions = document.createElement('div');
      actions.className = 'jeux-confirm-actions';

      const noBtn = document.createElement('button');
      noBtn.type = 'button';
      noBtn.className = 'jeux-confirm-btn';
      noBtn.textContent = 'Non';

      const yesBtn = document.createElement('button');
      yesBtn.type = 'button';
      yesBtn.className = 'jeux-confirm-btn';
      yesBtn.textContent = 'Oui';

      // L'ordre Oui / Non est tiré au hasard à chaque bulle.
      if (Math.random() < 0.5) {
        actions.append(noBtn, yesBtn);
      } else {
        actions.append(yesBtn, noBtn);
      }

      bubble.append(question, actions);
      backdrop.appendChild(bubble);
      document.body.appendChild(backdrop);

      let finished = false;

      function finish(answer) {
        if (finished) return;
        finished = true;
        document.removeEventListener('keydown', onKeyDown);
        backdrop.remove();
        resolve(answer);
      }

      function onKeyDown(event) {
        if (event.key === 'Escape') finish(false);
      }

      noBtn.addEventListener('click', () => finish(false));
      yesBtn.addEventListener('click', () => finish(true));

      backdrop.addEventListener('click', event => {
        if (event.target === backdrop) finish(false);
      });

      document.addEventListener('keydown', onKeyDown);

      // Le focus va sur la bulle, pas sur Oui ou Non :
      // aucun bouton n'est visuellement favorisé à l'ouverture.
      bubble.focus();
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
      img.src = freshMathasImageUrl(app.image);
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
