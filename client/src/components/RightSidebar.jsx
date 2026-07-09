import React, { useContext } from "react";
import assets from "../assets/assets";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const RightSidebar = () => {
  const navigate = useNavigate();
  const { logout, onlineUsers } = useContext(AuthContext);
  const { selectedUser, selectedGroup, messages } = useContext(MessageContext);

  if (!selectedUser && !selectedGroup) return null;

  if (selectedGroup) {
    const sharedImages = messages.filter((m) => m.image).map((m) => m.image);

    return (
      <div className="bg-[#8185B2]/10 text-slate-800 dark:text-white w-full relative overflow-y-scroll max-md:hidden h-full">
        {/* Group Profile Section */}
        <div className="pt-12 flex flex-col items-center gap-2 text-xs font-light mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-2xl border border-violet-500/30 uppercase shadow-md">
            {selectedGroup.name.substring(0, 2)}
          </div>
          <h1 className="text-xl font-medium text-slate-800 dark:text-white text-center mt-2">
            {selectedGroup.name}
          </h1>
          <p className="text-center text-slate-600 dark:text-gray-300">
            {selectedGroup.description || "Group Conversation"}
          </p>
        </div>

        {/* Divider */}
        <hr className="border-slate-200 dark:border-[#ffffff50] my-4" />

        {/* Members List Section */}
        <div className="px-5 text-xs">
          <p className="font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Members ({selectedGroup.members?.length || 0})
          </p>
          <div className="max-h-[200px] overflow-y-scroll space-y-2">
            {selectedGroup.members?.map((member) => {
              const isMemberOnline = onlineUsers.includes(member._id);
              return (
                <div key={member._id} className="flex items-center gap-2 p-1 rounded-md">
                  <div className="relative">
                    <img
                      src={member.profilePic || assets.avatar_icon}
                      alt={member.fullName}
                      className="w-7 h-7 rounded-full object-cover shadow-sm"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-[#130f26] ${
                        isMemberOnline ? "bg-green-500" : "bg-gray-500"
                      }`}
                    ></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800 dark:text-gray-200 text-xs">
                      {member.fullName}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isMemberOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-200 dark:border-[#ffffff50] my-4" />

        {/* Media Section */}
        <div className="px-5 text-xs pb-20">
          <p className="font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Shared Media
          </p>
          {sharedImages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">No shared photos.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 opacity-90">
              {sharedImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => window.open(url)}
                  className="cursor-pointer aspect-square rounded overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-black/20 hover:opacity-85 transition-all shadow-sm"
                >
                  <img src={url} alt="shared" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-md"
        >
          Logout
        </button>
      </div>
    );
  }

  // Render direct chat user info
  const isOnline = onlineUsers.includes(selectedUser._id);
  const sharedImages = messages.filter((m) => m.image).map((m) => m.image);

  return (
    <div className="bg-[#8185B2]/10 text-slate-800 dark:text-white w-full relative overflow-y-scroll max-md:hidden h-full">
      {/* Profile Section */}
      <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto">
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          alt={selectedUser.fullName}
          className="w-20 h-20 object-cover rounded-full shadow-md"
        />
        <h1 className="px-10 text-xl font-medium mx-auto flex items-center gap-2 text-slate-850 dark:text-white">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          ></span>
          {selectedUser.fullName}
        </h1>
        <p className="px-10 text-center text-slate-600 dark:text-gray-300">{selectedUser.bio || "No bio yet."}</p>
      </div>

      {/* Divider */}
      <hr className="border-slate-200 dark:border-[#ffffff50] my-4" />

      {/* Media Section */}
      <div className="px-5 text-xs">
        <p className="font-semibold mb-2">Media Share</p>
        {sharedImages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">No media shared yet.</p>
        ) : (
          <div className="max-h-[250px] overflow-y-scroll grid grid-cols-2 gap-2 opacity-90 pb-20">
            {sharedImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer aspect-square rounded overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-black/20 hover:opacity-85 transition-all shadow-sm"
              >
                <img src={url} alt="shared" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-md"
      >
        Logout
      </button>
    </div>
  );
};

export default RightSidebar;
