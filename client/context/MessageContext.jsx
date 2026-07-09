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
        // Clear unseen messages locally for this user
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

  // Listen to incoming socket messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // If the message is from our selected user, append to messages list
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        setMessages((prev) => [...prev, newMessage]);
        // Also call API to mark it as seen since chat is open
        axios.put(`/api/messages/mark/${newMessage._id}`).catch((err) => console.log(err));
      } else {
        // Otherwise increment unseen count
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
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

    socket.on("new-message", handleNewMessage);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-seen", handleSingleMessageSeen);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-seen", handleSingleMessageSeen);
    };
  }, [socket, selectedUser]);

  const value = {
    users,
    messages,
    selectedUser,
    isUsersLoading,
    isMessagesLoading,
    unseenMessages,
    setSelectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setMessages,
    setUnseenMessages,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};
