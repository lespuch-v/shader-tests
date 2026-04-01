/**
 * Top-left shader switcher panel.
 * Square buttons, one per registered shader — active button is highlighted.
 */
export function createUI(shaderManager, onSwitch) {
  const style = document.createElement('style');
  style.textContent = `
    #shader-ui {
      position: fixed;
      top: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 100;
    }
    .shader-btn {
      width: 64px;
      height: 64px;
      background: rgba(10, 10, 10, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.55);
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.3;
      padding: 6px;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
      backdrop-filter: blur(4px);
    }
    .shader-btn:hover {
      border-color: rgba(255, 255, 255, 0.35);
      color: rgba(255, 255, 255, 0.85);
      background: rgba(30, 30, 30, 0.85);
    }
    .shader-btn.active {
      border-color: rgba(255, 200, 100, 0.8);
      color: rgba(255, 220, 140, 1);
      background: rgba(40, 28, 10, 0.85);
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'shader-ui';

  const buttons = {};

  for (const shader of shaderManager.registry) {
    const btn = document.createElement('button');
    btn.className = 'shader-btn';
    btn.textContent = shader.name;
    btn.dataset.id  = shader.id;

    btn.addEventListener('click', () => {
      onSwitch(shader.id);
      setActive(shader.id);
    });

    panel.appendChild(btn);
    buttons[shader.id] = btn;
  }

  document.body.appendChild(panel);

  function setActive(id) {
    for (const [bid, btn] of Object.entries(buttons)) {
      btn.classList.toggle('active', bid === id);
    }
  }

  return { setActive };
}
