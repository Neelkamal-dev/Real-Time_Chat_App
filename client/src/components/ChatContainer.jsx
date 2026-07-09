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
    selectedGroup,
    setSelectedGroup,
    sendGroupMessage,
    unseenMessages,
    // AI Feature variables & methods
    suggestions,
    isSuggestionsLoading,
    unreadSummary,
    isSummaryLoading,
    searchResults,
    isSearchLoading,
    isSemanticSearch,
    rewriteMessage,
    getUnreadSummary,
    transcribeAudio,
    updateMessageTranscript,
    performSemanticSearch,
    setIsSemanticSearch,
  } = useContext(MessageContext);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const scrollEnd = useRef(null);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [isSearchingMsg, setIsSearchingMsg] = useState(false);

  // Voice Note states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);

  // Transcription controls states
  const [editingTranscriptIds, setEditingTranscriptIds] = useState({});
  const [editTranscriptTexts, setEditTranscriptTexts] = useState({});
  const [expandedSummaryIds, setExpandedSummaryIds] = useState({});

  // Live streaming voice transcription
  const [streamingTranscript, setStreamingTranscript] = useState("");
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const transcriptionAbortControllerRef = useRef(null);

  // Rewrite Tone states
  const [showRewritePopover, setShowRewritePopover] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewrittenPreview, setRewrittenPreview] = useState("");
  const [rewriteTone, setRewriteTone] = useState("");
  const rewriteAbortControllerRef = useRef(null);

  // Unread summary state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const summaryAbortControllerRef = useRef(null);

  useEffect(() => {
    if (scrollEnd.current) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, imagePreview, typingUsers, suggestions, streamingTranscript]);

  // Clean up all abort controllers on component unmount
  useEffect(() => {
    return () => {
      if (rewriteAbortControllerRef.current) rewriteAbortControllerRef.current.abort();
      if (summaryAbortControllerRef.current) summaryAbortControllerRef.current.abort();
      if (transcriptionAbortControllerRef.current) transcriptionAbortControllerRef.current.abort();
    };
  }, []);

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

    if (selectedUser) {
      if (!isTyping) {
        setIsTyping(true);
        socket?.emit("typing", { receiverId: selectedUser._id });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit("stopTyping", { receiverId: selectedUser._id });
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    if (selectedUser) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket?.emit("stopTyping", { receiverId: selectedUser._id });
      setIsTyping(false);

      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });
    } else if (selectedGroup) {
      await sendGroupMessage({
        text: text.trim(),
        image: imagePreview,
      });
    }

    setText("");
    handleRemoveImage();
  };

  // AI Tone Rewrite - SSE Streaming with abort support
  const handleRewriteSelect = async (tone) => {
    if (!text.trim()) {
      toast.error("Please type some text first to rewrite!");
      return;
    }
    
    if (rewriteAbortControllerRef.current) {
      rewriteAbortControllerRef.current.abort();
    }
    rewriteAbortControllerRef.current = new AbortController();

    setIsRewriting(true);
    setRewriteTone(tone);
    setRewrittenPreview("");
    setShowRewritePopover(false);

    try {
      await rewriteMessage(
        text,
        tone,
        (chunk) => {
          if (chunk.text) {
            setRewrittenPreview((prev) => prev + chunk.text);
          }
        },
        rewriteAbortControllerRef.current.signal
      );
    } catch (err) {
      console.error("Rewrite aborted or failed:", err);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleDiscardRewrite = () => {
    if (rewriteAbortControllerRef.current) {
      rewriteAbortControllerRef.current.abort();
    }
    setRewrittenPreview("");
  };

  // Summary triggers with cancellation support
  const handleShowSummary = () => {
    if (summaryAbortControllerRef.current) {
      summaryAbortControllerRef.current.abort();
    }
    summaryAbortControllerRef.current = new AbortController();
    setShowSummaryModal(true);
    getUnreadSummary(selectedUser._id, () => {}, summaryAbortControllerRef.current.signal);
  };

  const handleCloseSummary = () => {
    if (summaryAbortControllerRef.current) {
      summaryAbortControllerRef.current.abort();
    }
    setShowSummaryModal(false);
  };

  // Voice Note Recording & Live SSE streaming transcription handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const durationMs = Date.now() - recordingStartTimeRef.current;
        const durationSeconds = Math.round(durationMs / 1000);

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          
          if (transcriptionAbortControllerRef.current) {
            transcriptionAbortControllerRef.current.abort();
          }
          transcriptionAbortControllerRef.current = new AbortController();
          
          setStreamingTranscript("");
          setIsTranscribingVoice(true);

          let compiledTranscription = "";
          let compiledSummary = "";

          try {
            await transcribeAudio(
              base64Audio,
              "audio/webm",
              (chunk) => {
                if (chunk.text) {
                  compiledTranscription += chunk.text;
                  setStreamingTranscript(compiledTranscription);
                }
                if (chunk.summary) {
                  compiledSummary = chunk.summary;
                }
              },
              transcriptionAbortControllerRef.current.signal
            );

            // Send voice message with compiled live transcription + summary + duration
            if (selectedUser) {
              await sendMessage({
                audio: base64Audio,
                mimeType: "audio/webm",
                transcription: compiledTranscription || "[Speech Transcribed]",
                audioSummary: compiledSummary,
                duration: durationSeconds,
              });
            } else if (selectedGroup) {
              await sendGroupMessage({
                audio: base64Audio,
                mimeType: "audio/webm",
                transcription: compiledTranscription || "[Speech Transcribed]",
                audioSummary: compiledSummary,
                duration: durationSeconds,
              });
            }
            toast.success("Voice message sent with transcript!");
          } catch (err) {
            if (err.name === "AbortError") {
              console.log("Transcription aborted.");
            } else {
              toast.error("AI Transcription failed. Sending audio fallback.");
              // Fallback send if error
              if (selectedUser) await sendMessage({ audio: base64Audio, mimeType: "audio/webm" });
              else if (selectedGroup) await sendGroupMessage({ audio: base64Audio, mimeType: "audio/webm" });
            }
          } finally {
            setIsTranscribingVoice(false);
            setStreamingTranscript("");
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic recording access error:", err);
      toast.error("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Semantic RAG scrolling to target message bubble location
  const handleScrollToMessage = (messageId) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-yellow-400", "scale-102", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-yellow-400", "scale-102");
      }, 3000);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setMsgSearchQuery(val);
    if (isSemanticSearch) {
      const activeId = selectedUser?._id || selectedGroup?._id;
      performSemanticSearch(activeId, val);
    }
  };

  if (!selectedUser && !selectedGroup) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 bg-white/5 dark:bg-black/10 text-slate-800 dark:text-white">
        <img src={assets.logo_icon} alt="logo" className="max-w-16 animate-bounce filter dark:brightness-100 brightness-0 opacity-80" />
        <p className="text-slate-400 dark:text-slate-400 text-lg font-light tracking-wide">Select a chat to begin messaging</p>
      </div>
    );
  }

  const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;
  const isUserTyping = selectedUser ? typingUsers[selectedUser._id] : false;

  const chatName = selectedUser ? selectedUser.fullName : selectedGroup.name;
  const chatAvatar = selectedUser ? (selectedUser.profilePic || assets.avatar_icon) : null;
  const activeId = selectedUser?._id || selectedGroup?._id;

  const filteredMessages = messages.filter((message) => {
    if (isSemanticSearch || !msgSearchQuery.trim()) return true;
    return message.text && message.text.toLowerCase().includes(msgSearchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col justify-between relative backdrop-blur-lg bg-white/5 dark:bg-black/10">
      {/* header part of chat container */}
      <div className="flex items-center gap-3 py-4 mx-4 border-b border-slate-200 dark:border-stone-500">
        {chatAvatar ? (
          <img
            src={chatAvatar}
            alt={chatName}
            className="w-9 h-9 object-cover rounded-full shadow-sm"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20 uppercase">
            {chatName.substring(0, 2)}
          </div>
        )}
        <div className="flex-1">
          <p className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
            {chatName}
            {selectedUser && (
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-gray-500"
                }`}
              ></span>
            )}
          </p>
          <div className="text-xs">
            {selectedUser ? (
              isUserTyping ? (
                <span className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">typing...</span>
              ) : (
                <span className="text-slate-400 dark:text-gray-400">{isOnline ? "Online" : "Offline"}</span>
              )
            ) : (
              <span className="text-slate-400 dark:text-gray-400">{selectedGroup.members?.length || 0} members</span>
            )}
          </div>
        </div>

        {/* AI Unread summary Badge */}
        {selectedUser && unseenMessages[selectedUser._id] > 0 && (
          <button
            onClick={handleShowSummary}
            className="cursor-pointer flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-[10px] text-blue-600 dark:text-blue-400 font-bold px-2.5 py-1.5 rounded-full transition-all border border-blue-200/50"
            title="Summarize unseen chat history"
          >
            🤖 AI Summary
          </button>
        )}

        {/* Message Search Bar */}
        <div className="flex items-center gap-2">
          {isSearchingMsg && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800/40 px-3 py-1 rounded-full border border-slate-300 dark:border-gray-700/50">
              <input
                type="text"
                value={msgSearchQuery}
                onChange={handleSearchChange}
                placeholder={isSemanticSearch ? "Semantic search..." : "Keyword search..."}
                className="bg-transparent text-slate-800 dark:text-white text-xs outline-none w-24 sm:w-36 transition-all"
              />
              <button
                onClick={() => {
                  setIsSemanticSearch(!isSemanticSearch);
                  setMsgSearchQuery("");
                }}
                className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
                  isSemanticSearch
                    ? "bg-blue-600 text-white border-blue-500 font-bold"
                    : "bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-gray-400 border-slate-300 dark:border-gray-700"
                }`}
                title="Toggle AI Semantic vector search"
              >
                AI
              </button>
            </div>
          )}
          <img
            onClick={() => {
              setIsSearchingMsg(!isSearchingMsg);
              if (isSearchingMsg) {
                setMsgSearchQuery("");
                setIsSemanticSearch(false);
              }
            }}
            src={assets.search_icon}
            alt="Search in chat"
            className="w-4 cursor-pointer hover:opacity-85 filter dark:invert invert transition-all"
          />
        </div>

        <img
          onClick={() => {
            setSelectedUser(null);
            setSelectedGroup(null);
          }}
          src={assets.arrow_icon}
          alt="Back"
          className="md:hidden max-w-7 cursor-pointer filter dark:invert invert"
        />
      </div>

      {/* RAG Match Results popover list */}
      {isSearchingMsg && isSemanticSearch && msgSearchQuery.trim() && (
        <div className="absolute right-4 top-16 z-30 w-72 max-h-60 overflow-y-scroll bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xl space-y-2 text-slate-800 dark:text-white animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Semantic Matches</span>
            {isSearchLoading && <div className="h-3 w-3 animate-spin border border-blue-600 border-t-transparent rounded-full"></div>}
          </div>
          {searchResults.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-xs italic py-2">No matching messages found.</p>
          ) : (
            <div className="space-y-1.5">
              {searchResults.map((match) => (
                <div
                  key={match.message._id}
                  onClick={() => handleScrollToMessage(match.message._id)}
                  className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-[11px] transition-all border border-slate-100 dark:border-slate-800/80 flex flex-col gap-0.5 shadow-sm"
                >
                  <div className="flex justify-between font-semibold text-blue-600 dark:text-blue-400">
                    <span>{match.message.senderId?.fullName || "User"}</span>
                    <span className="text-[9px] text-slate-400">Match: {Math.round(match.score * 100)}%</span>
                  </div>
                  <p className="line-clamp-2 italic text-slate-600 dark:text-gray-300">
                    "{match.message.text || (match.message.transcription ? `Voice: ${match.message.transcription}` : "Attachment")}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* messages part of chat container */}
      <div className="flex-1 overflow-y-scroll p-4 space-y-4">
        {isMessagesLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="font-light text-sm">Say hello to initialize chat! 👋</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-sm">No messages match search</p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const sender = message.senderId;
            const senderId = typeof sender === "object" ? sender._id : sender;
            const isSentByMe = senderId === authUser._id;

            const senderName = typeof sender === "object" ? sender.fullName : (isSentByMe ? authUser.fullName : selectedUser?.fullName);
            const senderPic = typeof sender === "object" ? sender.profilePic : (isSentByMe ? authUser.profilePic : selectedUser?.profilePic);

            const isEditingTranscript = editingTranscriptIds[message._id];

            return (
              <div
                key={message._id}
                id={`msg-${message._id}`}
                className={`flex gap-3 max-w-[85%] transition-all duration-300 rounded-2xl p-1 ${
                  isSentByMe ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <img
                  src={senderPic || assets.avatar_icon}
                  alt="avatar"
                  className="w-8 h-8 rounded-full object-cover self-end shadow-sm"
                />
                <div className="flex flex-col gap-0.5 max-w-[90%]">
                  {!isSentByMe && selectedGroup && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold ml-1">
                      {senderName}
                    </span>
                  )}
                  <div className="relative group/msg flex items-center">
                    <div
                      className={`p-3 rounded-2xl break-words text-sm shadow-sm ${
                        isSentByMe
                          ? "bg-blue-600 text-white rounded-br-none dark:bg-blue-600/40"
                          : "bg-slate-100 text-slate-800 rounded-bl-none dark:bg-gray-800/60 dark:text-white"
                      }`}
                    >
                      {message.image && (
                        <img
                          src={message.image}
                          alt="shared content"
                          className="max-w-[200px] sm:max-w-[285px] rounded-xl mb-2 cursor-pointer border border-slate-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image)}
                        />
                      )}
                      
                      {/* Audio Note player support */}
                      {message.audioUrl && (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <audio src={message.audioUrl} controls className="h-8 max-w-full rounded-md shadow-inner bg-slate-100 dark:bg-slate-800 filter brightness-95" />
                          
                          {message.transcription && (
                            <div className="mt-2 text-xs border-t border-slate-200/50 dark:border-slate-850/50 pt-2 flex flex-col gap-1.5">
                              {isEditingTranscript ? (
                                /* Transcript Editor Input block */
                                <div className="flex flex-col gap-2 bg-white/5 dark:bg-black/10 p-2 rounded-xl border border-slate-200/30 dark:border-gray-800">
                                  <textarea
                                    value={editTranscriptTexts[message._id] ?? message.transcription}
                                    onChange={(e) => setEditTranscriptTexts(prev => ({ ...prev, [message._id]: e.target.value }))}
                                    className="text-[11px] p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-gray-700 text-slate-800 dark:text-white rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                                    rows={3}
                                  />
                                  <div className="flex justify-end gap-1.5 text-[9px] font-bold">
                                    <button
                                      onClick={() => setEditingTranscriptIds(prev => ({ ...prev, [message._id]: false }))}
                                      className="px-2 py-1 text-slate-400 hover:text-slate-650 rounded"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await updateMessageTranscript(message._id, editTranscriptTexts[message._id] ?? message.transcription);
                                        setEditingTranscriptIds(prev => ({ ...prev, [message._id]: false }));
                                      }}
                                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Transcript display and controls */
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-center border-b border-dotted border-slate-200/30 dark:border-slate-800 pb-1 mb-1">
                                    <span className="font-semibold text-blue-500 text-[10px] uppercase tracking-wider">Transcribed Text:</span>
                                    <div className="flex gap-2 text-[9px] font-bold text-slate-400">
                                      {isSentByMe && (
                                        <button
                                          onClick={() => {
                                            setEditTranscriptTexts(prev => ({ ...prev, [message._id]: message.transcription }));
                                            setEditingTranscriptIds(prev => ({ ...prev, [message._id]: true }));
                                          }}
                                          className="hover:text-blue-500 transition-colors"
                                          title="Edit Transcription text"
                                        >
                                          ✏️ Edit
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(message.transcription);
                                          toast.success("Transcript copied!");
                                        }}
                                        className="hover:text-blue-500 transition-colors"
                                        title="Copy text"
                                      >
                                        📋 Copy
                                      </button>
                                      <button
                                        onClick={() => {
                                          setIsSemanticSearch(true);
                                          setMsgSearchQuery(message.transcription);
                                          performSemanticSearch(activeId, message.transcription);
                                          setIsSearchingMsg(true);
                                        }}
                                        className="hover:text-blue-500 transition-colors"
                                        title="Search similar files"
                                      >
                                        🔍 Search Similar
                                      </button>
                                    </div>
                                  </div>

                                  <p className="italic leading-relaxed font-light text-slate-700 dark:text-gray-300">"{message.transcription}"</p>

                                  {/* View Summary Toggle Accordion */}
                                  {message.audioSummary && (
                                    <div className="mt-1 border-t border-dotted border-slate-200/30 dark:border-slate-800/80 pt-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedSummaryIds(prev => ({ ...prev, [message._id]: !prev[message._id] }))}
                                        className="text-[9px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-wider flex items-center gap-1 transition-colors"
                                      >
                                        <span>🤖 AI Audio Summary</span>
                                        <span>{expandedSummaryIds[message._id] ? "▲" : "▼"}</span>
                                      </button>
                                      {expandedSummaryIds[message._id] && (
                                        <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1 font-medium bg-slate-50 dark:bg-black/10 p-2 rounded-lg leading-relaxed animate-in fade-in duration-200">
                                          {message.audioSummary}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {message.text && <p>{message.text}</p>}
                    </div>

                    {/* Hover Emoji Reaction Selector */}
                    <div
                      className={`opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 absolute top-1/2 -translate-y-1/2 flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-gray-700 px-2 py-1.5 rounded-full shadow-lg z-10 ${
                        isSentByMe ? "-left-44" : "-right-44"
                      }`}
                    >
                      {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => reactToMessage(message._id, emoji)}
                          className="cursor-pointer hover:scale-130 transition-transform text-sm px-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reactions List */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isSentByMe ? "justify-end" : "justify-start"}`}>
                      {message.reactions.map((reaction, i) => (
                        <span
                          key={i}
                          onClick={() => reactToMessage(message._id, reaction.emoji)}
                          className="inline-flex items-center bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full px-2 py-0.5 text-[10px] select-none cursor-pointer hover:scale-105 transition-all shadow-sm font-semibold text-slate-700 dark:text-gray-200"
                          title="Click to toggle reaction"
                        >
                          {reaction.emoji}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-400 mt-0.5 ${
                      isSentByMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {isSentByMe && !selectedGroup && (
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
        {selectedUser && isUserTyping && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center animate-pulse">
            <img
              src={selectedUser.profilePic || assets.avatar_icon}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover self-end shadow-sm"
            />
            <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-none p-3 dark:bg-gray-800/60 dark:text-gray-300">
              <span className="flex gap-1 items-center h-4 py-1">
                <span className="h-1.5 w-1.5 bg-slate-400 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1.5 w-1.5 bg-slate-400 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1.5 w-1.5 bg-slate-400 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </div>
          </div>
        )}

        <div ref={scrollEnd}></div>
      </div>

      {/* ------- bottom AI smart replies suggestions pills ------- */}
      {suggestions && suggestions.length > 0 && !imagePreview && !isRecording && !isTranscribingVoice && (
        <div className="flex gap-1.5 px-4 py-2 flex-wrap items-center bg-slate-50/50 dark:bg-black/10 border-t border-slate-200/50 dark:border-gray-800/20">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Reply suggestions:</span>
          {isSuggestionsLoading ? (
            <div className="flex gap-1 animate-pulse py-1">
              <div className="h-5 w-12 bg-slate-200 dark:bg-gray-800 rounded-full"></div>
              <div className="h-5 w-16 bg-slate-200 dark:bg-gray-800 rounded-full"></div>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setText(suggestion)}
                className="cursor-pointer bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] px-3 py-1 rounded-full border border-slate-200 dark:border-gray-700 font-medium text-slate-700 dark:text-slate-200 transition-all active:scale-95 shadow-sm"
              >
                {suggestion}
              </button>
            ))
          )}
        </div>
      )}

      {/* ------- bottom image preview ------- */}
      {imagePreview && (
        <div className="absolute bottom-16 left-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-2 rounded-lg flex items-center gap-2 z-10 shadow-xl">
          <img src={imagePreview} alt="preview" className="h-16 w-16 object-cover rounded" />
          <button
            onClick={handleRemoveImage}
            className="bg-red-500 hover:bg-red-650 text-white rounded-full p-1 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------- bottom progressive voice transcription overlay ------- */}
      {isTranscribingVoice && (
        <div className="absolute bottom-16 left-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl flex flex-col gap-2 z-20 text-slate-800 dark:text-white animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              🎙️ Live AI Transcription
              <span className="flex gap-0.5 items-center">
                <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (transcriptionAbortControllerRef.current) transcriptionAbortControllerRef.current.abort();
                setIsTranscribingVoice(false);
                setStreamingTranscript("");
              }}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs italic text-slate-600 dark:text-slate-350 min-h-6 leading-relaxed">
            {streamingTranscript || "Listening and converting speech..."}
          </p>
        </div>
      )}

      {/* ------- bottom AI text rewrite popup confirmation ------- */}
      {rewrittenPreview && (
        <div className="absolute bottom-16 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl max-w-xs z-50 shadow-2xl flex flex-col gap-3 animate-in fade-in duration-200 text-slate-800 dark:text-white">
          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">AI Rewrite Preview ({rewriteTone})</p>
          <div className="text-xs italic bg-slate-50 dark:bg-black/10 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 text-slate-750 dark:text-gray-305 min-h-10">
            {rewrittenPreview}
            {isRewriting && (
              <span className="inline-flex gap-0.5 items-center ml-1">
                <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={handleDiscardRewrite}
              className="cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-gray-500 font-medium transition-all"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => {
                setText(rewrittenPreview);
                handleDiscardRewrite();
              }}
              className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg active:scale-95 transition-all shadow-md shadow-blue-500/10"
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {/* ------- bottom input area -------  */}
      <form onSubmit={handleSend} className="p-4 flex items-center gap-3 relative">
        {/* Magic Wand Tone popover */}
        {showRewritePopover && (
          <div className="absolute bottom-16 right-16 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-xl w-36 flex flex-col gap-1 text-xs animate-in fade-in duration-150">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800">Select Tone</p>
            {["Friendly", "Professional", "Polite", "Funny", "Romantic", "Short"].map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => handleRewriteSelect(tone)}
                className="cursor-pointer text-left py-1.5 px-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors font-medium text-slate-700 dark:text-gray-200"
              >
                {tone}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 flex items-center bg-slate-100 dark:bg-gray-800/40 px-3 rounded-full border border-slate-200 dark:border-gray-700/50 shadow-inner">
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            disabled={isRecording || isTranscribingVoice}
            placeholder={isRecording ? "Recording audio note..." : (isTranscribingVoice ? "Transcribing text..." : "Send a message...")}
            className="flex-1 text-sm p-3 bg-transparent border-none rounded-lg outline-none text-slate-800 dark:text-white placeholder-gray-400 disabled:opacity-50"
          />

          {/* AI Magic Wand Rewrite Trigger */}
          <button
            type="button"
            disabled={isRecording || !text.trim() || isRewriting || isTranscribingVoice}
            onClick={() => setShowRewritePopover(!showRewritePopover)}
            className="cursor-pointer p-1.5 hover:opacity-85 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center"
            title="Rewrite with AI"
          >
            {isRewriting && !rewrittenPreview ? (
              <div className="h-4 w-4 animate-spin border border-blue-600 border-t-transparent rounded-full"></div>
            ) : (
              <span className="text-sm">✨</span>
            )}
          </button>

          <input
            type="file"
            id="image-file"
            accept="image/png, image/jpeg, image/jpg"
            hidden
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <label htmlFor="image-file" className={(isRecording || isTranscribingVoice) ? "opacity-30 pointer-events-none" : "cursor-pointer"}>
            <img
              src={assets.gallery_icon}
              alt="gallery"
              className="w-5 mr-1 cursor-pointer hover:opacity-85 filter dark:invert invert transition-all"
            />
          </label>
        </div>

        {/* Microphone Recording trigger */}
        <button
          type="button"
          disabled={isTranscribingVoice}
          onClick={isRecording ? stopRecording : startRecording}
          className={`cursor-pointer p-3 rounded-full hover:opacity-95 transition-all text-sm shadow-md active:scale-95 disabled:opacity-30 ${
            isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 dark:bg-gray-800/40 text-slate-600 dark:text-gray-300"
          }`}
          title={isRecording ? "Stop voice recording" : "Record voice message"}
        >
          {isRecording ? "⏹️" : "🎤"}
        </button>

        <button
          type="submit"
          disabled={(!text.trim() && !imagePreview) || isRecording || isTranscribingVoice}
          className="cursor-pointer bg-blue-600 hover:bg-blue-700 p-2.5 rounded-full hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shadow-blue-500/10"
        >
          <img src={assets.send_button} alt="Send" className="w-5 h-5 filter invert" />
        </button>
      </form>

      {/* Unread summary modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 rounded-2xl shadow-2xl relative text-slate-800 dark:text-white animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                🤖 AI Unread Summary
              </h3>
              <button
                onClick={handleCloseSummary}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>
            
            {isSummaryLoading && !unreadSummary ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                <div className="flex gap-1 items-center">
                  <span className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs font-light">Compiling chat highlights...</span>
              </div>
            ) : (
              <div className="text-sm space-y-2 py-2 text-slate-600 dark:text-slate-350 leading-relaxed font-light whitespace-pre-line min-h-12">
                {unreadSummary || "No summary available."}
                {isSummaryLoading && (
                  <span className="inline-flex gap-0.5 items-center ml-1">
                    <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-1 w-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                )}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                onClick={handleCloseSummary}
                className="cursor-pointer px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-all shadow-md shadow-blue-500/10"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
