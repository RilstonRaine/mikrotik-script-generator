/**
 * Controlador Front-end - Gerador de Scripts MikroTik (Perfill)
 * Comunica-se com a API Back-end Express via /api/generate
 */

(() => {
  // Elementos do DOM
  const $ = id => document.getElementById(id);
  const form = $('generatorForm');
  const preview = $('preview');
  const statusEl = $('statusMsg');
  const networkFactsEl = $('networkFacts');
  const pppoeContainer = $('pppoeFields');
  const submitBtn = $('submitBtn');
  const clearBtn = $('clearBtn');
  const downloadRscBtn = $('downloadRsc');
  const downloadTxtBtn = $('downloadTxt');
  const copyBtn = $('copyBtn');
  const wanRadios = document.querySelectorAll('input[name="wanType"]');

  // Estado da aplicação
  let currentScript = '';
  let currentFilename = 'script_mikrotik';

  // Alternância dinâmica dos campos de PPPoE
  function getSelectedWan() {
    const checked = Array.from(wanRadios).find(r => r.checked);
    return checked ? checked.value : 'DHCP';
  }

  function handleWanChange() {
    const isPppoe = getSelectedWan() === 'PPPoE';
    pppoeContainer.classList.toggle('hidden', !isPppoe);

    const userInp = $('pppoeUser');
    const passInp = $('pppoePass');
    if (isPppoe) {
      userInp.setAttribute('required', 'required');
      passInp.setAttribute('required', 'required');
    } else {
      userInp.removeAttribute('required');
      passInp.removeAttribute('required');
    }
  }

  wanRadios.forEach(radio => radio.addEventListener('change', handleWanChange));

  // Exibição de mensagens de status
  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = isError ? 'status-msg error' : 'status-msg';
    statusEl.classList.remove('hidden');
  }

  function hideStatus() {
    statusEl.classList.add('hidden');
    statusEl.textContent = '';
  }

  // Utilitário para download de arquivos no cliente
  function triggerDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Renderização dos cards de informações de rede calculados pelo backend
  function renderNetworkFacts(facts) {
    if (!facts) {
      networkFactsEl.classList.add('hidden');
      return;
    }

    const items = [
      { label: 'Sub-rede /30', value: facts.cidr },
      { label: 'Gateway RB', value: facts.gateway },
      { label: 'IP Câmera', value: facts.camera },
      { label: 'Broadcast', value: facts.broadcast },
      { label: 'Máscara', value: facts.mask }
    ];

    networkFactsEl.innerHTML = items
      .map(item => `
        <div class="fact-item">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </div>
      `)
      .join('');

    networkFactsEl.classList.remove('hidden');
  }

  // Desabilitar/habilitar botões de exportação
  function setExportButtonsEnabled(enabled) {
    downloadRscBtn.disabled = !enabled;
    downloadTxtBtn.disabled = !enabled;
    copyBtn.disabled = !enabled;
  }

  // Envio do formulário para o Back-end
  form.addEventListener('submit', async event => {
    event.preventDefault();
    hideStatus();

    const payload = {
      siteName: $('siteName').value.trim(),
      cameraIp: $('cameraIp').value.trim(),
      wanType: getSelectedWan(),
      wanInterface: $('wanInterface').value,
      lanPorts: $('lanPorts').value.trim(),
      pppoeUser: $('pppoeUser').value,
      pppoePass: $('pppoePass').value,
      routerVersion: $('routerVersion').value.trim()
    };

    // Feedback visual de carregamento
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Gerando...';

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar solicitação no servidor.');
      }

      currentScript = data.script;
      currentFilename = data.filename || 'script_mikrotik';
      preview.value = currentScript;

      renderNetworkFacts(data.facts);
      setExportButtonsEnabled(true);
      showStatus('✓ Scripts gerados com sucesso pelo backend! Confira a prévia abaixo.');
    } catch (err) {
      currentScript = '';
      preview.value = '';
      setExportButtonsEnabled(false);
      renderNetworkFacts(null);
      showStatus(err.message || 'Erro inesperado ao gerar os scripts.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  // Botão Download .RSC
  downloadRscBtn.addEventListener('click', () => {
    if (!currentScript) return;
    triggerDownload(currentScript, `${currentFilename}.rsc`);
  });

  // Botão Download .TXT
  downloadTxtBtn.addEventListener('click', () => {
    if (!currentScript) return;
    triggerDownload(currentScript, `${currentFilename}.txt`);
  });

  // Botão Copiar Script
  copyBtn.addEventListener('click', async () => {
    if (!currentScript) return;

    try {
      await navigator.clipboard.writeText(currentScript);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copiado!';
      copyBtn.style.borderColor = 'var(--accent-emerald)';
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.borderColor = '';
      }, 2000);
      showStatus('Script copiado para a área de transferência.');
    } catch {
      preview.focus();
      preview.select();
      showStatus('Não foi possível copiar automaticamente. O texto foi selecionado na prévia.', true);
    }
  });

  // Botão Limpar
  clearBtn.addEventListener('click', () => {
    currentScript = '';
    preview.value = '';
    setExportButtonsEnabled(false);
    renderNetworkFacts(null);
    hideStatus();
    showStatus('Prévia e formulário resetados.');
  });
})();
