import {
  Language,
  StructuredSymptoms,
  ModelSuggestion,
  ChatMessage,
  TriageSession,
} from '../types/triage';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  durationSeconds: number;
  provider: string;
  languageDetected: Language;
}

export interface SpeechToTextProvider {
  transcribe(
    sampleAudioIdOrText: string,
    language: Language
  ): Promise<TranscriptionResult>;
}

export interface SymptomExtractionProvider {
  extract(
    transcript: string,
    language: Language,
    currentSymptoms?: StructuredSymptoms
  ): Promise<{
    symptoms: StructuredSymptoms;
    extractedFields: Record<string, unknown>;
    confidence: number;
  }>;
}

export interface UrgencySuggestionProvider {
  suggestUrgency(
    symptoms: StructuredSymptoms,
    transcript: string
  ): Promise<ModelSuggestion>;
}

export interface MessagingProvider {
  sendMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage>;
}

export interface SessionRepository {
  getAllSessions(): Promise<TriageSession[]>;
  getSession(id: string): Promise<TriageSession | null>;
  saveSession(session: TriageSession): Promise<void>;
  updateSession(session: TriageSession): Promise<void>;
  seedInitialSessions(sessions: TriageSession[]): Promise<void>;
}
