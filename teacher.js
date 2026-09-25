(() => {
  const cfg = window.MATHAS_CONFIG;

  if (!window.supabase || !cfg?.supabase?.url || !cfg?.supabase?.publishableKey) {
    document.body.innerHTML =
      '<p style="padding:2rem;color:white">Configuration Supabase introuvable.</p>';
    return;
  }

  const client = window.supabase.createClient(
    cfg.supabase.url,
    cfg.supabase.publishableKey
  );

  const loginPanel = document.getElementById('loginPanel');
  const teacherPanel = document.getElementById('teacherPanel');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const panelMessage = document.getElementById('panelMessage');
  const appList = document.getElementById('appList');
  const searchInput = document.getElementById('searchInput');
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

  const siteImageDialog = document.getElementById('siteImageDialog');
  const siteImageForm = document.getElementById('siteImageForm');
  const siteImageFolder = document.getElementById('siteImageFolder');
  const siteImageDropZone = document.getElementById('siteImageDropZone');
  const siteImageFile = document.getElementById('siteImageFile');
  const siteImagePrompt = document.getElementById('siteImagePrompt');
  const siteImagePreviewWrap = document.getElementById('siteImagePreviewWrap');
  const siteImagePreview = document.getElementById('siteImagePreview');
  const siteImagePreviewName = document.getElementById('siteImagePreviewName');
  const siteImagePreviewStatus = document.getElementById('siteImagePreviewStatus');
  const siteImageResult = document.getElementById('siteImageResult');
  const siteImageUrl = document.getElementById('siteImageUrl');
  const openSiteImageBtn = document.getElementById('openSiteImageBtn');
  const siteImageMessage = document.getElementById('siteImageMessage');

  const IMAGE_BUCKET = 'mathas-images';
  const IMAGE_FOLDER = 'miniatures';
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

  let selectedImageFile = null;
  let selectedImageObjectUrl = null;

  let selectedSiteImageFile = null;
  let selectedSiteImageObjectUrl = null;

  let currentClassSlug = 'observation';
  let classRows = [];
  let appRows = [];
  let classAppRows = [];

  init();

  async function init() {
    const { data: { session } } = await client.auth.getSession();

    if (session) {
      await showTeacherPanel();
    } else {
      showLogin();
    }

    client.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await showTeacherPanel();
      } else {
        showLogin();
      }
    });
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(loginMessage, 'Connexion…');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(loginMessage, 'Connexion refusée. Vérifie l’adresse et le mot de passe.', 'error');
      return;
    }

    setMessage(loginMessage, '');
  });

  document.getElementById('logoutBtnTop').addEventListener('click', async () => {
    await client.auth.signOut();
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadData();
  });

  searchInput.addEventListener('input', renderApps);

  document.querySelectorAll('.class-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentClassSlug = btn.dataset.class;
      document.querySelectorAll('.class-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      renderApps();
    });
  });


  document.getElementById('addAppBtn').addEventListener('click', () => {
    openAppDialog();
  });

  document.getElementById('closeDialogBtn').addEventListener('click', closeAppDialog);
  document.getElementById('cancelDialogBtn').addEventListener('click', closeAppDialog);

  appForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveGlobalApp();
  });

  deleteAppBtn.addEventListener('click', async () => {
    const appId = Number(document.getElementById('editAppId').value);
    const app = appRows.find(item => item.id === appId);
    if (!app) return;

    const confirmed = confirm(
      `Supprimer « ${app.nom} » de Math'as ?\n\n` +
      `Elle sera supprimée pour Observation, Phase 1 et Phase 2. Cette action est définitive.`
    );

    if (!confirmed) return;
    await deleteGlobalApp(app);
  });


  imageDropZone.addEventListener('click', () => {
    appImageFile.click();
  });

  imageDropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      appImageFile.click();
    }
  });

  appImageFile.addEventListener('change', () => {
    const file = appImageFile.files?.[0];
    if (file) selectImageFile(file);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      imageDropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    imageDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      imageDropZone.classList.remove('drag-over');
    });
  });

  imageDropZone.addEventListener('drop', event => {
    const file = event.dataTransfer?.files?.[0];
    if (file) selectImageFile(file);
  });

  clearImageBtn.addEventListener('click', () => {
    clearSelectedImage();
    const currentUrl = appThumbInput.value.trim();
    if (currentUrl) {
      showImagePreviewFromUrl(currentUrl);
    } else {
      showEmptyImageDropZone();
    }
  });

  copyImageUrlBtn.addEventListener('click', async () => {
    const url = appThumbInput.value.trim();

    if (!url) {
      setMessage(dialogMessage, 'Aucune URL de miniature à copier.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage(dialogMessage, 'URL de la miniature copiée.', 'success');
    } catch {
      appThumbInput.select();
      document.execCommand('copy');
      setMessage(dialogMessage, 'URL de la miniature copiée.', 'success');
    }
  });

  appThumbInput.addEventListener('change', () => {
    if (!selectedImageFile) {
      const url = appThumbInput.value.trim();
      if (url) showImagePreviewFromUrl(url);
      else showEmptyImageDropZone();
    }
  });


  document.getElementById('addSiteImageBtn').addEventListener('click', () => {
    resetSiteImageDialog();
    siteImageDialog.showModal();
  });

  document.getElementById('closeSiteImageDialogBtn').addEventListener('click', closeSiteImageDialog);
  document.getElementById('cancelSiteImageBtn').addEventListener('click', closeSiteImageDialog);

  siteImageDropZone.addEventListener('click', () => {
    siteImageFile.click();
  });

  siteImageDropZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      siteImageFile.click();
    }
  });

  siteImageFile.addEventListener('change', () => {
    const file = siteImageFile.files?.[0];
    if (file) selectSiteImageFile(file);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    siteImageDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      siteImageDropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    siteImageDropZone.addEventListener(eventName, event => {
      event.preventDefault();
      siteImageDropZone.classList.remove('drag-over');
    });
  });

  siteImageDropZone.addEventListener('drop', event => {
    const file = event.dataTransfer?.files?.[0];
    if (file) selectSiteImageFile(file);
  });

  siteImageForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!selectedSiteImageFile) {
      setMessage(siteImageMessage, 'Choisis d’abord une image.', 'error');
      return;
    }

    const uploadBtn = document.getElementById('uploadSiteImageBtn');
    uploadBtn.disabled = true;
    setMessage(siteImageMessage, 'Envoi de l’image…');

    try {
      const result = await uploadGeneralSiteImage(
        selectedSiteImageFile,
        siteImageFolder.value
      );

      siteImageUrl.value = result.publicUrl;
      openSiteImageBtn.href = result.publicUrl;
      siteImageResult.classList.remove('hidden');
      siteImagePreviewStatus.textContent = 'Image envoyée';

      setMessage(
        siteImageMessage,
        'Image envoyée. Tu peux maintenant copier son URL.',
        'success'
      );
    } catch (error) {
      console.error(error);
      setMessage(
        siteImageMessage,
        `Erreur : ${error.message || 'envoi impossible'}`,
        'error'
      );
    } finally {
      uploadBtn.disabled = false;
    }
  });

  document.getElementById('copySiteImageUrlBtn').addEventListener('click', async () => {
    const url = siteImageUrl.value.trim();

    if (!url) {
      setMessage(siteImageMessage, 'Aucune URL à copier.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setMessage(siteImageMessage, 'URL copiée.', 'success');
    } catch {
      siteImageUrl.select();
      document.execCommand('copy');
      setMessage(siteImageMessage, 'URL copiée.', 'success');
    }
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
    appList.innerHTML = '';

    const [classesRes, appsRes, linksRes] = await Promise.all([
      client.from('classes').select('id,slug,nom').order('id'),
      client.from('applications').select('id,nom,url,miniature_url,description,actif').eq('actif', true).order('nom'),
      client.from('class_applications').select('class_id,application_id,visible,du_jour,niveau,domaine,ordre')
    ]);

    const error = classesRes.error || appsRes.error || linksRes.error;

    if (error) {
      console.error(error);
      setMessage(
        panelMessage,
        "Impossible de charger les données. Vérifie que le compte connecté est bien autorisé comme enseignant.",
        'error'
      );
      return;
    }

    classRows = classesRes.data || [];
    appRows = appsRes.data || [];
    classAppRows = linksRes.data || [];

    setMessage(panelMessage, '');
    renderApps();
  }

  function renderApps() {
    const currentClass = classRows.find(c => c.slug === currentClassSlug);
    const q = searchInput.value.trim().toLowerCase();

    if (!currentClass) {
      appList.innerHTML = '<p class="muted">Classe introuvable.</p>';
      return;
    }

    const rows = appRows
      .map(app => {
        const link = classAppRows.find(
          row => row.class_id === currentClass.id && row.application_id === app.id
        );
        return { app, link };
      })
      .filter(({ app, link }) => {
        if (!link) return false;
        if (!q) return true;
        return app.nom.toLowerCase().includes(q);
      })
      .sort((a, b) =>
        (a.link.ordre ?? 0) - (b.link.ordre ?? 0) ||
        a.app.nom.localeCompare(b.app.nom, 'fr')
      );

    appList.replaceChildren(...rows.map(createAppRow));
  }

  function createAppRow({ app, link }) {
    const row = document.createElement('article');
    row.className = 'app-row';

    const thumb = document.createElement('div');
    thumb.className = 'app-thumb';

    if (app.miniature_url) {
      const img = document.createElement('img');
      img.src = app.miniature_url;
      img.alt = '';
      thumb.appendChild(img);
    } else {
      thumb.textContent = app.nom.charAt(0).toUpperCase();
    }

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'app-name';
    name.textContent = app.nom;

    const url = document.createElement('span');
    url.className = 'app-url';
    url.textContent = app.url || '';

    info.append(name, url);

    const levelField = fieldSelect(
      'Niveau',
      ['objectif', 'depassement', 'revision', 'outil'],
      link.niveau || 'objectif',
      {
        objectif: 'Objectif',
        depassement: 'Dépassement',
        revision: 'Révision',
        outil: 'Outils'
      }
    );

    const visibleField = checkboxField('Visible', link.visible !== false);
    const dailyField = checkboxField('Du jour', link.du_jour === true);

    const orderWrap = document.createElement('div');
    const orderLabel = document.createElement('div');
    orderLabel.className = 'field-label';
    orderLabel.textContent = 'Ordre';
    const orderInput = document.createElement('input');
    orderInput.className = 'order-input';
    orderInput.type = 'number';
    orderInput.value = link.ordre ?? 0;
    orderWrap.append(orderLabel, orderInput);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Enregistrer';

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = '…';

      const updates = {
        visible: visibleField.input.checked,
        du_jour: dailyField.input.checked,
        niveau: levelField.select.value,
        ordre: Number(orderInput.value) || 0
      };

      const { error } = await client
        .from('class_applications')
        .update(updates)
        .eq('class_id', link.class_id)
        .eq('application_id', link.application_id);

      if (error) {
        console.error(error);
        saveBtn.textContent = 'Erreur';
        setMessage(panelMessage, `Erreur lors de l’enregistrement de « ${app.nom} ».`, 'error');
      } else {
        Object.assign(link, updates);
        saveBtn.textContent = 'Enregistré';
        saveBtn.classList.add('saved');
        setMessage(panelMessage, `« ${app.nom} » enregistré.`, 'success');

        setTimeout(() => {
          saveBtn.textContent = 'Enregistrer';
          saveBtn.classList.remove('saved');
        }, 1600);
      }

      saveBtn.disabled = false;
    });

    const manageBtn = document.createElement('button');
    manageBtn.type = 'button';
    manageBtn.className = 'manage-btn';
    manageBtn.textContent = 'Modifier';
    manageBtn.addEventListener('click', () => openAppDialog(app));

    row.append(
      thumb,
      info,
      levelField.wrap,
      visibleField.wrap,
      dailyField.wrap,
      orderWrap,
      saveBtn,
      manageBtn
    );

    return row;
  }


  function openAppDialog(app = null) {
    appForm.reset();
    clearSelectedImage();
    setMessage(dialogMessage, '');

    const editId = document.getElementById('editAppId');
    const nameInput = document.getElementById('appNameInput');
    const urlInput = document.getElementById('appUrlInput');
    const descriptionInput = document.getElementById('appDescriptionInput');

    if (app) {
      dialogTitle.textContent = 'Modifier une application';
      editId.value = app.id;
      nameInput.value = app.nom || '';
      urlInput.value = app.url || '';
      appThumbInput.value = app.miniature_url || '';
      descriptionInput.value = app.description || '';
      deleteAppBtn.classList.remove('hidden');
      newAppNote.classList.add('hidden');

      if (app.miniature_url) {
        showImagePreviewFromUrl(app.miniature_url);
      } else {
        showEmptyImageDropZone();
      }
    } else {
      dialogTitle.textContent = 'Ajouter une application';
      editId.value = '';
      appThumbInput.value = '';
      deleteAppBtn.classList.add('hidden');
      newAppNote.classList.remove('hidden');
      showEmptyImageDropZone();
    }

    appDialog.showModal();
  }

  function closeAppDialog() {
    clearSelectedImage();
    if (appDialog.open) appDialog.close();
  }

  async function saveGlobalApp() {
    const idValue = document.getElementById('editAppId').value;
    const appId = idValue ? Number(idValue) : null;

    const existingApp = appId
      ? appRows.find(item => item.id === appId)
      : null;

    const previousImageUrl = existingApp?.miniature_url || null;
    let uploadedImagePath = null;

    const payload = {
      nom: document.getElementById('appNameInput').value.trim(),
      url: document.getElementById('appUrlInput').value.trim(),
      miniature_url: appThumbInput.value.trim() || null,
      description: document.getElementById('appDescriptionInput').value.trim() || null,
      actif: true
    };

    if (!payload.nom || !payload.url) {
      setMessage(dialogMessage, 'Le nom et l’URL sont obligatoires.', 'error');
      return;
    }

    const saveBtn = document.getElementById('saveAppBtn');
    saveBtn.disabled = true;

    try {
      if (selectedImageFile) {
        setMessage(dialogMessage, 'Envoi de la miniature…');

        const upload = await uploadImageForApp(selectedImageFile, payload.nom);
        uploadedImagePath = upload.path;
        payload.miniature_url = upload.publicUrl;
        appThumbInput.value = upload.publicUrl;

        imagePreviewStatus.textContent = 'Image envoyée';
      }

      setMessage(dialogMessage, appId ? 'Enregistrement…' : 'Création…');

      if (appId) {
        const { error } = await client
          .from('applications')
          .update(payload)
          .eq('id', appId);

        if (error) throw error;

        if (
          uploadedImagePath &&
          previousImageUrl &&
          previousImageUrl !== payload.miniature_url
        ) {
          await removeStorageImageFromPublicUrl(previousImageUrl);
        }

        setMessage(dialogMessage, 'Application mise à jour.', 'success');
      } else {
        const { data: created, error: createError } = await client
          .from('applications')
          .insert(payload)
          .select('id')
          .single();

        if (createError) throw createError;

        const maxOrder = classAppRows.reduce(
          (max, row) => Math.max(max, Number(row.ordre) || 0),
          0
        );

        const classLinks = classRows.map((cls, index) => ({
          class_id: cls.id,
          application_id: created.id,
          visible: false,
          du_jour: false,
          niveau: 'objectif',
          domaine: 'calcul',
          ordre: maxOrder + 10 + index
        }));

        const { error: linksError } = await client
          .from('class_applications')
          .insert(classLinks);

        if (linksError) {
          await client.from('applications').delete().eq('id', created.id);

          if (uploadedImagePath) {
            await client.storage
              .from(IMAGE_BUCKET)
              .remove([uploadedImagePath]);
          }

          throw linksError;
        }

        setMessage(
          dialogMessage,
          'Application créée dans toutes les classes, invisible par défaut.',
          'success'
        );
      }

      await loadData();

      setTimeout(() => {
        closeAppDialog();
      }, 700);
    } catch (error) {
      console.error(error);

      if (uploadedImagePath && !appId) {
        await client.storage
          .from(IMAGE_BUCKET)
          .remove([uploadedImagePath]);
      }

      setMessage(
        dialogMessage,
        `Erreur : ${error.message || 'enregistrement impossible'}`,
        'error'
      );
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function deleteGlobalApp(app) {
    deleteAppBtn.disabled = true;
    setMessage(dialogMessage, 'Suppression…');

    try {
      const { error: categoryError } = await client
        .from('application_categories')
        .delete()
        .eq('application_id', app.id);

      if (categoryError) throw categoryError;

      const { error: classError } = await client
        .from('class_applications')
        .delete()
        .eq('application_id', app.id);

      if (classError) throw classError;

      const { error: appError } = await client
        .from('applications')
        .delete()
        .eq('id', app.id);

      if (appError) throw appError;

      // Nettoyage de la miniature uniquement si elle appartient à notre bucket.
      await removeStorageImageFromPublicUrl(app.miniature_url);

      await loadData();
      closeAppDialog();
      setMessage(
        panelMessage,
        `« ${app.nom} » supprimée de toutes les classes.`,
        'success'
      );
    } catch (error) {
      console.error(error);
      setMessage(
        dialogMessage,
        `Suppression impossible : ${error.message || 'erreur Supabase'}`,
        'error'
      );
    } finally {
      deleteAppBtn.disabled = false;
    }
  }


  function selectImageFile(file) {
    if (!file.type.startsWith('image/')) {
      setMessage(dialogMessage, 'Choisis un fichier image.', 'error');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setMessage(dialogMessage, 'L’image dépasse 10 Mo.', 'error');
      return;
    }

    clearSelectedImage();
    selectedImageFile = file;
    appImageFile.value = '';

    selectedImageObjectUrl = URL.createObjectURL(file);

    imagePreview.src = selectedImageObjectUrl;
    imagePreviewName.textContent = file.name;
    imagePreviewStatus.textContent =
      `${formatFileSize(file.size)} • sera envoyée à l’enregistrement`;

    imageDropPrompt.classList.add('hidden');
    imagePreviewWrap.classList.remove('hidden');
    clearImageBtn.classList.remove('hidden');

    setMessage(dialogMessage, 'Miniature prête à être envoyée.', 'success');
  }

  function clearSelectedImage() {
    selectedImageFile = null;

    if (selectedImageObjectUrl) {
      URL.revokeObjectURL(selectedImageObjectUrl);
      selectedImageObjectUrl = null;
    }

    clearImageBtn.classList.add('hidden');
  }

  function showEmptyImageDropZone() {
    imagePreview.removeAttribute('src');
    imagePreviewName.textContent = 'Miniature';
    imagePreviewStatus.textContent = '';
    imagePreviewWrap.classList.add('hidden');
    imageDropPrompt.classList.remove('hidden');
  }

  function showImagePreviewFromUrl(url) {
    imagePreview.src = url;
    imagePreviewName.textContent = 'Miniature actuelle';
    imagePreviewStatus.textContent = 'Image déjà associée à l’application';
    imageDropPrompt.classList.add('hidden');
    imagePreviewWrap.classList.remove('hidden');
    clearImageBtn.classList.add('hidden');
  }

  async function uploadImageForApp(file, appName) {
    const extension = getImageExtension(file);
    const safeName = slugify(appName) || 'application';
    const uniquePart = `${Date.now()}-${cryptoRandomPart()}`;
    const path = `${IMAGE_FOLDER}/${safeName}-${uniquePart}.${extension}`;

    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      });

    if (error) throw error;

    const { data } = client.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      await client.storage.from(IMAGE_BUCKET).remove([path]);
      throw new Error('Impossible de récupérer l’URL publique de la miniature.');
    }

    return {
      path,
      publicUrl: data.publicUrl
    };
  }

  async function removeStorageImageFromPublicUrl(url) {
    const path = getStoragePathFromPublicUrl(url);
    if (!path) return;

    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .remove([path]);

    // Le nettoyage de l'image ne doit pas bloquer une modification/suppression
    // déjà réussie dans la base.
    if (error) {
      console.warn('Nettoyage miniature impossible :', error);
    }
  }

  function getStoragePathFromPublicUrl(url) {
    if (!url) return null;

    const prefix =
      `${cfg.supabase.url}/storage/v1/object/public/${IMAGE_BUCKET}/`;

    if (!url.startsWith(prefix)) return null;

    const withoutQuery = url.slice(prefix.length).split('?')[0];

    try {
      return decodeURIComponent(withoutQuery);
    } catch {
      return withoutQuery;
    }
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  function getImageExtension(file) {
    const byName = file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (byName && byName.length <= 5) {
      return byName === 'jpeg' ? 'jpg' : byName;
    }

    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };

    return mimeMap[file.type] || 'png';
  }

  function cryptoRandomPart() {
    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0].toString(36);
    }

    return Math.random().toString(36).slice(2, 9);
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }



  function resetSiteImageDialog() {
    clearSelectedSiteImage();
    siteImageForm.reset();
    siteImageFolder.value = 'logos';
    siteImageResult.classList.add('hidden');
    siteImageUrl.value = '';
    openSiteImageBtn.href = '#';
    siteImagePreview.removeAttribute('src');
    siteImagePreviewName.textContent = 'Image';
    siteImagePreviewStatus.textContent = '';
    siteImagePreviewWrap.classList.add('hidden');
    siteImagePrompt.classList.remove('hidden');
    setMessage(siteImageMessage, '');
  }

  function closeSiteImageDialog() {
    clearSelectedSiteImage();
    if (siteImageDialog.open) siteImageDialog.close();
  }

  function selectSiteImageFile(file) {
    if (!file.type.startsWith('image/')) {
      setMessage(siteImageMessage, 'Choisis un fichier image.', 'error');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setMessage(siteImageMessage, 'L’image dépasse 10 Mo.', 'error');
      return;
    }

    clearSelectedSiteImage();
    selectedSiteImageFile = file;
    siteImageFile.value = '';

    selectedSiteImageObjectUrl = URL.createObjectURL(file);

    siteImagePreview.src = selectedSiteImageObjectUrl;
    siteImagePreviewName.textContent = file.name;
    siteImagePreviewStatus.textContent =
      `${formatFileSize(file.size)} • prête à être envoyée`;

    siteImagePrompt.classList.add('hidden');
    siteImagePreviewWrap.classList.remove('hidden');
    siteImageResult.classList.add('hidden');
    siteImageUrl.value = '';

    setMessage(siteImageMessage, 'Image prête à être envoyée.', 'success');
  }

  function clearSelectedSiteImage() {
    selectedSiteImageFile = null;

    if (selectedSiteImageObjectUrl) {
      URL.revokeObjectURL(selectedSiteImageObjectUrl);
      selectedSiteImageObjectUrl = null;
    }
  }

  async function uploadGeneralSiteImage(file, folder) {
    const extension = getImageExtension(file);
    const originalBaseName = file.name.replace(/\.[^.]+$/, '');
    const safeName = slugify(originalBaseName) || 'image';
    const uniquePart = `${Date.now()}-${cryptoRandomPart()}`;
    const safeFolder = slugify(folder) || 'autres';
    const path = `${safeFolder}/${safeName}-${uniquePart}.${extension}`;

    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      });

    if (error) throw error;

    const { data } = client.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      await client.storage.from(IMAGE_BUCKET).remove([path]);
      throw new Error('Impossible de récupérer l’URL publique de l’image.');
    }

    return {
      path,
      publicUrl: data.publicUrl
    };
  }


  function fieldSelect(labelText, options, value, labels = {}) {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'field-label';
    label.textContent = labelText;

    const select = document.createElement('select');

    options.forEach(valueOption => {
      const option = document.createElement('option');
      option.value = valueOption;
      option.textContent = labels[valueOption] || valueOption;
      option.selected = valueOption === value;
      select.appendChild(option);
    });

    wrap.append(label, select);
    return { wrap, select };
  }

  function checkboxField(labelText, checked) {
    const wrap = document.createElement('label');
    wrap.className = 'checkbox-wrap';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;

    const text = document.createElement('span');
    text.textContent = labelText;

    wrap.append(input, text);
    return { wrap, input };
  }

  function setMessage(element, text, type = '') {
    element.textContent = text;
    element.className = `message ${type}`.trim();
  }
})();
