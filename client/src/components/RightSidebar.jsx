import React, { useContext } from "react";
import assets from "../assets/assets";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatMessageTime } from "../library/utils";

const RightSidebar = () => {
  const navigate = useNavigate();
  const { logout, onlineUsers } = useContext(AuthContext);
  const { selectedUser, selectedGroup, messages } = useContext(MessageContext);

  if (!selectedUser && !selectedGroup) return null;

  const sharedImages = messages.filter((m) => m.image).map((m) => m.image);
  const voiceNotes = messages.filter((m) => m.audioUrl);

  const renderVoiceNotesSection = () => (
    <div className="px-5 text-[10px] mt-4">
      <p className="font-bold mb-2.5 uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Voice Transcripts ({voiceNotes.length})
      </p>
      {voiceNotes.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-450 italic font-light">No voice transcripts shared.</p>
      ) : (
        <div className="space-y-2 max-h-[160px] overflow-y-scroll pr-1">
          {voiceNotes.map((msg) => (
            <div
              key={msg._id}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-black/10 flex flex-col gap-1 shadow-inner"
            >
              <div className="flex justify-between items-center text-[9px] font-bold text-blue-600 dark:text-blue-400">
                <span>{msg.senderId?.fullName || (msg.senderId === selectedUser?._id ? selectedUser.fullName : "Me")}</span>
                <span className="text-slate-400 font-light">{formatMessageTime(msg.createdAt)}</span>
              </div>
              <p className="text-[10px] text-slate-700 dark:text-gray-300 italic line-clamp-2 leading-relaxed">
                "{msg.transcription || "[Empty Transcript]"}"
              </p>
              {msg.audioSummary && (
                <p className="text-[9px] text-slate-550 dark:text-slate-450 font-medium border-t border-slate-200/50 dark:border-slate-800/40 pt-1 mt-0.5 leading-relaxed">
                  AI Summary: {msg.audioSummary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (selectedGroup) {
    return (
      <div className="bg-slate-50 dark:bg-zinc-900/60 border-l border-slate-200 dark:border-zinc-800/80 text-slate-800 dark:text-white w-full relative flex flex-col max-md:hidden h-full">
        {/* Group Profile Section */}
        <div className="pt-10 flex flex-col items-center gap-2 text-xs font-light mx-auto px-4">
          <div className="w-16 h-16 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 flex items-center justify-center font-bold text-xl border border-blue-500/20 uppercase shadow-sm">
            {selectedGroup.name.substring(0, 2)}
          </div>
          <h1 className="text-sm font-semibold text-slate-850 dark:text-white text-center mt-1">
            {selectedGroup.name}
          </h1>
          <p className="text-center text-[10px] text-slate-500 dark:text-slate-400">
            {selectedGroup.description || "Group Chat"}
          </p>
        </div>

        {/* Divider */}
        <hr className="border-slate-200 dark:border-zinc-800 my-4 mx-5" />

        {/* Members List Section */}
        <div className="px-5 text-[10px]">
          <p className="font-bold mb-2.5 uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Members ({selectedGroup.members?.length || 0})
          </p>
          <div className="max-h-[140px] overflow-y-scroll space-y-2 pr-1">
            {selectedGroup.members?.map((member) => {
              const isMemberOnline = onlineUsers.includes(member._id);
              return (
                <div key={member._id} className="flex items-center gap-2">
                  <div className="relative">
                    <img
                      src={member.profilePic || assets.avatar_icon}
                      alt={member.fullName}
                      className="w-6 h-6 rounded-full object-cover shadow-sm"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-zinc-900 ${
                        isMemberOnline ? "bg-green-500" : "bg-gray-500"
                      }`}
                    ></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-850 dark:text-gray-250 text-xs">
                      {member.fullName}
                    </span>
                    <span className={`text-[9px] ${isMemberOnline ? "text-green-600 dark:text-green-400 font-medium" : "text-slate-400"}`}>
                      {isMemberOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-200 dark:border-zinc-800 my-4 mx-5" />

        {/* Media Section */}
        <div className="px-5 text-[10px]">
          <p className="font-bold mb-2.5 uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Shared Media
          </p>
          {sharedImages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-450 italic font-light">No shared media.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-scroll pr-1">
              {sharedImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => window.open(url)}
                  className="cursor-pointer aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-black/20 hover:opacity-85 transition-all shadow-sm"
                >
                  <img src={url} alt="shared" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-slate-200 dark:border-zinc-800 my-4 mx-5" />

        {/* Voice Transcripts */}
        {renderVoiceNotesSection()}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="cursor-pointer bg-red-600 hover:bg-red-700 text-white border-none text-xs font-semibold py-2 rounded-lg transition-all active:scale-95 text-center mb-5 mx-5 shadow-sm"
        >
          Logout
        </button>
      </div>
    );
  }

  // Render direct chat user info
  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="bg-slate-50 dark:bg-zinc-900/60 border-l border-slate-200 dark:border-zinc-800/80 text-slate-800 dark:text-white w-full relative flex flex-col max-md:hidden h-full">
      {/* Profile Section */}
      <div className="pt-12 flex flex-col items-center gap-2 text-xs font-light mx-auto">
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          alt={selectedUser.fullName}
          className="w-16 h-16 object-cover rounded-full shadow-sm border border-slate-200 dark:border-zinc-800"
        />
        <h1 className="px-5 text-sm font-semibold flex items-center gap-2 text-slate-850 dark:text-white mt-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          ></span>
          {selectedUser.fullName}
        </h1>
        <p className="px-5 text-center text-[10px] text-slate-500 dark:text-slate-400">{selectedUser.bio || "No biography yet."}</p>
      </div>

      {/* Divider */}
      <hr className="border-slate-200 dark:border-zinc-800 my-4 mx-5" />

      {/* Media Section */}
      <div className="px-5 text-[10px]">
        <p className="font-bold mb-2.5 uppercase tracking-wider text-slate-400 dark:text-slate-500">Shared Media</p>
        {sharedImages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-450 italic font-light">No shared media.</p>
        ) : (
          <div className="max-h-[160px] overflow-y-scroll grid grid-cols-2 gap-2 pr-1">
            {sharedImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-black/20 hover:opacity-85 transition-all shadow-sm"
              >
                <img src={url} alt="shared" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-slate-200 dark:border-zinc-800 my-4 mx-5" />

      {/* Voice Transcripts */}
      {renderVoiceNotesSection()}

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Logout Button */}
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="cursor-pointer bg-red-600 hover:bg-red-700 text-white border-none text-xs font-semibold py-2 rounded-lg transition-all active:scale-95 text-center mb-5 mx-5 shadow-sm"
      >
        Logout
      </button>
    </div>
  );
};

export default RightSidebar;
