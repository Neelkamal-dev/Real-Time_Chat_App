export const getTranscriptionPrompt = () => {
  return `
You are an expert audio transcription model.
Transcribe the provided audio recording exactly as spoken.

Requirements:
1. Output ONLY the transcribed text. Do not add metadata (like "Speaker 1:"), explanations, timestamps, or comments.
2. Clean up major stuttering or filler words (like "um", "uh") to make the transcript readable, but preserve all spoken sentences, questions, and statements.
3. If the audio is completely silent or contains only static, output exactly: "[Silence]".
`;
};

export const getAudioSummaryPrompt = (transcript) => {
  return `Provide a very short, one-sentence summary (less than 15 words) of this transcription:\n\n"${transcript}"`;
};
