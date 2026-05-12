const wbAgent = {
  states: [
    {
      status: 'Monitoring systems',
      message: 'Transaction layer stable.',
      tone: 'systems',
    },
    {
      status: 'Analyzing data',
      message: 'Big data pipeline standing by.',
      tone: 'data',
    },
    {
      status: 'Mapping workflows',
      message: 'Portfolio systems ready.',
      tone: 'workflow',
    },
    {
      status: 'Cloud sync ready',
      message: 'Neural model interface online.',
      tone: 'cloud',
    },
    {
      status: 'Security scan idle',
      message: 'Security posture nominal.',
      tone: 'security',
    },
  ],
  currentState: 0,
  elements: {},

  init() {
    this.elements.status = document.getElementById('agent-status');
    this.elements.message = document.getElementById('agent-message');
    this.elements.panel = document.querySelector('.agent-panel');
    this.elements.action = document.getElementById('agent-action');
    this.elements.core = document.getElementById('agent-core');

    this.elements.action?.addEventListener('click', () => this.cycleState());
    this.elements.core?.addEventListener('click', () => this.cycleState());
    this.render();
  },

  cycleState() {
    this.currentState = (this.currentState + 1) % this.states.length;
    this.render();
  },

  render() {
    const state = this.states[this.currentState];

    if (this.elements.status) {
      this.elements.status.textContent = state.status;
    }

    if (this.elements.message) {
      this.elements.message.textContent = state.message;
    }

    if (this.elements.panel) {
      this.elements.panel.dataset.agentTone = state.tone;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => wbAgent.init());
