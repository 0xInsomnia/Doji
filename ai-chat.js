// AI Chat for Doji (Gemini)
(function() {
  if (!window.state) return;
  state.aiMessages = state.aiMessages || [];

  function renderAiMessages() {
    const box = document.getElementById('ai-messages');
    if (!box) return;
    box.innerHTML = state.aiMessages.map(m =>
      `<div class="ai-msg ${m.role === 'user' ? 'user' : 'ai'}">${(m.text||'').replace(/</g,'<')}</div>`
    ).join('');
    box.scrollTop = box.scrollHeight;
  }

  async function sendAiMessage() {
    const input = document.getElementById('ai-input');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) return;
    const key = (state.config && state.config.geminiKey) || localStorage.getItem('doji_gemini_key') || '';
    if (!key) {
      alert('Inserisci la chiave Gemini nelle Impostazioni.');
      return;
    }
    state.aiMessages.push({ role: 'user', text });
    input.value = '';
    renderAiMessages();

    const recent = (state.trades || []).slice(-8).map(t =>
      `${t.asset || '?'} ${t.dir || ''} P&L:${t.pnl || 0}`
    ).join('\n');
    const prompt = `Sei un assistente per un trading journal. Rispondi in italiano.\n\nTrade recenti:\n${recent || 'nessuno'}\n\nDomanda: ${text}`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Errore risposta.';
      state.aiMessages.push({ role: 'ai', text: reply });
    } catch (e) {
      state.aiMessages.push({ role: 'ai', text: 'Errore: ' + e.message });
    }
    renderAiMessages();
  }

  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'ai-send-btn') sendAiMessage();
    if (e.target && e.target.id === 'save-gemini-key') {
      const k = (document.getElementById('gemini-api-key')||{}).value || '';
      if (k.trim()) {
        state.config = state.config || {};
        state.config.geminiKey = k.trim();
        localStorage.setItem('doji_gemini_key', k.trim());
        alert('Chiave salvata (solo sul dispositivo).');
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.target && e.target.id === 'ai-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  });

  try {
    const saved = localStorage.getItem('doji_gemini_key');
    if (saved && state.config) state.config.geminiKey = saved;
  } catch(e) {}

  const orig = window.render;
  if (typeof orig === 'function') {
    window.render = function() {
      orig();
      if (state.view === 'ai') renderAiMessages();
    };
  }
})();
