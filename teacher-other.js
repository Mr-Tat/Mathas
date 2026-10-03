(() => {
  const cfg = window.MATHAS_CONFIG;

  if (!window.supabase || !cfg?.supabase?.url || !cfg?.supabase?.publishableKey) {
    document.body.innerHTML = '<p style="padding:2rem;color:white">Configuration Supabase introuvable.</p>';
    return;
  }

  const client = window.supabase.createClient(cfg.supabase.url, cfg.supabase.publishableKey);

  const IMAGE_BUCKET = 'mathas-images';
  const IMAGE_FOLDER = 'miniatures';
  const IMAGE_FOLDERS = ['miniatures', 'logos', 'backgrounds', 'interface', 'illustrations', 'autres'];
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

  const STANDARD_LEVELS = {
    objectif: 'Objectif',
    depassement: 'Dépassement',
    revision: 'Révision',
    outil: 'Outils',
    jeux: 'Jeux'
  };
  const SIMPLE_LEVELS = {
    niveau1: 'Niveau 1',
    niveau2: 'Niveau 2',
    niveau3: 'Niveau 3',
    autre: 'Autre'
  };

  const VIEWS = {
    '2eco': {
      kind: 'class', slug: '2eco', title: '2 ECO', mode: 'standard', daily: true,
      hint: 'Classe indépendante, mais avec le même fonctionnement qu’Observation / Phase 1 / Phase 2 : Sélection du jour, Objectif, Dépassement, Révision, Outils et Jeux.',
      url: 'index.html?classe=2eco'
    },
    'partage-n1': {
      kind: 'share', slug: 'partage-n1', title: 'Partage Niveau 1', mode: 'simple', daily: false,
      hint: 'Page de partage indépendante. Le visiteur voit simplement “Partage”. Le lien peut être remplacé à tout moment.'
    },
    'partage-n2': {
      kind: 'share', slug: 'partage-n2', title: 'Partage Niveau 2', mode: 'simple', daily: false,
      hint: 'Page de partage indépendante. Le visiteur voit simplement “Partage”. Le lien peut être remplacé à tout moment.'
    },
    thibault: {
      kind: 'class', slug: 'thibault', title: 'Thibault', mode: 'simple', daily: false,
      hint: 'Page indépendante avec Niveau 1, Niveau 2, Niveau 3 et Autre. Les scores sont affichés sur la page élève.',
      url: 'index.html?classe=thibault'
    },
    lise: {
      kind: 'class', slug: 'lise', title: 'Lise', mode: 'simple', daily: false,
      hint: 'Page indépendante avec Niveau 1, Niveau 2, Niveau 3 et Autre. Les scores sont affichés sur la page élève.',
      url: 'index.html?classe=lise'
    }
  };

  const loginPanel = document.getElementById('loginPanel');
  const teacherPanel = document.getElementById('teacherPanel');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const panelMessage = document.getElementById('panelMessage');

  const specialManager = document.getElementById('specialManager');
  const specialTitle = document.getElementById('specialTitle');
  const specialHint = document.getElementById('specialHint');
  const specialSearchInput = document.getElementById('specialSearchInput');
  const specialLegend = document.getElementById('specialLegend');
  const specialAppList = document.getElementById('specialAppList');
  const shareLinkPanel = document.getElementById('shareLinkPanel');
  const shareLinkInput = document.getElementById('shareLinkInput');
  const imageManager = document.getElementById('imageManager');

  const appDialog = document.getElementById('appDialog');
  const appForm = document.getElementById('appForm');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogMessage = document.getElementById('dialogMessage');
  const deleteAppBtn = document.getElementById('deleteAppBtn');
  const newAppNote = document.getElementById('newAppNote');
  const imageDropZone = document.getElementById('imageDropZone');
  const appImageFile = document.getElementById('appImageFile');
  const imageDropPrompt = document.getElementById('imageDropPrompt');
  const imagePreviewWrap = document.getElementById('imagePreviewWrap');
  const imagePreview = document.getElementById('imagePreview');
  const imagePreviewName = document.getElementById('imagePreviewName');
  const imagePreviewStatus = document.getElementById('imagePreviewStatus');
  const clearImageBtn = document.getElementById('clearImageBtn');
  const copyImageUrlBtn = document.getElementById('copyImageUrlBtn');
  const appThumbInput = document.getElementById('appThumbInput');

  const existingAppDialog = document.getElementById('existingAppDialog');
  const existingAppForm = document.getElementById('existingAppForm');
  const existingAppGrid = document.getElementById('existingAppGrid');
  const existingMessage = document.getElementById('existingMessage');
  const confirmExistingBtn = document.getElementById('confirmExistingBtn');

  const bulkImageFolder = document.getElementById('bulkImageFolder');
  const bulkImageDropZone = document.getElementById('bulkImageDropZone');
  const bulkImageFiles = document.getElementById('bulkImageFiles');
  const bulkImageSelection = document.getElementById('bulkImageSelection');
  const imageSearchInput = document.getElementById('imageSearchInput');
  const imageFolderFilter = document.getElementById('imageFolderFilter');
  const imageGallery = document.getElementById('imageGallery');

  const usageDialog = document.getElementById('usageDialog');
  const usageForm = document.getElementById('usageForm');
  const usageImageName = document.getElementById('usageImageName');
  const usageList = document.getElementById('usageList');
  const usageKind = document.getElementById('usageKind');
  const usageLabel = document.getElementById('usageLabel');
  const usageMessage = document.getElementById('usageMessage');

  let currentViewKey = null;
  let classRows = [];
  let appRows = [];
  let classAppRows = [];
  let sharePages = [];
  let shareAppRows = [];
  let imageUsageRows = [];
  let storageImages = [];

  let selectedExistingAppId = null;
  let selectedImageFile = null;
  let selectedImageObjectUrl = null;
  let appDialogMode = 'edit';
  let selectedBulkFiles = [];
  let currentUsageImage = null;

  init();

  async function init() {
    const { data: { session } } = await client.auth.getSession();
    if (session) await showTeacherPanel();
    else showLogin();

    client.auth.onAuthStateChange(async (_event, sessionNow) => {
      if (sessionNow) await showTeacherPanel();
      else showLogin();
    });
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    setMessage(loginMessage, 'Connexion…');
    const { error } = await client.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    });
    if (error) setMessage(loginMessage, 'Connexion refusée. Vérifie l’adresse et le mot de passe.', 'error');
    else setMessage(loginMessage, '');
  });

  document.getElementById('logoutBtnTop').addEventListener('click', () => client.auth.signOut());

  document.querySelectorAll('[data-other-view]').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentViewKey = btn.dataset.otherView;
      document.querySelectorAll('[data-other-view]').forEach(x => x.classList.toggle('active', x === btn));
      if (currentViewKey === 'images') {
        showImagesView();
        await loadImages();
      } else {
        showSpecialView();
      }
    });
  });

  document.getElementById('specialRefreshBtn').addEventListener('click', loadData);
  document.getElementById('addExistingBtn').addEventListener('click', openExistingDialog);
  document.getElementById('addSpecificBtn').addEventListener('click', () => openAppDialog(null, 'specific'));
  specialSearchInput.addEventListener('input', renderSpecialApps);

  document.getElementById('copyShareLinkBtn').addEventListener('click', async () => {
    if (!shareLinkInput.value) return;
    await copyText(shareLinkInput.value);
    setMessage(panelMessage, 'Lien de partage copié.', 'success');
  });

  document.getElementById('rotateShareLinkBtn').addEventListener('click', async () => {
    const view = currentView();
    if (!view || view.kind !== 'share') return;
    const page = sharePageForView(view);
    if (!page) return;
    if (!confirm('Changer le lien de partage ?\n\nL’ancien lien cessera immédiatement de fonctionner. Un nouveau lien sera créé.')) return;

    const token = createSecureToken();
    const { error } = await client
      .from('share_pages')
      .update({ token, updated_at: new Date().toISOString() })
      .eq('id', page.id);

    if (error) return setMessage(panelMessage, `Erreur : ${error.message}`, 'error');
    page.token = token;
    renderShareLink();
    await copyText(shareLinkInput.value);
    setMessage(panelMessage, 'Nouveau lien créé. L’ancien est inactif. Le nouveau lien a été copié.', 'success');
  });

  document.getElementById('closeDialogBtn').addEventListener('click', closeAppDialog);
  document.getElementById('cancelDialogBtn').addEventListener('click', closeAppDialog);
  appForm.addEventListener('submit', async event => {
    event.preventDefault();
    await saveApp();
  });
  deleteAppBtn.addEventListener('click', async () => {
    const id = Number(document.getElementById('editAppId').value);
    const app = appRows.find(row => row.id === id);
    if (!app) return;
    if (!confirm(`Supprimer « ${app.nom} » partout ?\n\nSi elle est utilisée dans une autre page spéciale, elle y disparaîtra aussi.`)) return;
    await deleteAppEverywhere(app);
  });

  imageDropZone.addEventListener('click', () => appImageFile.click());
  imageDropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      appImageFile.click();
    }
  });
  appImageFile.addEventListener('change', () => {
    const file = appImageFile.files?.[0];
    if (file) selectImageFile(file);
  });
  ['dragenter', 'dragover'].forEach(name => imageDropZone.addEventListener(name, event => {
    event.preventDefault();
    imageDropZone.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach(name => imageDropZone.addEventListener(name, event => {
    event.preventDefault();
    imageDropZone.classList.remove('drag-over');
  }));
  imageDropZone.addEventListener('drop', event => {
    const file = event.dataTransfer?.files?.[0];
    if (file) selectImageFile(file);
  });
  clearImageBtn.addEventListener('click', () => {
    clearSelectedImage();
    const url = appThumbInput.value.trim();
    if (url) showImagePreviewFromUrl(url);
    else showEmptyImageDropZone();
  });
  copyImageUrlBtn.addEventListener('click', async () => {
    const url = appThumbInput.value.trim();
    if (!url) return setMessage(dialogMessage, 'Aucune URL à copier.', 'error');
    await copyText(url);
    setMessage(dialogMessage, 'URL copiée.', 'success');
  });

  document.getElementById('closeExistingDialogBtn').addEventListener('click', closeExistingDialog);
  document.getElementById('cancelExistingBtn').addEventListener('click', closeExistingDialog);
  existingAppForm.addEventListener('submit', async event => {
    event.preventDefault();
    await addExistingApp();
  });

  document.getElementById('refreshImagesBtn').addEventListener('click', loadImages);
  imageSearchInput.addEventListener('input', renderImageGallery);
  imageFolderFilter.addEventListener('change', renderImageGallery);

  bulkImageDropZone.addEventListener('click', () => bulkImageFiles.click());
  bulkImageDropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      bulkImageFiles.click();
    }
  });
  bulkImageFiles.addEventListener('change', () => selectBulkFiles([...bulkImageFiles.files]));
  ['dragenter', 'dragover'].forEach(name => bulkImageDropZone.addEventListener(name, event => {
    event.preventDefault();
    bulkImageDropZone.classList.add('drag-over');
  }));
  ['dragleave', 'drop'].forEach(name => bulkImageDropZone.addEventListener(name, event => {
    event.preventDefault();
    bulkImageDropZone.classList.remove('drag-over');
  }));
  bulkImageDropZone.addEventListener('drop', event => selectBulkFiles([...event.dataTransfer.files]));
  document.getElementById('uploadBulkImagesBtn').addEventListener('click', uploadBulkImages);

  document.getElementById('closeUsageDialogBtn').addEventListener('click', closeUsageDialog);
  document.getElementById('closeUsageBtn').addEventListener('click', closeUsageDialog);
  usageForm.addEventListener('submit', async event => {
    event.preventDefault();
    await addManualUsage();
  });

  async function showTeacherPanel() {
    loginPanel.classList.add('hidden');
    teacherPanel.classList.remove('hidden');
    document.getElementById('logoutBtnTop').classList.remove('hidden');
    await loadData();
  }

  function showLogin() {
    teacherPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
    document.getElementById('logoutBtnTop').classList.add('hidden');
  }

  async function loadData() {
    setMessage(panelMessage, 'Chargement…');
    const [classesRes, appsRes, classLinksRes, sharePagesRes, shareLinksRes, usageRes] = await Promise.all([
      client.from('classes').select('id,slug,nom').order('id'),
      client.from('applications').select('id,nom,url,miniature_url,description,actif,special_only').eq('actif', true).order('nom'),
      client.from('class_applications').select('class_id,application_id,visible,du_jour,niveau,domaine,ordre'),
      client.from('share_pages').select('id,slug,admin_name,public_name,token,updated_at').order('id'),
      client.from('share_page_applications').select('page_id,application_id,visible,niveau,ordre'),
      client.from('image_usages').select('id,image_path,kind,label,created_at').order('id')
    ]);

    const error = classesRes.error || appsRes.error || classLinksRes.error || sharePagesRes.error || shareLinksRes.error || usageRes.error;
    if (error) {
      console.error(error);
      setMessage(panelMessage, 'Impossible de charger les nouvelles données. Exécute d’abord le script SQL de migration.', 'error');
      return;
    }

    classRows = classesRes.data || [];
    appRows = appsRes.data || [];
    classAppRows = classLinksRes.data || [];
    sharePages = sharePagesRes.data || [];
    shareAppRows = shareLinksRes.data || [];
    imageUsageRows = usageRes.data || [];
    setMessage(panelMessage, '');

    if (currentViewKey === 'images') {
      await loadImages();
    } else if (currentViewKey) {
      showSpecialView();
    }
  }

  function currentView() {
    return VIEWS[currentViewKey] || null;
  }

  function showSpecialView() {
    const view = currentView();
    if (!view) return;
    imageManager.classList.add('hidden');
    specialManager.classList.remove('hidden');
    specialAppList.classList.remove('hidden');
    specialTitle.textContent = view.title;
    specialHint.textContent = view.hint;
    shareLinkPanel.classList.toggle('hidden', view.kind !== 'share');
    specialLegend.innerHTML = view.mode === 'standard'
      ? '<span><b>Visible</b> : apparaît dans 2 ECO</span><span><b>Du jour</b> : Sélection du jour</span><span><b>Niveau</b> : Objectif / Dépassement / Révision / Outils / Jeux</span>'
      : '<span><b>Visible</b> : apparaît sur la page</span><span><b>Niveau</b> : Niveau 1 / 2 / 3 / Autre</span>';
    renderShareLink();
    renderSpecialApps();
  }

  function showImagesView() {
    specialManager.classList.add('hidden');
    specialAppList.classList.add('hidden');
    imageManager.classList.remove('hidden');
  }

  function sharePageForView(view) {
    if (!view || view.kind !== 'share') return null;
    return sharePages.find(page => page.slug === view.slug) || null;
  }

  function renderShareLink() {
    const view = currentView();
    if (!view || view.kind !== 'share') return;
    const page = sharePageForView(view);
    if (!page) {
      shareLinkInput.value = '';
      setMessage(panelMessage, `La page ${view.title} est introuvable dans Supabase.`, 'error');
      return;
    }
    shareLinkInput.value = buildShareUrl(page.token);
  }

  function buildShareUrl(token) {
    const url = new URL('index.html', location.href);
    url.search = '';
    url.searchParams.set('partage', token);
    return url.toString();
  }

  function targetInfo() {
    const view = currentView();
    if (!view) return null;
    if (view.kind === 'class') {
      const cls = classRows.find(row => row.slug === view.slug);
      return cls ? { kind: 'class', id: cls.id, view } : null;
    }
    const page = sharePageForView(view);
    return page ? { kind: 'share', id: page.id, view } : null;
  }

  function targetLinks(target) {
    if (!target) return [];
    if (target.kind === 'class') return classAppRows.filter(row => row.class_id === target.id);
    return shareAppRows.filter(row => row.page_id === target.id);
  }

  function renderSpecialApps() {
    const target = targetInfo();
    specialAppList.innerHTML = '';
    if (!target) {
      specialAppList.innerHTML = '<p class="muted">Page introuvable.</p>';
      return;
    }

    const q = specialSearchInput.value.trim().toLowerCase();
    const links = targetLinks(target);
    const rows = links
      .map(link => ({ app: appRows.find(app => app.id === link.application_id), link }))
      .filter(row => row.app)
      .filter(({ app }) => !q || app.nom.toLowerCase().includes(q) || (app.url || '').toLowerCase().includes(q))
      .sort((a, b) => Number(a.link.ordre || 0) - Number(b.link.ordre || 0) || a.app.nom.localeCompare(b.app.nom, 'fr'));

    if (!rows.length) {
      specialAppList.innerHTML = '<p class="muted empty-admin">Aucune application dans cette page. Utilise “Ajouter appli existante” ou “Ajouter appli spécifique”.</p>';
      return;
    }

    rows.forEach(({ app, link }) => specialAppList.appendChild(makeSpecialRow(target, app, link)));
  }

  function makeSpecialRow(target, app, link) {
    const row = document.createElement('article');
    row.className = 'app-row special-app-row';
    row.appendChild(makeThumb(app));

    const info = document.createElement('div');
    info.className = 'app-info';
    const titleLine = document.createElement('div');
    titleLine.className = 'app-title-line';
    const name = document.createElement('strong');
    name.textContent = app.nom;
    titleLine.appendChild(name);
    if (app.special_only) {
      const badge = document.createElement('span');
      badge.className = 'share-only-badge';
      badge.textContent = 'Spécifique';
      titleLine.appendChild(badge);
    }
    const url = document.createElement('span');
    url.textContent = app.url || '';
    info.append(titleLine, url);
    row.appendChild(info);

    const levels = target.view.mode === 'standard' ? STANDARD_LEVELS : SIMPLE_LEVELS;
    const level = fieldSelect('Niveau', levels, levels[link.niveau] ? link.niveau : Object.keys(levels)[0]);
    level.select.addEventListener('change', () => updateTargetLink(target, link, { niveau: level.select.value }, () => {
      level.select.value = levels[link.niveau] ? link.niveau : Object.keys(levels)[0];
    }));
    row.appendChild(level.wrap);

    const visible = checkboxField('Visible', link.visible !== false);
    visible.input.addEventListener('change', () => updateTargetLink(target, link, { visible: visible.input.checked }, () => {
      visible.input.checked = link.visible !== false;
    }));
    row.appendChild(visible.wrap);

    if (target.view.daily && target.kind === 'class') {
      const daily = checkboxField('Du jour', link.du_jour === true);
      daily.input.addEventListener('change', () => updateTargetLink(target, link, { du_jour: daily.input.checked }, () => {
        daily.input.checked = link.du_jour === true;
      }));
      row.appendChild(daily.wrap);
    } else {
      const spacer = document.createElement('div');
      spacer.className = 'row-spacer-field';
      row.appendChild(spacer);
    }

    const order = numberField('Ordre', link.ordre ?? 0);
    let orderTimer = null;
    const saveOrder = () => {
      if (orderTimer) clearTimeout(orderTimer);
      const value = Number(order.input.value) || 0;
      if (value === Number(link.ordre || 0)) return;
      updateTargetLink(target, link, { ordre: value }, () => { order.input.value = link.ordre ?? 0; });
    };
    order.input.addEventListener('input', () => {
      if (orderTimer) clearTimeout(orderTimer);
      orderTimer = setTimeout(saveOrder, 600);
    });
    order.input.addEventListener('change', saveOrder);
    row.appendChild(order.wrap);

    const actions = document.createElement('div');
    actions.className = 'special-row-actions';
    const modify = button('Modifier', 'secondary small-btn');
    modify.addEventListener('click', () => openAppDialog(app, 'edit'));
    const remove = button('Retirer', 'remove-share-btn small-btn');
    remove.addEventListener('click', () => removeFromCurrentPage(target, app, link));
    actions.append(modify, remove);
    if (app.special_only) {
      const del = button('Supprimer', 'danger-lite small-btn');
      del.addEventListener('click', async () => {
        if (!confirm(`Supprimer définitivement « ${app.nom} » ?\n\nElle disparaîtra de toutes les pages spéciales où elle est éventuellement utilisée.`)) return;
        await deleteAppEverywhere(app);
      });
      actions.appendChild(del);
    }
    row.appendChild(actions);
    return row;
  }

  async function updateTargetLink(target, link, updates, onError) {
    let query;
    if (target.kind === 'class') {
      query = client.from('class_applications').update(updates).eq('class_id', target.id).eq('application_id', link.application_id);
    } else {
      const safeUpdates = { ...updates };
      delete safeUpdates.du_jour;
      query = client.from('share_page_applications').update(safeUpdates).eq('page_id', target.id).eq('application_id', link.application_id);
    }
    const { error } = await query;
    if (error) {
      console.error(error);
      if (onError) onError();
      setMessage(panelMessage, `Erreur d’enregistrement : ${error.message}`, 'error');
      return false;
    }
    Object.assign(link, updates);
    setMessage(panelMessage, '');
    return true;
  }

  async function removeFromCurrentPage(target, app, link) {
    if (!confirm(`Retirer « ${app.nom} » de ${target.view.title} ?\n\nL’application elle-même ne sera pas supprimée.`)) return;
    const table = target.kind === 'class' ? 'class_applications' : 'share_page_applications';
    let query = client.from(table).delete().eq('application_id', app.id);
    query = target.kind === 'class' ? query.eq('class_id', target.id) : query.eq('page_id', target.id);
    const { error } = await query;
    if (error) return setMessage(panelMessage, `Erreur : ${error.message}`, 'error');
    if (target.kind === 'class') classAppRows = classAppRows.filter(row => !(row.class_id === target.id && row.application_id === app.id));
    else shareAppRows = shareAppRows.filter(row => !(row.page_id === target.id && row.application_id === app.id));
    renderSpecialApps();
  }

  function openExistingDialog() {
    const target = targetInfo();
    if (!target) return;
    selectedExistingAppId = null;
    confirmExistingBtn.disabled = true;
    setMessage(existingMessage, '');
    existingAppGrid.innerHTML = '';
    document.getElementById('existingDialogTitle').textContent = `Ajouter une appli à ${target.view.title}`;

    const linkedIds = new Set(targetLinks(target).map(row => row.application_id));
    const candidates = appRows.filter(app => !linkedIds.has(app.id)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

    if (!candidates.length) {
      existingAppGrid.innerHTML = '<p class="muted share-picker-empty">Toutes les applications existantes sont déjà présentes ici.</p>';
    } else {
      candidates.forEach(app => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'existing-share-card';
        const thumb = document.createElement('span');
        thumb.className = 'existing-share-thumb';
        if (app.miniature_url) {
          const img = document.createElement('img');
          img.src = app.miniature_url;
          img.alt = '';
          thumb.appendChild(img);
        } else thumb.textContent = (app.nom || 'M').charAt(0).toUpperCase();
        const name = document.createElement('span');
        name.className = 'existing-share-name';
        name.textContent = app.nom;
        card.append(thumb, name);
        card.addEventListener('click', () => {
          selectedExistingAppId = app.id;
          existingAppGrid.querySelectorAll('.existing-share-card').forEach(x => x.classList.remove('selected'));
          card.classList.add('selected');
          confirmExistingBtn.disabled = false;
        });
        existingAppGrid.appendChild(card);
      });
    }
    existingAppDialog.showModal();
  }

  function closeExistingDialog() {
    selectedExistingAppId = null;
    if (existingAppDialog.open) existingAppDialog.close();
  }

  async function addExistingApp() {
    const target = targetInfo();
    if (!target || !selectedExistingAppId) return;
    confirmExistingBtn.disabled = true;
    const links = targetLinks(target);
    const maxOrder = links.reduce((max, row) => Math.max(max, Number(row.ordre) || 0), 0);
    let payload;
    let table;
    if (target.kind === 'class') {
      table = 'class_applications';
      payload = {
        class_id: target.id,
        application_id: selectedExistingAppId,
        visible: true,
        du_jour: false,
        niveau: target.view.mode === 'standard' ? 'objectif' : 'niveau1',
        domaine: 'calcul',
        ordre: maxOrder + 10
      };
    } else {
      table = 'share_page_applications';
      payload = {
        page_id: target.id,
        application_id: selectedExistingAppId,
        visible: true,
        niveau: 'niveau1',
        ordre: maxOrder + 10
      };
    }
    const { data, error } = await client.from(table).insert(payload).select().single();
    if (error) {
      confirmExistingBtn.disabled = false;
      return setMessage(existingMessage, `Erreur : ${error.message}`, 'error');
    }
    if (target.kind === 'class') classAppRows.push(data);
    else shareAppRows.push(data);
    closeExistingDialog();
    renderSpecialApps();
    setMessage(panelMessage, 'Application ajoutée.', 'success');
  }

  function openAppDialog(app = null, mode = 'edit') {
    appDialogMode = app ? 'edit' : mode;
    appForm.reset();
    clearSelectedImage();
    setMessage(dialogMessage, '');
    const editId = document.getElementById('editAppId');

    if (app) {
      dialogTitle.textContent = 'Modifier une application';
      editId.value = app.id;
      document.getElementById('appNameInput').value = app.nom || '';
      document.getElementById('appUrlInput').value = app.url || '';
      appThumbInput.value = app.miniature_url || '';
      document.getElementById('appDescriptionInput').value = app.description || '';
      deleteAppBtn.classList.remove('hidden');
      newAppNote.textContent = 'Cette fiche d’application est commune : si elle est utilisée ailleurs, son nom, son URL et sa miniature y seront également modifiés.';
      if (app.miniature_url) showImagePreviewFromUrl(app.miniature_url);
      else showEmptyImageDropZone();
    } else {
      const view = currentView();
      dialogTitle.textContent = `Ajouter une appli spécifique à ${view?.title || 'cette page'}`;
      editId.value = '';
      appThumbInput.value = '';
      deleteAppBtn.classList.add('hidden');
      newAppNote.textContent = `Cette nouvelle application sera créée uniquement pour ${view?.title || 'cette page'}. Elle ne sera pas ajoutée au GLOBAL.`;
      showEmptyImageDropZone();
    }
    appDialog.showModal();
  }

  function closeAppDialog() {
    clearSelectedImage();
    if (appDialog.open) appDialog.close();
  }

  async function saveApp() {
    const idValue = document.getElementById('editAppId').value;
    const appId = idValue ? Number(idValue) : null;
    const existing = appId ? appRows.find(row => row.id === appId) : null;
    const previousImageUrl = existing?.miniature_url || null;
    let uploadedImagePath = null;
    const payload = {
      nom: document.getElementById('appNameInput').value.trim(),
      url: document.getElementById('appUrlInput').value.trim(),
      miniature_url: appThumbInput.value.trim() || null,
      description: document.getElementById('appDescriptionInput').value.trim() || null,
      actif: true
    };
    if (!appId) payload.special_only = true;
    if (!payload.nom || !payload.url) return setMessage(dialogMessage, 'Le nom et l’URL sont obligatoires.', 'error');

    const saveBtn = document.getElementById('saveAppBtn');
    saveBtn.disabled = true;
    try {
      if (selectedImageFile) {
        setMessage(dialogMessage, 'Envoi de la miniature…');
        const upload = await uploadImageForApp(selectedImageFile, payload.nom);
        uploadedImagePath = upload.path;
        payload.miniature_url = upload.publicUrl;
        appThumbInput.value = upload.publicUrl;
      }

      if (appId) {
        const { error } = await client.from('applications').update(payload).eq('id', appId);
        if (error) throw error;
        if (uploadedImagePath && previousImageUrl && previousImageUrl !== payload.miniature_url) await removeStorageImageFromPublicUrl(previousImageUrl);
      } else {
        const target = targetInfo();
        if (!target) throw new Error('Aucune page sélectionnée.');
        const { data: created, error: createError } = await client.from('applications').insert(payload).select().single();
        if (createError) throw createError;
        const maxOrder = targetLinks(target).reduce((max, row) => Math.max(max, Number(row.ordre) || 0), 0);
        if (target.kind === 'class') {
          const { data: link, error } = await client.from('class_applications').insert({
            class_id: target.id, application_id: created.id, visible: true, du_jour: false,
            niveau: target.view.mode === 'standard' ? 'objectif' : 'niveau1', domaine: 'calcul', ordre: maxOrder + 10
          }).select().single();
          if (error) throw error;
          classAppRows.push(link);
        } else {
          const { data: link, error } = await client.from('share_page_applications').insert({
            page_id: target.id, application_id: created.id, visible: true, niveau: 'niveau1', ordre: maxOrder + 10
          }).select().single();
          if (error) throw error;
          shareAppRows.push(link);
        }
        appRows.push(created);
      }

      await loadData();
      setTimeout(closeAppDialog, 450);
    } catch (error) {
      console.error(error);
      if (uploadedImagePath && !appId) await client.storage.from(IMAGE_BUCKET).remove([uploadedImagePath]);
      setMessage(dialogMessage, `Erreur : ${error.message || 'enregistrement impossible'}`, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function deleteAppEverywhere(app) {
    try {
      await client.from('application_categories').delete().eq('application_id', app.id);
      await client.from('class_applications').delete().eq('application_id', app.id);
      await client.from('share_page_applications').delete().eq('application_id', app.id);
      const { error } = await client.from('applications').delete().eq('id', app.id);
      if (error) throw error;
      await removeStorageImageFromPublicUrl(app.miniature_url);
      closeAppDialog();
      await loadData();
      setMessage(panelMessage, `« ${app.nom} » supprimée partout.`, 'success');
    } catch (error) {
      console.error(error);
      setMessage(dialogMessage, `Erreur : ${error.message}`, 'error');
    }
  }

  function selectImageFile(file) {
    if (!file.type?.startsWith('image/')) return setMessage(dialogMessage, 'Choisis un fichier image.', 'error');
    if (file.size > MAX_IMAGE_BYTES) return setMessage(dialogMessage, 'L’image dépasse 10 Mo.', 'error');
    clearSelectedImage();
    selectedImageFile = file;
    selectedImageObjectUrl = URL.createObjectURL(file);
    imagePreview.src = selectedImageObjectUrl;
    imagePreviewName.textContent = file.name;
    imagePreviewStatus.textContent = `${formatFileSize(file.size)} — prête`;
    imageDropPrompt.classList.add('hidden');
    imagePreviewWrap.classList.remove('hidden');
    clearImageBtn.classList.remove('hidden');
  }

  function clearSelectedImage() {
    if (selectedImageObjectUrl) URL.revokeObjectURL(selectedImageObjectUrl);
    selectedImageFile = null;
    selectedImageObjectUrl = null;
    appImageFile.value = '';
    clearImageBtn.classList.add('hidden');
  }

  function showEmptyImageDropZone() {
    imagePreview.removeAttribute('src');
    imagePreviewWrap.classList.add('hidden');
    imageDropPrompt.classList.remove('hidden');
  }

  function showImagePreviewFromUrl(url) {
    imagePreview.src = url;
    imagePreviewName.textContent = 'Miniature actuelle';
    imagePreviewStatus.textContent = 'URL enregistrée';
    imageDropPrompt.classList.add('hidden');
    imagePreviewWrap.classList.remove('hidden');
  }

  async function uploadImageForApp(file, appName) {
    return uploadStorageImage(file, IMAGE_FOLDER, slugify(appName) || 'application');
  }

  async function uploadStorageImage(file, folder, baseName = null) {
    const extension = getImageExtension(file);
    const safeName = baseName || slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
    const path = `${folder}/${safeName}-${Date.now()}-${cryptoRandomPart()}.${extension}`;
    const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type || undefined
    });
    if (error) throw error;
    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('URL publique introuvable.');
    return { path, publicUrl: data.publicUrl };
  }

  async function removeStorageImageFromPublicUrl(url) {
    const path = getStoragePathFromPublicUrl(url);
    if (!path) return;
    const { error } = await client.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) console.warn(error);
  }

  function selectBulkFiles(files) {
    const valid = files.filter(file => file.type?.startsWith('image/') && file.size <= MAX_IMAGE_BYTES);
    selectedBulkFiles = valid;
    bulkImageFiles.value = '';
    bulkImageSelection.textContent = valid.length
      ? `${valid.length} image${valid.length > 1 ? 's' : ''} sélectionnée${valid.length > 1 ? 's' : ''}`
      : 'Aucune image valide sélectionnée';
    if (files.length !== valid.length) setMessage(panelMessage, 'Certains fichiers ont été ignorés : ils ne sont pas des images ou dépassent 10 Mo.', 'error');
  }

  async function uploadBulkImages() {
    if (!selectedBulkFiles.length) return setMessage(panelMessage, 'Sélectionne au moins une image.', 'error');
    const btn = document.getElementById('uploadBulkImagesBtn');
    btn.disabled = true;
    const folder = bulkImageFolder.value;
    let success = 0;
    try {
      for (let i = 0; i < selectedBulkFiles.length; i += 1) {
        setMessage(panelMessage, `Envoi ${i + 1}/${selectedBulkFiles.length}…`);
        await uploadStorageImage(selectedBulkFiles[i], folder);
        success += 1;
      }
      selectedBulkFiles = [];
      bulkImageSelection.textContent = 'Aucun fichier sélectionné';
      setMessage(panelMessage, `${success} image${success > 1 ? 's' : ''} envoyée${success > 1 ? 's' : ''}.`, 'success');
      await loadImages();
    } catch (error) {
      console.error(error);
      setMessage(panelMessage, `Envoi interrompu après ${success} image(s) : ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function loadImages() {
    if (currentViewKey !== 'images') return;
    setMessage(panelMessage, 'Chargement des images…');
    try {
      const results = await Promise.all(IMAGE_FOLDERS.map(async folder => {
        const { data, error } = await client.storage.from(IMAGE_BUCKET).list(folder, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw error;
        return (data || [])
          .filter(item => item?.name && item.name !== '.emptyFolderPlaceholder')
          .map(item => {
            const path = `${folder}/${item.name}`;
            const { data: pub } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
            return { folder, path, name: item.name, publicUrl: pub.publicUrl, metadata: item.metadata || {} };
          });
      }));
      storageImages = results.flat();

      const { data: usages, error: usageError } = await client.from('image_usages').select('id,image_path,kind,label,created_at').order('id');
      if (usageError) throw usageError;
      imageUsageRows = usages || [];
      setMessage(panelMessage, '');
      renderImageGallery();
    } catch (error) {
      console.error(error);
      setMessage(panelMessage, `Impossible de charger la bibliothèque d’images : ${error.message}`, 'error');
    }
  }

  function automaticMUsages(path) {
    return appRows
      .filter(app => getStoragePathFromPublicUrl(app.miniature_url) === path)
      .map(app => ({ kind: 'M', label: `Miniature — ${app.nom}`, automatic: true }));
  }

  function manualUsages(path) {
    return imageUsageRows.filter(row => row.image_path === path);
  }

  function usageSummary(path) {
    const auto = automaticMUsages(path);
    const manual = manualUsages(path);
    return {
      hasM: auto.length > 0 || manual.some(row => row.kind === 'M'),
      hasA: manual.some(row => row.kind === 'A'),
      auto,
      manual
    };
  }

  function renderImageGallery() {
    imageGallery.innerHTML = '';
    const q = imageSearchInput.value.trim().toLowerCase();
    const folder = imageFolderFilter.value;
    const images = storageImages.filter(image => {
      const matchesFolder = folder === 'all' || image.folder === folder;
      const matchesSearch = !q || image.name.toLowerCase().includes(q) || image.folder.toLowerCase().includes(q);
      return matchesFolder && matchesSearch;
    });

    if (!images.length) {
      imageGallery.innerHTML = '<p class="muted empty-admin">Aucune image dans cette sélection.</p>';
      return;
    }

    images.forEach(image => imageGallery.appendChild(makeImageCard(image)));
  }

  function makeImageCard(image) {
    const card = document.createElement('article');
    card.className = 'image-library-card';
    const preview = document.createElement('div');
    preview.className = 'image-library-preview';
    const img = document.createElement('img');
    img.src = image.publicUrl;
    img.alt = image.name;
    img.loading = 'lazy';
    preview.appendChild(img);

    const badges = document.createElement('div');
    badges.className = 'image-usage-badges';
    const summary = usageSummary(image.path);
    if (summary.hasM) badges.appendChild(makeUsageBadge('M', image));
    if (summary.hasA) badges.appendChild(makeUsageBadge('A', image));
    preview.appendChild(badges);

    const meta = document.createElement('div');
    meta.className = 'image-library-meta';
    const name = document.createElement('strong');
    name.textContent = image.name;
    const folder = document.createElement('span');
    folder.textContent = image.folder;
    meta.append(name, folder);

    const actions = document.createElement('div');
    actions.className = 'image-library-actions';
    const usage = button('Utilisations', 'secondary tiny-btn');
    usage.addEventListener('click', () => openUsageDialog(image));
    const copy = button('Copier URL', 'secondary tiny-btn');
    copy.addEventListener('click', async () => {
      await copyText(image.publicUrl);
      setMessage(panelMessage, 'URL copiée.', 'success');
    });
    const open = document.createElement('a');
    open.className = 'secondary tiny-btn link-button';
    open.href = image.publicUrl;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'Ouvrir';
    const del = button('Supprimer', 'danger-lite tiny-btn');
    del.addEventListener('click', () => deleteLibraryImage(image));
    actions.append(usage, copy, open, del);

    card.append(preview, meta, actions);
    return card;
  }

  function makeUsageBadge(kind, image) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = `image-usage-badge badge-${kind.toLowerCase()}`;
    badge.textContent = kind;
    badge.title = kind === 'M' ? 'Utilisée dans Math’as / une application' : 'Utilisée ailleurs';
    badge.addEventListener('click', () => openUsageDialog(image));
    return badge;
  }

  async function deleteLibraryImage(image) {
    const summary = usageSummary(image.path);
    const details = [
      ...summary.auto.map(row => `M : ${row.label}`),
      ...summary.manual.map(row => `${row.kind} : ${row.label}`)
    ];
    let message = `Supprimer définitivement « ${image.name} » du Storage ?`;
    if (details.length) {
      message += `\n\nATTENTION : cette image est marquée comme utilisée :\n- ${details.join('\n- ')}\n\nLes endroits qui utilisent son URL pourront afficher une image cassée.`;
    } else {
      message += '\n\nElle n’est actuellement marquée comme utilisée nulle part.';
    }
    if (!confirm(message)) return;

    const { error } = await client.storage.from(IMAGE_BUCKET).remove([image.path]);
    if (error) return setMessage(panelMessage, `Erreur : ${error.message}`, 'error');
    await client.from('image_usages').delete().eq('image_path', image.path);
    await loadImages();
    setMessage(panelMessage, 'Image supprimée.', 'success');
  }

  function openUsageDialog(image) {
    currentUsageImage = image;
    usageImageName.textContent = image.name;
    usageKind.value = 'M';
    usageLabel.value = '';
    setMessage(usageMessage, '');
    renderUsageList();
    usageDialog.showModal();
  }

  function closeUsageDialog() {
    currentUsageImage = null;
    if (usageDialog.open) usageDialog.close();
  }

  function renderUsageList() {
    usageList.innerHTML = '';
    if (!currentUsageImage) return;
    const summary = usageSummary(currentUsageImage.path);
    const rows = [
      ...summary.auto.map(row => ({ ...row, id: null })),
      ...summary.manual.map(row => ({ ...row, automatic: false }))
    ];

    if (!rows.length) {
      usageList.innerHTML = '<p class="muted">Cette image n’est marquée comme utilisée nulle part.</p>';
      return;
    }

    rows.forEach(row => {
      const item = document.createElement('div');
      item.className = 'usage-item';
      const badge = document.createElement('span');
      badge.className = `image-usage-badge static badge-${row.kind.toLowerCase()}`;
      badge.textContent = row.kind;
      const label = document.createElement('span');
      label.textContent = row.label;
      item.append(badge, label);
      if (!row.automatic) {
        const del = button('×', 'icon-btn usage-delete');
        del.title = 'Supprimer cette indication';
        del.addEventListener('click', () => deleteManualUsage(row.id));
        item.appendChild(del);
      }
      usageList.appendChild(item);
    });
  }

  async function addManualUsage() {
    if (!currentUsageImage) return;
    const label = usageLabel.value.trim();
    if (!label) return setMessage(usageMessage, 'Indique où cette image est utilisée.', 'error');
    const payload = { image_path: currentUsageImage.path, kind: usageKind.value, label };
    const { data, error } = await client.from('image_usages').insert(payload).select().single();
    if (error) return setMessage(usageMessage, `Erreur : ${error.message}`, 'error');
    imageUsageRows.push(data);
    usageLabel.value = '';
    renderUsageList();
    renderImageGallery();
    setMessage(usageMessage, 'Utilisation ajoutée.', 'success');
  }

  async function deleteManualUsage(id) {
    const { error } = await client.from('image_usages').delete().eq('id', id);
    if (error) return setMessage(usageMessage, `Erreur : ${error.message}`, 'error');
    imageUsageRows = imageUsageRows.filter(row => row.id !== id);
    renderUsageList();
    renderImageGallery();
  }

  function getStoragePathFromPublicUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const prefix = `${cfg.supabase.url}/storage/v1/object/public/${IMAGE_BUCKET}/`;
    if (!url.startsWith(prefix)) return null;
    try { return decodeURIComponent(url.slice(prefix.length).split('?')[0]); }
    catch { return url.slice(prefix.length).split('?')[0]; }
  }

  function makeThumb(app) {
    const thumb = document.createElement('div');
    thumb.className = 'app-thumb-admin';
    if (app.miniature_url) {
      const img = document.createElement('img');
      img.src = app.miniature_url;
      img.alt = '';
      img.loading = 'lazy';
      thumb.appendChild(img);
    } else thumb.textContent = (app.nom || 'M').trim().charAt(0).toUpperCase();
    return thumb;
  }

  function checkboxField(label, checked) {
    const wrap = document.createElement('label');
    wrap.className = 'checkbox-field';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    const span = document.createElement('span');
    span.textContent = label;
    wrap.append(input, span);
    return { wrap, input };
  }

  function fieldSelect(label, values, selected) {
    const wrap = document.createElement('label');
    wrap.className = 'field-wrap';
    const lab = document.createElement('span');
    lab.className = 'field-label';
    lab.textContent = label;
    const select = document.createElement('select');
    Object.entries(values).forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    select.value = selected;
    wrap.append(lab, select);
    return { wrap, select };
  }

  function numberField(label, value) {
    const wrap = document.createElement('label');
    wrap.className = 'field-wrap order-wrap';
    const lab = document.createElement('span');
    lab.className = 'field-label';
    lab.textContent = label;
    const input = document.createElement('input');
    input.className = 'order-input';
    input.type = 'number';
    input.value = value;
    wrap.append(lab, input);
    return { wrap, input };
  }

  function button(text, className = 'secondary') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = text;
    return btn;
  }

  function setMessage(node, text, type = '') {
    node.textContent = text || '';
    node.classList.remove('error', 'success');
    if (type) node.classList.add(type);
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 70);
  }

  function getImageExtension(file) {
    const byName = file.name?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (byName && byName.length <= 5) return byName === 'jpeg' ? 'jpg' : byName;
    const mimeMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };
    return mimeMap[file.type] || 'png';
  }

  function cryptoRandomPart() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0].toString(36);
    }
    return Math.random().toString(36).slice(2, 10);
  }

  function createSecureToken() {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }
})();
