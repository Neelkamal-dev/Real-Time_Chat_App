export const getSummaryPrompt = (messages) => {
  return `
You are a summarizing assistant. Given the following series of unread messages from a chat conversation, generate a short bullet-point summary.
Focus on key action items, agreements, important news, or timeline changes.

Unread messages list:
${JSON.stringify(messages, null, 2)}

Requirements:
1. Provide a concise bullet-point summary (maximum 4-5 points).
2. Output ONLY the bullet points (starting with "• " or "- ").
3. Do not include introductory text (like "Here is the summary:") or closing remarks.
4. Keep the summary objective and brief.
`;
};
