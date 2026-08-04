import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  deleteConversation as apiDeleteConversation,
  fetchConversation,
  fetchConversationHistory,
  regenerateResponse as apiRegenerateResponse,
  sendMessage as apiSendMessage,
} from "../services/chatService";
import { getErrorMessage } from "../utils/errorMessage";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const list = await fetchConversationHistory();
      setConversations(list);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't load your conversation history."));
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  const selectConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      startNewChat();
      return;
    }
    setActiveConversationId(conversationId);
    setIsLoadingConversation(true);
    try {
      const detail = await fetchConversation(conversationId);
      setMessages(detail.messages);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't load that conversation."));
      setMessages([]);
    } finally {
      setIsLoadingConversation(false);
    }
  }, [startNewChat]);

  const send = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const optimisticUserMessage = {
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        _pending: true,
      };
      setMessages((prev) => [...prev, optimisticUserMessage]);
      setIsSending(true);

      try {
        const result = await apiSendMessage({
          message: trimmed,
          conversationId: activeConversationId,
        });

        setMessages((prev) => {
          const withoutPendingFlag = prev.map((m) =>
            m === optimisticUserMessage ? { ...m, _pending: false } : m
          );
          return [...withoutPendingFlag, result.message];
        });

        const isNewConversation = !activeConversationId;
        setActiveConversationId(result.conversationId);

        if (isNewConversation) {
          await loadHistory();
        } else {
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === result.conversationId
                ? { ...c, updatedAt: new Date().toISOString(), lastMessagePreview: result.message.content.slice(0, 80) }
                : c
            );
            // Move the updated conversation to the top.
            const idx = updated.findIndex((c) => c.id === result.conversationId);
            if (idx > 0) {
              const [item] = updated.splice(idx, 1);
              updated.unshift(item);
            }
            return updated;
          });
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "The AI didn't respond. Please try again."));
        // Roll back the optimistic user message so the input can be retried cleanly.
        setMessages((prev) => prev.filter((m) => m !== optimisticUserMessage));
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, isSending, loadHistory]
  );

  const regenerate = useCallback(async () => {
    if (!activeConversationId || isRegenerating || isSending) return;
    setIsRegenerating(true);
    setMessages((prev) => (prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev));

    try {
      const result = await apiRegenerateResponse(activeConversationId);
      setMessages((prev) => [...prev, result.message]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't regenerate that response."));
      // Reload the conversation from the server to recover a consistent state.
      selectConversation(activeConversationId);
    } finally {
      setIsRegenerating(false);
    }
  }, [activeConversationId, isRegenerating, isSending, selectConversation]);

  const removeConversation = useCallback(
    async (conversationId) => {
      try {
        await apiDeleteConversation(conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (conversationId === activeConversationId) {
          startNewChat();
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't delete that conversation."));
      }
    },
    [activeConversationId, startNewChat]
  );

  const value = {
    conversations,
    isLoadingHistory,
    activeConversationId,
    messages,
    isLoadingConversation,
    isSending,
    isRegenerating,
    startNewChat,
    selectConversation,
    send,
    regenerate,
    removeConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
