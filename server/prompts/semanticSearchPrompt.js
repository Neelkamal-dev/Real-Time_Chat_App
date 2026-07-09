export const getSemanticSearchPrompt = (query) => {
  return `
Refine the following search query to optimize it for semantic matching and keyword similarity search in a chat logs database.
Remove conversational filler words (e.g. "where did", "when did", "do you know if").

Query: "${query}"

Output ONLY the optimized core terms. Do not add descriptions or comments.
`;
};
