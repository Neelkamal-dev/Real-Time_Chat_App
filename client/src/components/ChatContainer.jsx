import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../library/utils";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const { authUser, onlineUsers, socket } = useContext(AuthContext);
  const {
    selectedUser,
    setSelectedUser,
    messages,
    sendMessage,
    isMessagesLoading,
    typingUsers,
  } = useContext(MessageContext);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const scrollEnd = useRef(null);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [isSearchingMsg, setIsSearchingMsg] = useState(false);

  useEffect(() => {
    if (scrollEnd.current) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, imagePreview, typingUsers]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImagePreview(reader.result);
    };
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { receiverId: selectedUser._id });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stopTyping", { receiverId: selectedUser._id });
      setIsTyping(false);
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket?.emit("stopTyping", { receiverId: selectedUser._id });
    setIsTyping(false);

    await sendMessage({
      text: text.trim(),
      image: imagePreview,
    });

    setText("");
    handleRemoveImage();
  };

  if (!selectedUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 bg-black/10 text-white">
        <img src={assets.logo_icon} alt="logo" className="max-w-16 animate-bounce" />
        <p className="text-white text-lg font-medium">Chat anytime, anywhere</p>
      </div>
    );
  }

  const isOnline = onlineUsers.includes(selectedUser._id);
  const isUserTyping = typingUsers[selectedUser._id];

  const filteredMessages = messages.filter((message) => {
    if (!msgSearchQuery.trim()) return true;
    return message.text && message.text.toLowerCase().includes(msgSearchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col justify-between relative backdrop-blur-lg bg-white/5 dark:bg-black/10">
      {/* header part of chat container */}
      <div className="flex items-center gap-3 py-4 mx-4 border-b border-slate-200 dark:border-stone-500">
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          alt={selectedUser.fullName}
          className="w-9 h-9 object-cover rounded-full"
        />
        <div className="flex-1">
          <p className="text-lg font-medium flex items-center gap-2 text-slate-800 dark:text-white">
            {selectedUser.fullName}
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-gray-500"
              }`}
            ></span>
          </p>
          <div className="text-xs">
            {isUserTyping ? (
              <span className="text-purple-500 dark:text-purple-400 font-medium animate-pulse">typing...</span>
            ) : (
              <span className="text-slate-400 dark:text-gray-400">{isOnline ? "Online" : "Offline"}</span>
            )}
          </div>
        </div>

        {/* Message Search Bar */}
        <div className="flex items-center gap-2">
          {isSearchingMsg && (
            <input
              type="text"
              value={msgSearchQuery}
              onChange={(e) => setMsgSearchQuery(e.target.value)}
              placeholder="Search in chat..."
              className="bg-slate-200/50 dark:bg-gray-800/40 text-slate-800 dark:text-white text-xs px-3 py-1.5 rounded-full border border-slate-300 dark:border-gray-700/50 outline-none w-28 sm:w-40 transition-all bg-transparent"
            />
          )}
          <img
            onClick={() => {
              setIsSearchingMsg(!isSearchingMsg);
              if (isSearchingMsg) setMsgSearchQuery("");
            }}
            src={assets.search_icon}
            alt="Search in chat"
            className="w-4 cursor-pointer hover:opacity-85 filter dark:invert invert transition-all"
          />
        </div>

        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt="Back"
          className="md:hidden max-w-7 cursor-pointer filter dark:invert invert"
        />
      </div>

      {/* messages part of chat container */}
      <div className="flex-1 overflow-y-scroll p-4 space-y-4">
        {isMessagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>Say hello to {selectedUser.fullName}! 👋</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>No messages match "{msgSearchQuery}"</p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const isSentByMe = message.senderId === authUser._id;
            return (
              <div
                key={message._id}
                className={`flex gap-3 max-w-[80%] ${
                  isSentByMe ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <img
                  src={
                    isSentByMe
                      ? (authUser.profilePic || assets.avatar_icon)
                      : (selectedUser.profilePic || assets.avatar_icon)
                  }
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover self-end shadow-sm"
                />
                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3 rounded-2xl break-words text-sm ${
                      isSentByMe
                        ? "bg-violet-600 text-white rounded-br-none dark:bg-violet-600/40"
                        : "bg-slate-200 text-slate-800 rounded-bl-none dark:bg-gray-700/40 dark:text-white"
                    }`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="shared content"
                        className="max-w-[200px] sm:max-w-[280px] rounded-lg mb-2 cursor-pointer border border-slate-300 dark:border-gray-700 hover:opacity-90"
                        onClick={() => window.open(message.image)}
                      />
                    )}
                    {message.text && <p>{message.text}</p>}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 ${
                      isSentByMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {isSentByMe && (
                      message.seen ? (
                        <span className="text-blue-500 dark:text-blue-400 font-bold text-[11px]" title="Seen">✓✓</span>
                      ) : (
                        <span className="text-gray-400 text-[11px]" title="Sent">✓</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Real-time typing bubble */}
        {isUserTyping && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <img
              src={selectedUser.profilePic || assets.avatar_icon}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover self-end shadow-sm"
            />
            <div className="bg-slate-200 text-slate-800 rounded-2xl rounded-bl-none p-3 dark:bg-gray-700/40 dark:text-gray-300">
              <span className="flex gap-1 items-center h-4 py-1">
                <span className="h-1.5 w-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1.5 w-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1.5 w-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </div>
          </div>
        )}

        <div ref={scrollEnd}></div>
      </div>

      {/* ------- bottom image preview ------- */}
      {imagePreview && (
        <div className="absolute bottom-16 left-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded-lg flex items-center gap-2 z-10 shadow-xl">
          <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded" />
          <button
            onClick={handleRemoveImage}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------- bottom input area -------  */}
      <form onSubmit={handleSend} className="p-4 flex items-center gap-3">
        <div className="flex-1 flex items-center bg-slate-100 dark:bg-gray-800/40 px-3 rounded-full border border-slate-200 dark:border-gray-700/50 shadow-inner">
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Send a message..."
            className="flex-1 text-sm p-3 bg-transparent border-none rounded-lg outline-none text-slate-800 dark:text-white placeholder-gray-400"
          />
          <input
            type="file"
            id="image-file"
            accept="image/png, image/jpeg, image/jpg"
            hidden
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <label htmlFor="image-file">
            <img
              src={assets.gallery_icon}
              alt="gallery"
              className="w-5 mr-1 cursor-pointer hover:opacity-85 filter dark:invert invert transition-all"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="cursor-pointer bg-gradient-to-r from-purple-400 to-violet-600 p-2.5 rounded-full hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md"
        >
          <img src={assets.send_button} alt="Send" className="w-5 h-5 filter invert" />
        </button>
      </form>
    </div>
  );
};

export default ChatContainer;
