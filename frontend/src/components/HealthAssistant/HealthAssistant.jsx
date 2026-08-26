import React, { useState, useEffect, useRef } from "react";
import { SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { MessageCircle, X, Send, RotateCcw, AlertTriangle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import {
  sendSymptomCheck,
  getLatestConversation,
  createConversation,
} from "../../services/aiApi";
import { setClerkTokenGetter } from "../../services/api";

const QUICK_ACTIONS = [
  { label: "Fever", emoji: "🤒", message: "I have a fever" },
  { label: "Headache", emoji: "🤕", message: "I have a headache" },
  { label: "Cold/Cough", emoji: "🤧", message: "I have a cold and cough" },
  { label: "Medicine Question", emoji: "💊", message: "I have a question about medication" },
];

const DISCLAIMER =
  "This assistant provides preliminary health information and is not a substitute for professional medical diagnosis or treatment.";

export default function HealthAssistant() {
  const { getToken, isLoaded } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [showEmergencyWarning, setShowEmergencyWarning] = useState(false);
  const [showAppointmentButton, setShowAppointmentButton] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Set up Clerk token getter for API client
  useEffect(() => {
    if (isLoaded && getToken) {
      setClerkTokenGetter(getToken);
    }
  }, [isLoaded, getToken]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      loadLatestConversation();
    }
  }, [isOpen]);

  // Load latest conversation when chatbot opens
  const loadLatestConversation = async () => {
    try {
      const conversation = await getLatestConversation();
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        setConversationId(conversation.conversation_id);
        // Convert backend messages to frontend format
        const formattedMessages = conversation.messages.map((msg) => ({
          id: msg.id,
          sender: msg.sender,
          message: msg.message,
          timestamp: msg.createdAt,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  // Start a new conversation
  const handleNewConversation = async () => {
    try {
      const newConversation = await createConversation();
      setConversationId(newConversation.conversation_id);
      setMessages([]);
      setError(null);
      setShowEmergencyWarning(false);
      setShowAppointmentButton(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setError("Unable to start a new conversation. Please try again.");
    }
  };

  // Send message to AI
  const handleSendMessage = async (messageText = null) => {
    const message = messageText || inputValue.trim();
    if (!message || isLoading) return;

    // Add user message to UI
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendSymptomCheck(message, conversationId);

      if (response.success && response.data) {
        const { data } = response;

        // Update conversation ID if new
        if (data.conversation_id && data.conversation_id !== conversationId) {
          setConversationId(data.conversation_id);
        }

        // Add assistant message
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          message: data.response,
          timestamp: new Date().toISOString(),
          severity: data.severity,
          requiresUrgentAttention: data.requires_urgent_attention,
          recommendAppointment: data.recommend_appointment,
          disclaimer: data.disclaimer,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Show emergency warning if needed
        if (data.requires_urgent_attention) {
          setShowEmergencyWarning(true);
        }

        // Show appointment button if recommended
        if (data.recommend_appointment) {
          setShowAppointmentButton(true);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err.message || "Unable to process your request. Please try again.");

      // Add error message to chat
      const errorMessage = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        message: "I'm temporarily unable to process your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle quick action click
  const handleQuickAction = (action) => {
    handleSendMessage(action.message);
  };

  // Retry last message
  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === "user");
    if (lastUserMessage) {
      // Remove error messages
      setMessages((prev) => prev.filter((m) => !m.isError));
      handleSendMessage(lastUserMessage.message);
    }
  };

  return (
    <SignedIn>
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold"
            aria-label="Open Health Assistant"
          >
            <MessageCircle size={20} />
            <span className="hidden sm:inline">Health Assistant</span>
          </button>
        )}

        {/* Chat Window */}
        {isOpen && (
          <div className="w-[calc(100vw-2rem)] sm:w-96 h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} />
                <h3 className="font-semibold text-sm">Health Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewConversation}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="New conversation"
                  title="New conversation"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Close chat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-700">
                      👋 Hi! I can help you understand your symptoms and provide preliminary guidance.
                    </p>
                    <p className="text-sm text-slate-700 mt-2">What are you experiencing?</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action)}
                        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-medium text-slate-700 transition-all"
                      >
                        <span>{action.emoji}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message History */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : msg.isError
                        ? "bg-red-50 text-red-700 border border-red-200 rounded-tl-sm"
                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Warning */}
              {showEmergencyWarning && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-semibold text-red-900 text-sm">Urgent Medical Attention</h4>
                      <p className="text-red-700 text-xs mt-1">
                        Your symptoms may require urgent medical attention. Please seek emergency medical care immediately.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Button */}
              {showAppointmentButton && !showEmergencyWarning && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <Link
                    to="/appointments"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Calendar size={16} />
                    <span>Book an Appointment</span>
                  </Link>
                </div>
              )}

              {/* Error with Retry */}
              {error && !isLoading && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw size={14} />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 p-3 bg-white">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your symptoms..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Message input"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-slate-500 mt-2 text-center">
                {DISCLAIMER}
              </p>
            </div>
          </div>
        )}
      </div>
    </SignedIn>
  );
}
