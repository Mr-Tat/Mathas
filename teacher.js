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

  document.getElementById('logoutBtn').addEventListener('click', async () => {
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

  async function showTeacherPanel() {
    loginPanel.classList.add('hidden');
    teacherPanel.classList.remove('hidden');
    await loadData();
  }

  function showLogin() {
    teacherPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
  }

  async function loadData() {
    setMessage(panelMessage, 'Chargement…');
    appList.innerHTML = '';

    const [classesRes, appsRes, linksRes] = await Promise.all([
      client.from('classes').select('id,slug,nom').order('id'),
      client.from('applications').select('id,nom,url,miniature_url,actif').eq('actif', true).order('nom'),
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

    row.append(
      thumb,
      info,
      levelField.wrap,
      visibleField.wrap,
      dailyField.wrap,
      orderWrap,
      saveBtn
    );

    return row;
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
