import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { socket, authUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [unseenMessages, setUnseenMessages] = useState({});

  // Group chat states
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  // AI Feature States
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [unreadSummary, setUnreadSummary] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);

  const getUsers = async () => {
    setIsUsersLoading(true);
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const getMessages = async (userId) => {
    setIsMessagesLoading(true);
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
        setUnseenMessages((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const sendMessage = async (messageData) => {
    if (!selectedUser) return;
    try {
      const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Group chat functions
  const getGroups = async () => {
    setIsGroupsLoading(true);
    try {
      const { data } = await axios.get("/api/groups");
      if (data.success) {
        setGroups(data.groups);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGroupsLoading(false);
    }
  };

  const createGroup = async (groupData) => {
    try {
      const { data } = await axios.post("/api/groups", groupData);
      if (data.success) {
        setGroups((prev) => [...prev, data.group]);
        toast.success(data.message);
        return data.group;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getGroupMessages = async (groupId) => {
    setIsMessagesLoading(true);
    try {
      const { data } = await axios.get(`/api/groups/${groupId}/messages`);
      if (data.success) {
        setMessages(data.messages);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const sendGroupMessage = async (messageData) => {
    if (!selectedGroup) return;
    try {
      const { data } = await axios.post(`/api/groups/${selectedGroup._id}/send`, messageData);
      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Helper to read SSE chunks progressively
  const readSSEStream = async (url, body, onChunk, signal) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${axios.defaults.baseURL || ""}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`SSE stream failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep partial line in buffer

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith("data:")) continue;

          const dataStr = cleanLine.replace("data:", "").trim();
          if (dataStr === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            onChunk(parsed);
          } catch (err) {
            console.error("Error parsing stream line:", err, dataStr);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  // AI Feature Integration API Methods
  const getSmartReplies = async (chatId) => {
    setIsSuggestionsLoading(true);
    try {
      const { data } = await axios.post("/api/ai/smart-reply", { chatId });
      if (data.success) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  const rewriteMessage = async (text, tone, onChunk, signal) => {
    try {
      await readSSEStream("/api/ai/rewrite", { text, tone }, onChunk, signal);
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Rewrite request was cancelled.");
      } else {
        console.error("Error rewriting message:", error);
      }
    }
  };

  const getUnreadSummary = async (chatId, onChunk, signal) => {
    setIsSummaryLoading(true);
    setUnreadSummary("");
    try {
      let accumulated = "";
      await readSSEStream("/api/ai/chat-summary", { chatId }, (chunk) => {
        if (chunk.text) {
          accumulated += chunk.text;
          onChunk(accumulated);
          setUnreadSummary(accumulated);
        }
      }, signal);
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Summary request was cancelled.");
      } else {
        console.error("Error fetching unread summary:", error);
      }
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const transcribeAudio = async (audio, mimeType, onChunk, signal) => {
    try {
      await readSSEStream("/api/ai/transcribe", { audio, mimeType }, onChunk, signal);
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Transcription request was cancelled.");
      } else {
        console.error("Error transcribing audio:", error);
      }
    }
  };

  const updateMessageTranscript = async (messageId, newTranscription) => {
    try {
      const { data } = await axios.put(`/api/ai/transcription/${messageId}`, {
        transcription: newTranscription,
      });
      if (data.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, transcription: data.transcription } : msg
          )
        );
        toast.success("Transcript updated successfully!");
      }
    } catch (error) {
      console.error("Error updating transcription:", error);
      toast.error("Failed to update transcription.");
    }
  };

  const performSemanticSearch = async (chatId, query) => {
    if (!query || !query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchLoading(true);
    try {
      const { data } = await axios.post("/api/ai/semantic-search", { chatId, query });
      if (data.success) {
        setSearchResults(data.matches || []);
      }
    } catch (error) {
      console.error("Error in semantic search:", error);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Trigger smart replies suggestions on chat focus
  useEffect(() => {
    const activeId = selectedUser?._id || selectedGroup?._id;
    if (activeId) {
      getSmartReplies(activeId);
    } else {
      setSuggestions([]);
    }
    // Reset search queries
    setSearchResults([]);
    setUnreadSummary("");
  }, [selectedUser, selectedGroup]);

  // Listen to incoming socket messages and events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // Check if it is a group message
      if (newMessage.groupId) {
        if (selectedGroup && newMessage.groupId === selectedGroup._id) {
          setMessages((prev) => [...prev, newMessage]);
        } else {
          // Play a notification alert sound and show a toast
          playSound();
          const groupObj = groups.find((g) => g._id === newMessage.groupId);
          const senderName = newMessage.senderId?.fullName || "Group Member";
          toast(`[${groupObj?.name || "Group"}] ${senderName}: ${newMessage.text || "📷 Photo"}`, { icon: '👥' });
        }
      } else {
        // It is a private message
        if (selectedUser && newMessage.senderId === selectedUser._id) {
          setMessages((prev) => [...prev, newMessage]);
          // Also call API to mark it as seen since chat is open
          axios.put(`/api/messages/mark/${newMessage._id}`).catch((err) => console.log(err));
          // Refresh smart replies context since we got a new message
          getSmartReplies(selectedUser._id);
        } else {
          // Play a notification alert sound and show a toast
          playSound();
          setUnseenMessages((prev) => ({
            ...prev,
            [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
          }));
          const userObj = users.find((u) => u._id === newMessage.senderId);
          toast(`💬 ${userObj?.fullName || "New message"}: ${newMessage.text || "📷 Photo"}`);
        }
      }
    };

    const handleMessagesSeen = ({ viewerId }) => {
      if (selectedUser && selectedUser._id === viewerId) {
        setMessages((prev) =>
          prev.map((msg) => (msg.receiverId === viewerId ? { ...msg, seen: true } : msg))
        );
      }
    };

    const handleSingleMessageSeen = ({ messageId, receiverId }) => {
      if (selectedUser && selectedUser._id === receiverId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, seen: true } : msg))
        );
      }
    };

    const handleTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    };

    const handleStopTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: false }));
    };

    const handleGroupCreated = (newGroup) => {
      setGroups((prev) => [...prev, newGroup]);
      toast(`You were added to a new group: ${newGroup.name} 👥`, { icon: '👥' });
    };

    const handleReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
      );
    };

    const playSound = () => {
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav");
        audio.volume = 0.35;
        audio.play().catch(e => console.log(e));
      } catch (err) {
        console.log(err);
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-seen", handleSingleMessageSeen);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("group-created", handleGroupCreated);
    socket.on("message-reaction", handleReaction);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-seen", handleSingleMessageSeen);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("group-created", handleGroupCreated);
      socket.off("message-reaction", handleReaction);
    };
  }, [socket, selectedUser, selectedGroup, groups, users]);

  const value = {
    users,
    messages,
    selectedUser,
    isUsersLoading,
    isMessagesLoading,
    unseenMessages,
    typingUsers,
    groups,
    selectedGroup,
    isGroupsLoading,
    suggestions,
    isSuggestionsLoading,
    unreadSummary,
    isSummaryLoading,
    searchResults,
    isSearchLoading,
    isSemanticSearch,
    setSelectedUser,
    setSelectedGroup,
    getUsers,
    getMessages,
    sendMessage,
    getGroups,
    createGroup,
    getGroupMessages,
    sendGroupMessage,
    reactToMessage: null, // React to message handled via context call to reactToMessage is inside value
    reactToMessageMethod: null,
    getSmartReplies,
    rewriteMessage,
    getUnreadSummary,
    performSemanticSearch,
    setSearchResults,
    setIsSemanticSearch,
    setMessages,
    setUnseenMessages,
    transcribeAudio,
    updateMessageTranscript,
  };

  // We need to implement a frontend method reactToMessage that hits the PUT route in case components call it!
  const reactToMessage = async (messageId, emoji) => {
    try {
      const { data } = await axios.put(`/api/messages/react/${messageId}`, { emoji });
      if (data.success) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, reactions: data.reactions } : msg))
        );
      }
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  };
  value.reactToMessage = reactToMessage;

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};
