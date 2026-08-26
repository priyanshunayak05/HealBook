import api from "./api";

/**
 * AI Health Assistant API Service
 * Handles all communication with the backend AI endpoints
 */

/**
 * Send a symptom check message to the AI assistant
 * @param {string} message - The patient's symptom description
 * @param {string} conversationId - Optional conversation ID to continue existing conversation
 * @returns {Promise<Object>} Response with conversation_id, response, severity, etc.
 */
export const sendSymptomCheck = async (message, conversationId = null) => {
  try {
    const payload = { message };
    if (conversationId) {
      payload.conversationId = conversationId;
    }

    const response = await api.post("/api/ai/symptom-check", payload);
    return response.data;
  } catch (error) {
    // Handle rate limiting
    if (error.response?.status === 429) {
      throw new Error("You're sending messages too quickly. Please wait a moment and try again.");
    }
    
    // Handle validation errors
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || "Invalid message. Please try again.");
    }
    
    // Handle auth errors
    if (error.response?.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      throw new Error("The health assistant is temporarily unavailable. Please try again later.");
    }
    
    // Handle network errors
    if (error.code === "ECONNABORTED" || !error.response) {
      throw new Error("Network error. Please check your connection and try again.");
    }
    
    throw new Error("Unable to process your request. Please try again.");
  }
};

/**
 * Get the latest conversation for the authenticated patient
 * @returns {Promise<Object|null>} Latest conversation or null if none exists
 */
export const getLatestConversation = async () => {
  try {
    const response = await api.get("/api/ai/conversations/latest");
    return response.data.data;
  } catch (error) {
    // If no conversation exists, return null
    if (error.response?.status === 404) {
      return null;
    }
    console.error("Failed to fetch latest conversation:", error);
    return null;
  }
};

/**
 * Create a new conversation
 * @returns {Promise<Object>} New conversation with conversation_id
 */
export const createConversation = async () => {
  try {
    const response = await api.post("/api/ai/conversations");
    return response.data.data;
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw new Error("Unable to start a new conversation. Please try again.");
  }
};

/**
 * Get a specific conversation by ID
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object>} Conversation with messages
 */
export const getConversationById = async (conversationId) => {
  try {
    const response = await api.get(`/api/ai/conversations/${conversationId}`);
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    throw new Error("Unable to load conversation. Please try again.");
  }
};

/**
 * Get list of all conversations for the patient
 * @param {number} limit - Maximum number of conversations to fetch
 * @param {number} skip - Number of conversations to skip (for pagination)
 * @returns {Promise<Object>} List of conversations with metadata
 */
export const getConversations = async (limit = 20, skip = 0) => {
  try {
    const response = await api.get("/api/ai/conversations", {
      params: { limit, skip },
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return { conversations: [], total: 0 };
  }
};
