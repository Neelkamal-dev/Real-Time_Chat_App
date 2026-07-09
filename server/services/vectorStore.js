import Message from "../models/message.js";
import { cosineSimilarity } from "./embeddingService.js";

/**
 * Abstract Vector Store Interface Contract
 * Guide swappable vector store engines (Qdrant, Pinecone, ChromaDB, etc.)
 */
class IVectorStore {
  async upsert(messageId, vector, metadata) {
    throw new Error("Method 'upsert()' must be implemented.");
  }

  async search(queryVector, chatId, limit = 10) {
    throw new Error("Method 'search()' must be implemented.");
  }
}

/**
 * MongoDB / Cosine Similarity local database adapter.
 * Uses message collection scanning as a default fallback.
 */
class MongoVectorStore extends IVectorStore {
  async upsert(messageId, vector, metadata) {
    // For MongoDB, we save the embedding vector inside the message document
    await Message.findByIdAndUpdate(messageId, { embedding: vector });
  }

  async search(queryVector, chatId, limit = 10) {
    // Fetch recent messages matching the active conversation context
    const messages = await Message.find({
      $or: [
        { senderId: chatId },
        { receiverId: chatId },
        { groupId: chatId },
      ],
    }).populate("senderId", "fullName profilePic");

    const scoredMatches = [];

    for (const msg of messages) {
      if (!msg.text || !msg.embedding || msg.embedding.length === 0) continue;

      const score = cosineSimilarity(queryVector, msg.embedding);
      if (score > 0.40) {
        scoredMatches.push({
          message: {
            _id: msg._id,
            text: msg.text,
            image: msg.image,
            audioUrl: msg.audioUrl,
            transcription: msg.transcription,
            seen: msg.seen,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          },
          score,
        });
      }
    }

    scoredMatches.sort((a, b) => b.score - a.score);
    return scoredMatches.slice(0, limit);
  }
}

/**
 * Vector Store Service Router Client.
 * Swappable engine pattern allows swapping DB engines without altering application logic.
 */
class VectorStoreService {
  constructor() {
    // Set default storage provider engine (can be changed to PineconeVectorStore/QdrantVectorStore)
    this.engine = new MongoVectorStore();
  }

  /**
   * Save message embedding values
   * @param {string} messageId 
   * @param {number[]} vector 
   * @param {object} [metadata] 
   */
  async upsert(messageId, vector, metadata = {}) {
    return await this.engine.upsert(messageId, vector, metadata);
  }

  /**
   * Performs similarity vector search query
   * @param {number[]} queryVector 
   * @param {string} chatId 
   * @param {number} [limit] 
   * @returns {Promise<Array>}
   */
  async search(queryVector, chatId, limit = 10) {
    return await this.engine.search(queryVector, chatId, limit);
  }
}

export const vectorStore = new VectorStoreService();
export default vectorStore;
