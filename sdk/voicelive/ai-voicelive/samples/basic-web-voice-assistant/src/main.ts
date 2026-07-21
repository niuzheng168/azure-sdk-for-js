// Main entry point for Voice Live Web Assistant
import { VoiceAssistant } from './voiceAssistant.js';
import type { VoiceAssistantConfig, VoiceAssistantCallbacks } from './voiceAssistant.js';

class WebVoiceAssistantApp {
  private voiceAssistant: VoiceAssistant;
  private eventCount = 0;
  private filterEvents = true;

  // DOM elements
  private connectBtn!: HTMLButtonElement;
  private startBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private connectionStatus!: HTMLElement;
  private assistantStatus!: HTMLElement;
  private audioStatus!: HTMLElement;
  private levelBar!: HTMLElement;
  private conversationHistory!: HTMLElement;
  private eventHistory!: HTMLElement;
  private eventsSection!: HTMLElement;
  private errorModal!: HTMLElement;
  private errorMessage!: HTMLElement;
  
  constructor() {
    this.voiceAssistant = new VoiceAssistant();
    this.initializeDOM();
    this.setupEventHandlers();
    this.setupVoiceAssistantCallbacks();
  }

  private initializeDOM(): void {
    // Get DOM elements
    this.connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.connectionStatus = document.getElementById('connectionStatus')!;
    this.assistantStatus = document.getElementById('assistantStatus')!;
    this.audioStatus = document.getElementById('audioStatus')!;
    this.levelBar = document.getElementById('levelBar')!;
    this.conversationHistory = document.getElementById('conversationHistory')!;
    this.eventHistory = document.getElementById('eventHistory')!;
    this.eventsSection = document.getElementById('eventsSection')!;
    this.errorModal = document.getElementById('errorModal')!;
    this.errorMessage = document.getElementById('errorMessage')!;
  }

  private setupEventHandlers(): void {
    // Connect button
    this.connectBtn.addEventListener('click', () => {
      if (this.voiceAssistant.connectionStatus === 'connected') {
        this.handleDisconnect();
      } else {
        this.handleConnect();
      }
    });

    // Start conversation button
    this.startBtn.addEventListener('click', () => {
      this.handleStartConversation();
    });

    // Stop conversation button
    this.stopBtn.addEventListener('click', () => {
      this.handleStopConversation();
    });

    // Clear history button
    const clearHistoryBtn = document.getElementById('clearHistory')!;
    clearHistoryBtn.addEventListener('click', () => {
      this.clearConversationHistory();
    });

    // Show events button
    const showEventsBtn = document.getElementById('showEvents')!;
    showEventsBtn.addEventListener('click', () => {
      this.toggleEventsSection();
    });

    // Clear events button
    const clearEventsBtn = document.getElementById('clearEvents')!;
    clearEventsBtn.addEventListener('click', () => {
      this.clearEventHistory();
    });

    // Filter events checkbox
    const filterEventsCheckbox = document.getElementById('filterEvents') as HTMLInputElement;
    filterEventsCheckbox.addEventListener('change', (e) => {
      this.filterEvents = (e.target as HTMLInputElement).checked;
    });

    // Error modal close button
    const closeErrorBtn = document.getElementById('closeError')!;
    closeErrorBtn.addEventListener('click', () => {
      this.hideError();
    });

    // Handle target and auth method changes
    const targetTypeRadios = document.querySelectorAll('input[name="targetType"]');
    targetTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateTargetConfigurationUI();
      });
    });

    const authMethodRadios = document.querySelectorAll('input[name="authMethod"]');
    authMethodRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateAuthenticationUI();
      });
    });

    // Load saved settings
    this.loadSettings();
    this.updateTargetConfigurationUI();
  }

  private setupVoiceAssistantCallbacks(): void {
    const callbacks: VoiceAssistantCallbacks = {
      onConnectionStatusChange: (status) => {
        this.updateConnectionStatus(status);
      },
      onAssistantStatusChange: (status) => {
        this.updateAssistantStatus(status);
      },
      onConversationMessage: (message) => {
        this.addConversationMessage(message);
      },
      onConversationMessageUpdate: (message) => {
        this.updateConversationMessage(message);
      },
      onEventReceived: (event) => {
        this.addEvent(event);
      },
      onError: (error) => {
        this.showError(error);
      },
      onAudioLevel: (level) => {
        this.updateAudioLevel(level);
      }
    };

    this.voiceAssistant.setCallbacks(callbacks);
  }

  private async handleConnect(): Promise<void> {
    try {
      const config = this.getConfiguration();
      this.saveSettings(config);
      
      this.connectBtn.disabled = true;
      this.connectBtn.textContent = 'Connecting...';
      
      await this.voiceAssistant.connect(config);
      
      this.connectBtn.textContent = 'Disconnect';
      this.connectBtn.disabled = false;
      this.startBtn.disabled = false;
      
    } catch (error) {
      this.connectBtn.textContent = 'Connect';
      this.connectBtn.disabled = false;
      this.showError(`Connection failed: ${error}`);
    }
  }

  private async handleDisconnect(): Promise<void> {
    try {
      this.connectBtn.disabled = true;
      await this.voiceAssistant.disconnect();
      
      this.connectBtn.textContent = 'Connect';
      this.connectBtn.disabled = false;
      this.startBtn.disabled = true;
      this.stopBtn.disabled = true;
      
    } catch (error) {
      this.showError(`Disconnect failed: ${error}`);
    }
  }

  private async handleStartConversation(): Promise<void> {
    try {
      this.startBtn.disabled = true;
      this.startBtn.textContent = 'Starting...';
      
      await this.voiceAssistant.startConversation();
      
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.updateAudioStatus('Active');
      
    } catch (error) {
      this.startBtn.textContent = 'Start Conversation';
      this.startBtn.disabled = false;
      this.showError(`Failed to start conversation: ${error}`);
    }
  }

  private handleStopConversation(): void {
    try {
      this.voiceAssistant.stopConversation();
      
      this.startBtn.textContent = 'Start Conversation';
      this.startBtn.disabled = false;
      this.stopBtn.disabled = true;
      this.updateAudioStatus('Not Active');
      
    } catch (error) {
      this.showError(`Failed to stop conversation: ${error}`);
    }
  }

  private getConfiguration(): VoiceAssistantConfig {
    const endpoint = (document.getElementById('endpoint') as HTMLInputElement).value.trim();
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
    const voice = (document.getElementById('voice') as HTMLSelectElement).value;
    const instructions = (document.getElementById('instructions') as HTMLTextAreaElement).value;
    const debugMode = (document.getElementById('debugMode') as HTMLInputElement).checked;
    const targetTypeElement = document.querySelector(
      'input[name="targetType"]:checked'
    ) as HTMLInputElement | null;
    const targetType = targetTypeElement?.value === 'voice-agent' ? 'voice-agent' : 'voice-live';
    const authMethodElement = document.querySelector('input[name="authMethod"]:checked') as HTMLInputElement;
    const useTokenCredential =
      targetType === 'voice-agent' ||
      (authMethodElement ? authMethodElement.value === 'token' : false);

    if (!endpoint) {
      throw new Error('Endpoint is required');
    }

    if (targetType === 'voice-agent') {
      let voiceAgentUrl: URL;
      try {
        voiceAgentUrl = new URL(endpoint);
      } catch {
        throw new Error('Voice Agent WebSocket URL is invalid');
      }
      if (
        !['ws:', 'wss:'].includes(voiceAgentUrl.protocol) ||
        !voiceAgentUrl.pathname.endsWith('/endpoint/protocols/voice')
      ) {
        throw new Error('Enter a ws:// or wss:// Agents protocols/voice endpoint');
      }
    }

    if (!useTokenCredential && !apiKey) {
      throw new Error('API key is required when using API key authentication');
    }

    return {
      targetType,
      endpoint,
      apiKey,
      voice,
      instructions,
      debugMode,
      useTokenCredential
    };
  }

  private updateTargetConfigurationUI(): void {
    const targetType = (
      document.querySelector('input[name="targetType"]:checked') as HTMLInputElement | null
    )?.value;
    const isVoiceAgent = targetType === 'voice-agent';
    const endpointLabel = document.getElementById('endpointLabel')!;
    const endpointInput = document.getElementById('endpoint') as HTMLInputElement;
    const endpointHelp = document.getElementById('endpointHelp')!;
    const targetHelp = document.getElementById('targetHelp')!;
    const apiKeyRadio = document.querySelector(
      'input[name="authMethod"][value="apikey"]'
    ) as HTMLInputElement;
    const tokenRadio = document.querySelector(
      'input[name="authMethod"][value="token"]'
    ) as HTMLInputElement;
    const voiceConfig = document.getElementById('voiceConfig')!;
    const instructionsConfig = document.getElementById('instructionsConfig')!;
    const voiceInput = document.getElementById('voice') as HTMLSelectElement;
    const instructionsInput = document.getElementById('instructions') as HTMLTextAreaElement;
    const agentManagedConfigNote = document.getElementById('agentManagedConfigNote')!;

    endpointLabel.textContent = isVoiceAgent
      ? 'Voice Agent WebSocket URL:'
      : 'Voice Live Endpoint:';
    endpointInput.placeholder = isVoiceAgent
      ? 'wss://agents.<region>.hyena.infra.ai.azure.com/.../endpoint/protocols/voice'
      : 'https://your-resource.services.ai.azure.com';
    endpointHelp.textContent = isVoiceAgent
      ? 'Paste the complete Agents protocols/voice WebSocket URL. Missing api-version and agent_session_id values are added locally.'
      : 'Enter the HTTPS endpoint shown on your Voice Live resource.';
    targetHelp.textContent = isVoiceAgent
      ? 'Connect to an existing voice agent that exposes the Voice Live realtime protocol.'
      : 'Connect to a Voice Live resource and configure the session below.';

    apiKeyRadio.disabled = isVoiceAgent;
    if (isVoiceAgent) {
      tokenRadio.click();
    }

    voiceInput.disabled = isVoiceAgent;
    instructionsInput.disabled = isVoiceAgent;
    voiceConfig.classList.toggle('config-disabled', isVoiceAgent);
    instructionsConfig.classList.toggle('config-disabled', isVoiceAgent);
    agentManagedConfigNote.classList.toggle('hidden', !isVoiceAgent);
    this.updateAuthenticationUI();
  }

  private updateAuthenticationUI(): void {
    const targetType = (
      document.querySelector('input[name="targetType"]:checked') as HTMLInputElement | null
    )?.value;
    const authMethod = (
      document.querySelector('input[name="authMethod"]:checked') as HTMLInputElement | null
    )?.value;
    const useTokenCredential = targetType === 'voice-agent' || authMethod === 'token';
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const apiKeyContainer = document.getElementById('apiKeyConfig')!;

    apiKeyContainer.style.display = useTokenCredential ? 'none' : 'flex';
    apiKeyInput.required = !useTokenCredential;
  }

  private updateConnectionStatus(status: string): void {
    this.connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    this.connectionStatus.className = `status-value ${status}`;
  }

  private updateAssistantStatus(status: string): void {
    this.assistantStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    this.assistantStatus.className = `status-value ${status}`;
  }

  private updateAudioStatus(status: string): void {
    this.audioStatus.textContent = status;
  }

  private updateAudioLevel(level: number): void {
    this.levelBar.style.width = `${level}%`;
  }

  private addConversationMessage(message: { role: string; content: string; timestamp: Date }): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = `[${message.timestamp.toLocaleTimeString()}] ${message.role}:`;
    
    const content = document.createElement('span');
    content.className = 'content';
    content.textContent = message.content;
    
    messageDiv.appendChild(timestamp);
    messageDiv.appendChild(content);
    
    this.conversationHistory.appendChild(messageDiv);
    this.conversationHistory.scrollTop = this.conversationHistory.scrollHeight;
  }

  private updateConversationMessage(message: { role: string; content: string; timestamp: Date; messageId?: string; isStreaming?: boolean }): void {
    if (!message.messageId) {
      // Fallback to regular message if no ID provided
      this.addConversationMessage(message);
      return;
    }

    // Look for existing message with this ID
    let existingMessage = document.querySelector(`[data-message-id="${message.messageId}"]`) as HTMLElement;
    
    if (!existingMessage) {
      // Create new message if it doesn't exist
      existingMessage = document.createElement('div');
      existingMessage.className = `message ${message.role}`;
      existingMessage.setAttribute('data-message-id', message.messageId);
      
      const timestamp = document.createElement('span');
      timestamp.className = 'timestamp';
      timestamp.textContent = `[${message.timestamp.toLocaleTimeString()}] ${message.role}:`;
      
      const content = document.createElement('span');
      content.className = 'content';
      content.textContent = message.content;
      
      // Add streaming indicator if needed
      if (message.isStreaming) {
        content.classList.add('streaming');
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        cursor.textContent = '▋';
        content.appendChild(cursor);
      }
      
      existingMessage.appendChild(timestamp);
      existingMessage.appendChild(content);
      
      this.conversationHistory.appendChild(existingMessage);
    } else {
      // Update existing message content
      const contentSpan = existingMessage.querySelector('.content') as HTMLElement;
      if (contentSpan) {
        // Remove any existing cursor
        const existingCursor = contentSpan.querySelector('.typing-cursor');
        if (existingCursor) {
          existingCursor.remove();
        }
        
        contentSpan.textContent = message.content;
        
        // Add/remove streaming indicator
        if (message.isStreaming) {
          contentSpan.classList.add('streaming');
          const cursor = document.createElement('span');
          cursor.className = 'typing-cursor';
          cursor.textContent = '▋';
          contentSpan.appendChild(cursor);
        } else {
          contentSpan.classList.remove('streaming');
        }
      }
    }
    
    // Auto-scroll to bottom
    this.conversationHistory.scrollTop = this.conversationHistory.scrollHeight;
  }

  private addEvent(event: { type: string; data: any; timestamp: Date }): void {
    // Filter events if enabled
    if (this.filterEvents && !this.isImportantEvent(event.type)) {
      return;
    }

    this.eventCount++;
    this.updateEventCount();

    const eventDiv = document.createElement('div');
    eventDiv.className = 'event server';
    
    const typeSpan = document.createElement('div');
    typeSpan.className = 'event-type';
    typeSpan.textContent = `[${event.timestamp.toLocaleTimeString()}] ${event.type}`;
    
    const dataSpan = document.createElement('div');
    dataSpan.className = 'event-data';
    dataSpan.textContent = JSON.stringify(event.data, null, 2);
    
    eventDiv.appendChild(typeSpan);
    eventDiv.appendChild(dataSpan);
    
    this.eventHistory.appendChild(eventDiv);
    this.eventHistory.scrollTop = this.eventHistory.scrollHeight;
  }

  private isImportantEvent(eventType: string): boolean {
    const importantEvents = [
      'connected',
      'disconnected',
      'error',
      'session.created',
      'session.updated',
      'response.created',
      'response.done',
      'speech.started',
      'speech.stopped'
    ];
    return importantEvents.includes(eventType);
  }

  private clearConversationHistory(): void {
    this.conversationHistory.innerHTML = `
      <div class="message system">
        <span class="timestamp">[System]</span>
        <span class="content">Conversation history cleared.</span>
      </div>
    `;
  }

  private clearEventHistory(): void {
    this.eventHistory.innerHTML = '';
    this.eventCount = 0;
    this.updateEventCount();
  }

  private updateEventCount(): void {
    const countSpan = document.querySelector('.event-count');
    if (countSpan) {
      countSpan.textContent = `(${this.eventCount})`;
    }
  }

  private toggleEventsSection(): void {
    const isHidden = this.eventsSection.classList.contains('hidden');
    if (isHidden) {
      this.eventsSection.classList.remove('hidden');
      const showBtn = document.getElementById('showEvents')!;
      showBtn.textContent = 'Hide Events';
    } else {
      this.eventsSection.classList.add('hidden');
      const showBtn = document.getElementById('showEvents')!;
      showBtn.textContent = 'Show Events';
    }
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorModal.classList.remove('hidden');
    console.error('Voice Assistant Error:', message);
  }

  private hideError(): void {
    this.errorModal.classList.add('hidden');
  }

  private saveSettings(config: VoiceAssistantConfig): void {
    try {
      localStorage.setItem('voiceLiveSettings', JSON.stringify({
        targetType: config.targetType,
        endpoint: config.endpoint,
        voice: config.voice,
        instructions: config.instructions,
        useTokenCredential: config.useTokenCredential
        // Note: We don't save API key for security
      }));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('voiceLiveSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        
        if (settings.targetType === 'voice-agent' || settings.targetType === 'voice-live') {
          const targetRadio = document.querySelector(
            `input[name="targetType"][value="${settings.targetType}"]`
          ) as HTMLInputElement | null;
          targetRadio?.click();
        }
        if (settings.endpoint) {
          (document.getElementById('endpoint') as HTMLInputElement).value = settings.endpoint;
        }
        if (settings.voice) {
          (document.getElementById('voice') as HTMLSelectElement).value = settings.voice;
        }
        if (settings.instructions) {
          (document.getElementById('instructions') as HTMLTextAreaElement).value = settings.instructions;
        }
        if (
          settings.targetType !== 'voice-agent' &&
          typeof settings.useTokenCredential === 'boolean'
        ) {
          const authMethod = settings.useTokenCredential ? 'token' : 'apikey';
          const authRadio = document.querySelector(
            `input[name="authMethod"][value="${authMethod}"]`
          ) as HTMLInputElement | null;
          authRadio?.click();
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  // Cleanup on page unload
  cleanup(): void {
    this.voiceAssistant.cleanup();
  }

  // Expose for dev utilities  
  getVoiceAssistant() {
    return this.voiceAssistant;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new WebVoiceAssistantApp();
  
  // Expose for development
  (window as any).voiceAssistantApp = app;
  (window as any).voiceAssistant = app.getVoiceAssistant();
  
  // Hot reload indicator
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    console.log('🔥 Hot reload enabled - SDK changes will auto-update');
    
    // Show reload indicator in dev mode
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      font-family: monospace;
    `;
    indicator.textContent = '🔥 DEV MODE';
    document.body.appendChild(indicator);
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    app.cleanup();
  });
});

// Handle user activation requirement for audio context
document.addEventListener('click', () => {
  // This ensures audio context can be created when user interacts
}, { once: true });
