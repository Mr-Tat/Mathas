(() => {
  const cfg = window.MATHAS_CONFIG;

  if (!window.supabase || !cfg?.supabase?.url || !cfg?.supabase?.publishableKey) {
    document.body.innerHTML = '<p style="padding:2rem;color:white">Configuration Supabase introuvable.</p>';
    return;
  }

  const client = window.supabase.createClient(cfg.supabase.url, cfg.supabase.publishableKey);

  const CORE_SLUGS = ['observation', 'phase1', 'phase2', 'toutes'];
  const CORE_LABELS = {
    observation: 'Observation',
    phase1: 'Phase 1',
    phase2: 'Phase 2',
    toutes: 'Toutes les applis'
  };
  const STANDARD_LEVELS = {
    objectif: 'Objectif',
    depassement: 'Dépassement',
    revision: 'Révision',
    outil: 'Outils',
    jeux: 'Jeux'
  };
  const TOUTES_LEVELS = {
    niveau1: 'Niveau 1',
    niveau2: 'Niveau 2',
    niveau3: 'Niveau 3',
    autre: 'Autre',
    exterieur: 'Extérieur'
  };

  const IMAGE_BUCKET = 'mathas-images';
  const IMAGE_FOLDER = 'miniatures';
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

  const loginPanel = document.getElementById('loginPanel');
  const teacherPanel = document.getElementById('teacherPanel');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const panelMessage = document.getElementById('panelMessage');
  const searchInput = document.getElementById('searchInput');
  const managementHint = document.getElementById('managementHint');
  const classLegend = document.getElementById('classLegend');
  const dailyLegend = document.getElementById('dailyLegend');
  const globalView = document.getElementById('globalView');
  const classView = document.getElementById('classView');

  const appDialog = document.getElementById('appDialog');
  const appForm = document.getElementById('appForm');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogMessage = document.getElementById('dialogMessage');
  const deleteAppBtn = document.getElementById('deleteAppBtn');
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

  let currentView = 'global';
  let classRows = [];
  let appRows = [];
  let classAppRows = [];
  let selectedImageFile = null;
  let selectedImageObjectUrl = null;

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
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) setMessage(loginMessage, 'Connexion refusée. Vérifie l’adresse et le mot de passe.', 'error');
    else setMessage(loginMessage, '');
  });

  document.getElementById('logoutBtnTop').addEventListener('click', () => client.auth.signOut());
  document.getElementById('refreshBtn').addEventListener('click', loadData);
  document.getElementById('addAppBtn').addEventListener('click', () => openAppDialog());
  searchInput.addEventListener('input', renderCurrentView);

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      document.querySelectorAll('[data-view]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      updateViewHint();
      renderCurrentView();
    });
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
    if (!confirm(`Supprimer « ${app.nom} » de Math'as ?\n\nCette action la supprimera de toutes les pages où elle est utilisée.`)) return;
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
    if (!url) return setMessage(dialogMessage, 'Aucune URL de miniature à copier.', 'error');
    await copyText(url);
    setMessage(dialogMessage, 'URL copiée.', 'success');
  });
  appThumbInput.addEventListener('change', () => {
    if (selectedImageFile) return;
    const url = appThumbInput.value.trim();
    if (url) showImagePreviewFromUrl(url);
    else showEmptyImageDropZone();
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
    globalView.innerHTML = '';
    classView.innerHTML = '';

    const [classesRes, appsRes, linksRes] = await Promise.all([
      client.from('classes').select('id,slug,nom').order('id'),
      client.from('applications').select('id,nom,url,miniature_url,description,actif,special_only').eq('actif', true).order('nom'),
      client.from('class_applications').select('class_id,application_id,visible,du_jour,niveau,domaine,ordre')
    ]);

    const error = classesRes.error || appsRes.error || linksRes.error;
    if (error) {
      console.error(error);
      setMessage(panelMessage, 'Impossible de charger les données. Exécute d’abord le nouveau script SQL de migration.', 'error');
      return;
    }

    classRows = classesRes.data || [];
    appRows = appsRes.data || [];
    classAppRows = linksRes.data || [];
    setMessage(panelMessage, '');
    updateViewHint();
    renderCurrentView();
  }

  function updateViewHint() {
    if (currentView === 'global') {
      managementHint.textContent = 'GLOBAL : chaque ligne est une appli, avec une colonne par classe principale. Tout s’enregistre automatiquement.';
      classLegend.classList.add('hidden');
      return;
    }

    classLegend.classList.remove('hidden');
    dailyLegend.classList.toggle('hidden', currentView === 'toutes');
    managementHint.textContent = currentView === 'toutes'
      ? 'Toutes les applis : classement Niveau 1 / 2 / 3 / Autre / Extérieur. Il n’y a pas de “Du jour”.'
      : `Réglages de ${CORE_LABELS[currentView]}. Chaque changement est enregistré automatiquement.`;
  }

  function renderCurrentView() {
    if (currentView === 'global') {
      classView.classList.add('hidden');
      globalView.classList.remove('hidden');
      renderGlobalTable();
    } else {
      globalView.classList.add('hidden');
      classView.classList.remove('hidden');
      renderClassRows(currentView);
    }
  }

  function generalAppsFiltered() {
    const q = searchInput.value.trim().toLowerCase();
    return appRows
      .filter(app => !app.special_only)
      .filter(app => !q || app.nom.toLowerCase().includes(q) || (app.url || '').toLowerCase().includes(q));
  }

  function classBySlug(slug) {
    return classRows.find(row => row.slug === slug);
  }

  function linkFor(slug, appId) {
    const cls = classBySlug(slug);
    if (!cls) return null;
    return classAppRows.find(row => row.class_id === cls.id && row.application_id === appId) || null;
  }

  function renderGlobalTable() {
    globalView.innerHTML = '';
    const apps = generalAppsFiltered();

    if (!apps.length) {
      globalView.innerHTML = '<p class="muted empty-admin">Aucune application trouvée.</p>';
      return;
    }

    const scroller = document.createElement('div');
    scroller.className = 'global-table-scroll';
    const table = document.createElement('table');
    table.className = 'global-table';

    const thead = document.createElement('thead');
    const header = document.createElement('tr');
    header.appendChild(makeTh('Application', 'app-head'));
    CORE_SLUGS.forEach(slug => header.appendChild(makeTh(CORE_LABELS[slug], `class-head class-head-${slug}`)));
    header.appendChild(makeTh('Partout', 'everywhere-head'));
    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    apps.forEach(app => {
      const tr = document.createElement('tr');
      tr.appendChild(makeGlobalAppCell(app));

      CORE_SLUGS.forEach(slug => {
        const link = linkFor(slug, app.id);
        tr.appendChild(makeGlobalClassCell(app, slug, link));
      });

      const actionsTd = document.createElement('td');
      actionsTd.className = 'global-everywhere';
      const showBtn = button('Visible partout', 'mini-action');
      const hideBtn = button('Cacher partout', 'mini-action subdued');
      showBtn.addEventListener('click', () => setVisibleEverywhere(app.id, true, [showBtn, hideBtn]));
      hideBtn.addEventListener('click', () => setVisibleEverywhere(app.id, false, [showBtn, hideBtn]));
      actionsTd.append(showBtn, hideBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    scroller.appendChild(table);
    globalView.appendChild(scroller);
  }

  function makeTh(text, className) {
    const th = document.createElement('th');
    th.textContent = text;
    th.className = className || '';
    return th;
  }

  function makeGlobalAppCell(app) {
    const td = document.createElement('td');
    td.className = 'global-app-cell';
    const wrap = document.createElement('div');
    wrap.className = 'global-app-info';
    wrap.append(makeThumb(app));
    const meta = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = app.nom;
    const edit = button('Modifier', 'text-action');
    edit.addEventListener('click', () => openAppDialog(app));
    meta.append(name, edit);
    wrap.appendChild(meta);
    td.appendChild(wrap);
    return td;
  }

  function makeGlobalClassCell(app, slug, link) {
    const td = document.createElement('td');
    td.className = `global-class-cell global-${slug}`;

    if (!link) {
      const missing = document.createElement('button');
      missing.type = 'button';
      missing.className = 'secondary small-btn';
      missing.textContent = 'Créer le lien';
      missing.addEventListener('click', async () => {
        await createMissingCoreLink(slug, app.id);
      });
      td.appendChild(missing);
      return td;
    }

    const controls = document.createElement('div');
    controls.className = 'global-cell-controls';

    const visible = compactCheckbox('Visible', link.visible !== false);
    visible.input.addEventListener('change', () => updateClassLink(link, { visible: visible.input.checked }, () => {
      visible.input.checked = link.visible !== false;
    }));
    controls.appendChild(visible.wrap);

    if (slug !== 'toutes') {
      const daily = compactCheckbox('Du jour', link.du_jour === true);
      daily.input.addEventListener('change', () => updateClassLink(link, { du_jour: daily.input.checked }, () => {
        daily.input.checked = link.du_jour === true;
      }));
      controls.appendChild(daily.wrap);
    }

    const levels = slug === 'toutes' ? TOUTES_LEVELS : STANDARD_LEVELS;
    const select = document.createElement('select');
    select.className = 'compact-select';
    Object.entries(levels).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = levels[link.niveau] ? link.niveau : Object.keys(levels)[0];
    select.addEventListener('change', () => updateClassLink(link, { niveau: select.value }, () => {
      select.value = levels[link.niveau] ? link.niveau : Object.keys(levels)[0];
    }));
    controls.appendChild(select);

    td.appendChild(controls);
    return td;
  }

  async function createMissingCoreLink(slug, appId) {
    const cls = classBySlug(slug);
    if (!cls) return setMessage(panelMessage, `${CORE_LABELS[slug]} est introuvable dans Supabase.`, 'error');
    const maxOrder = classAppRows.reduce((max, row) => Math.max(max, Number(row.ordre) || 0), 0);
    const payload = {
      class_id: cls.id,
      application_id: appId,
      visible: slug === 'toutes',
      du_jour: false,
      niveau: slug === 'toutes' ? 'niveau1' : 'objectif',
      domaine: 'calcul',
      ordre: maxOrder + 10
    };
    const { error } = await client.from('class_applications').insert(payload);
    if (error) return setMessage(panelMessage, `Erreur : ${error.message}`, 'error');
    await loadData();
  }

  async function setVisibleEverywhere(appId, visible, buttons) {
    buttons.forEach(btn => btn.disabled = true);
    try {
      const classIds = CORE_SLUGS.map(slug => classBySlug(slug)?.id).filter(Boolean);
      const { error } = await client
        .from('class_applications')
        .update({ visible })
        .eq('application_id', appId)
        .in('class_id', classIds);
      if (error) throw error;
      classAppRows.forEach(row => {
        if (row.application_id === appId && classIds.includes(row.class_id)) row.visible = visible;
      });
      renderGlobalTable();
    } catch (error) {
      console.error(error);
      setMessage(panelMessage, `Erreur : ${error.message}`, 'error');
    } finally {
      buttons.forEach(btn => btn.disabled = false);
    }
  }

  function renderClassRows(slug) {
    classView.innerHTML = '';
    const cls = classBySlug(slug);
    if (!cls) {
      classView.innerHTML = '<p class="muted">Classe introuvable.</p>';
      return;
    }

    const q = searchInput.value.trim().toLowerCase();
    const rows = generalAppsFiltered()
      .map(app => ({ app, link: classAppRows.find(row => row.class_id === cls.id && row.application_id === app.id) }))
      .filter(({ link }) => Boolean(link))
      .filter(({ app }) => !q || app.nom.toLowerCase().includes(q) || (app.url || '').toLowerCase().includes(q))
      .sort((a, b) => Number(a.link.ordre || 0) - Number(b.link.ordre || 0) || a.app.nom.localeCompare(b.app.nom, 'fr'));

    if (!rows.length) {
      classView.innerHTML = '<p class="muted empty-admin">Aucune application pour cette vue.</p>';
      return;
    }

    rows.forEach(({ app, link }) => classView.appendChild(makeClassRow(app, link, slug)));
  }

  function makeClassRow(app, link, slug) {
    const row = document.createElement('article');
    row.className = 'app-row core-app-row';
    row.appendChild(makeThumb(app));

    const info = document.createElement('div');
    info.className = 'app-info';
    const name = document.createElement('strong');
    name.textContent = app.nom;
    const url = document.createElement('span');
    url.textContent = app.url || '';
    info.append(name, url);
    row.appendChild(info);

    const levels = slug === 'toutes' ? TOUTES_LEVELS : STANDARD_LEVELS;
    const levelField = fieldSelect('Niveau', levels, levels[link.niveau] ? link.niveau : Object.keys(levels)[0]);
    levelField.select.addEventListener('change', () => updateClassLink(link, { niveau: levelField.select.value }, () => {
      levelField.select.value = levels[link.niveau] ? link.niveau : Object.keys(levels)[0];
    }));
    row.appendChild(levelField.wrap);

    const visibleField = checkboxField('Visible', link.visible !== false);
    visibleField.input.addEventListener('change', () => updateClassLink(link, { visible: visibleField.input.checked }, () => {
      visibleField.input.checked = link.visible !== false;
    }));
    row.appendChild(visibleField.wrap);

    if (slug !== 'toutes') {
      const dailyField = checkboxField('Du jour', link.du_jour === true);
      dailyField.input.addEventListener('change', () => updateClassLink(link, { du_jour: dailyField.input.checked }, () => {
        dailyField.input.checked = link.du_jour === true;
      }));
      row.appendChild(dailyField.wrap);
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
      updateClassLink(link, { ordre: value }, () => { order.input.value = link.ordre ?? 0; });
    };
    order.input.addEventListener('input', () => {
      if (orderTimer) clearTimeout(orderTimer);
      orderTimer = setTimeout(saveOrder, 600);
    });
    order.input.addEventListener('change', saveOrder);
    row.appendChild(order.wrap);

    const modify = button('Modifier', 'secondary');
    modify.addEventListener('click', () => openAppDialog(app));
    row.appendChild(modify);
    return row;
  }

  async function updateClassLink(link, updates, onError) {
    const { error } = await client
      .from('class_applications')
      .update(updates)
      .eq('class_id', link.class_id)
      .eq('application_id', link.application_id);

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

  function openAppDialog(app = null) {
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
      if (app.miniature_url) showImagePreviewFromUrl(app.miniature_url);
      else showEmptyImageDropZone();
    } else {
      dialogTitle.textContent = 'Ajouter une application';
      editId.value = '';
      appThumbInput.value = '';
      deleteAppBtn.classList.add('hidden');
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
      actif: true,
      special_only: false
    };

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
        if (uploadedImagePath && previousImageUrl && previousImageUrl !== payload.miniature_url) {
          await removeStorageImageFromPublicUrl(previousImageUrl);
        }
        setMessage(dialogMessage, 'Application mise à jour.', 'success');
      } else {
        const { data: created, error: createError } = await client.from('applications').insert(payload).select('id').single();
        if (createError) throw createError;

        const maxOrder = classAppRows.reduce((max, row) => Math.max(max, Number(row.ordre) || 0), 0);
        const links = CORE_SLUGS.map((slug, index) => {
          const cls = classBySlug(slug);
          if (!cls) throw new Error(`La page ${CORE_LABELS[slug]} est introuvable dans Supabase.`);
          return {
            class_id: cls.id,
            application_id: created.id,
            visible: slug === 'toutes',
            du_jour: false,
            niveau: slug === 'toutes' ? 'niveau1' : 'objectif',
            domaine: 'calcul',
            ordre: maxOrder + 10 + index
          };
        });

        const { error: linksError } = await client.from('class_applications').insert(links);
        if (linksError) {
          await client.from('applications').delete().eq('id', created.id);
          if (uploadedImagePath) await client.storage.from(IMAGE_BUCKET).remove([uploadedImagePath]);
          throw linksError;
        }
        setMessage(dialogMessage, 'Application créée dans les quatre pages principales.', 'success');
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
    deleteAppBtn.disabled = true;
    setMessage(dialogMessage, 'Suppression…');
    try {
      await client.from('application_categories').delete().eq('application_id', app.id);
      const { error: classError } = await client.from('class_applications').delete().eq('application_id', app.id);
      if (classError) throw classError;
      const { error: shareError } = await client.from('share_page_applications').delete().eq('application_id', app.id);
      if (shareError) throw shareError;
      const { error: appError } = await client.from('applications').delete().eq('id', app.id);
      if (appError) throw appError;
      await removeStorageImageFromPublicUrl(app.miniature_url);
      await loadData();
      closeAppDialog();
      setMessage(panelMessage, `« ${app.nom} » supprimée partout.`, 'success');
    } catch (error) {
      console.error(error);
      setMessage(dialogMessage, `Erreur : ${error.message}`, 'error');
    } finally {
      deleteAppBtn.disabled = false;
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
    setMessage(dialogMessage, 'Nouvelle miniature prête.', 'success');
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
    const extension = getImageExtension(file);
    const safeName = slugify(appName) || 'application';
    const path = `${IMAGE_FOLDER}/${safeName}-${Date.now()}-${cryptoRandomPart()}.${extension}`;
    const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('URL publique introuvable après l’envoi.');
    return { path, publicUrl: data.publicUrl };
  }

  async function removeStorageImageFromPublicUrl(url) {
    const path = getStoragePathFromPublicUrl(url);
    if (!path) return;
    const { error } = await client.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) console.warn('Miniature non supprimée du Storage:', error);
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
    } else {
      thumb.textContent = (app.nom || 'M').trim().charAt(0).toUpperCase();
    }
    return thumb;
  }

  function compactCheckbox(label, checked) {
    const wrap = document.createElement('label');
    wrap.className = 'compact-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    const span = document.createElement('span');
    span.textContent = label;
    wrap.append(input, span);
    return { wrap, input };
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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70);
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
