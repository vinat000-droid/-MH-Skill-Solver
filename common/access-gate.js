/* Simple private-test access gate for static GitHub Pages. Not security-grade auth. */
(() => {
  'use strict';
  const ACCESS_HASH = 'e1a649375da7e19b5589c39560d75ee90e4c630e0a0ee74b9084265051aa56fc';
  const SESSION_KEY = 'mh_skill_solver_access_v1';

  const style = document.createElement('style');
  style.textContent = `
    html.mh-gate-lock, html.mh-gate-lock body { overflow:hidden !important; }
    #mhAccessGate { position:fixed; inset:0; z-index:2147483647; display:grid; place-items:center; padding:24px; box-sizing:border-box; background:#111; color:#eee; font-family:system-ui,-apple-system,sans-serif; text-align:center; }
    #mhAccessGate .box { width:min(420px,100%); }
    #mhAccessGate input { width:100%; box-sizing:border-box; margin-top:16px; padding:12px; border:1px solid #666; border-radius:8px; background:#222; color:#fff; font-size:16px; }
    #mhAccessGate button { margin-top:12px; padding:11px 20px; border:0; border-radius:8px; font-size:16px; cursor:pointer; }
    #mhAccessGate .error { min-height:1.4em; margin-top:10px; }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add('mh-gate-lock');

  const gate = document.createElement('div');
  gate.id = 'mhAccessGate';
  gate.innerHTML = '<div class="box"><h1>ACCESS RESTRICTED</h1><p>テスト利用者専用です。アクセスコードを入力してください。</p><input id="mhAccessCode" type="password" autocomplete="off" inputmode="text" aria-label="アクセスコード"><button id="mhAccessSubmit" type="button">入室する</button><div id="mhAccessError" class="error"></div></div>';
  document.documentElement.appendChild(gate);

  const input = gate.querySelector('#mhAccessCode');
  const submit = gate.querySelector('#mhAccessSubmit');
  const error = gate.querySelector('#mhAccessError');

  const digest = async text => {
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  };

  const unlock = () => {
    sessionStorage.setItem(SESSION_KEY, 'ok');
    gate.remove();
    document.documentElement.classList.remove('mh-gate-lock');
    window.dispatchEvent(new Event('mh-access-granted'));
  };

  const check = async () => {
    error.textContent = '';
    submit.disabled = true;
    try {
      if (!window.crypto?.subtle) throw new Error('unsupported');
      if ((await digest(input.value)) === ACCESS_HASH) unlock();
      else error.textContent = 'アクセスコードが正しくありません。';
    } catch {
      error.textContent = 'このブラウザでは認証を利用できません。';
    } finally {
      submit.disabled = false;
    }
  };

  if (sessionStorage.getItem(SESSION_KEY) === 'ok') unlock();
  else {
    submit.addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    setTimeout(() => input.focus(), 0);
  }
})();
