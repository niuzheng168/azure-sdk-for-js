export type VoiceAssistantTargetType = "voice-live" | "voice-agent";

export function isVoiceAgentWebSocketUrl(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (
      (url.protocol === "ws:" || url.protocol === "wss:") &&
      url.pathname.endsWith("/endpoint/protocols/voice")
    );
  } catch {
    return false;
  }
}

export function resolveVoiceAssistantTargetType(
  selectedTargetType: VoiceAssistantTargetType,
  endpoint: string,
): VoiceAssistantTargetType {
  return isVoiceAgentWebSocketUrl(endpoint) ? "voice-agent" : selectedTargetType;
}
