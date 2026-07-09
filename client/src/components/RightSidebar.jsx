import React, { useContext } from "react";
import assets from "../assets/assets";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const RightSidebar = () => {
  const navigate = useNavigate();
  const { logout, onlineUsers } = useContext(AuthContext);
  const { selectedUser, messages } = useContext(MessageContext);

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);
  const sharedImages = messages.filter((m) => m.image).map((m) => m.image);

  return (
    <div
      className={`bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll max-md:hidden h-full`}
    >
      {/* Profile Section */}
      <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto">
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          alt={selectedUser.fullName}
          className="w-20 h-20 object-cover rounded-full"
        />
        <h1 className="px-10 text-xl font-medium mx-auto flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? "bg-green-500" : "bg-gray-500"
            }`}
          ></span>
          {selectedUser.fullName}
        </h1>
        <p className="px-10 text-center text-gray-300">{selectedUser.bio || "No bio yet."}</p>
      </div>

      {/* Divider */}
      <hr className="border-[#ffffff50] my-4" />

      {/* Media Section */}
      <div className="px-5 text-xs">
        <p className="font-semibold mb-2">Media Share</p>
        {sharedImages.length === 0 ? (
          <p className="text-gray-400 italic">No media shared yet.</p>
        ) : (
          <div className="max-h-[250px] overflow-y-scroll grid grid-cols-2 gap-2 opacity-90 pb-20">
            {sharedImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer aspect-square rounded overflow-hidden border border-gray-700 bg-black/20 hover:opacity-85 transition-all"
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
        className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all"
      >
        Logout
      </button>
    </div>
  );
};

export default RightSidebar;
