import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, onlineUsers } = useContext(AuthContext);
  const { users, getUsers, selectedUser, setSelectedUser, getMessages, unseenMessages } = useContext(MessageContext);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getUsers();
  }, []);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    getMessages(user._id);
  };

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${selectedUser ? "max-md:hidden" : ""}`}
    >
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer"
            />
            <div className="absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm hover:text-purple-400"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="cursor-pointer text-sm hover:text-purple-400"
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search user */}
        <div className="bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
            placeholder="Search User..."
          />
        </div>
      </div>

       {/* user list */}
      <div className="flex flex-col gap-1">
        {filteredUsers.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No users found</p>
        ) : (
          filteredUsers.map((user, index) => {
            const isOnline = onlineUsers.includes(user._id);
            return (
              <div
                key={user._id}
                className={`relative flex items-center gap-3 p-3 rounded-lg cursor-pointer max-sm:text-sm hover:bg-[#282142]/30 transition-all ${
                  selectedUser?._id === user._id && "bg-[#282142]/50 border-l-4 border-violet-500"
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="relative">
                  <img
                    src={user?.profilePic || assets.avatar_icon}
                    alt={user.fullName}
                    className="w-10 h-10 object-cover rounded-full"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#130f26] ${
                      isOnline ? "bg-green-500" : "bg-gray-500"
                    }`}
                  ></span>
                </div>
                <div className="flex flex-col leading-5">
                  <p className="font-medium">{user.fullName}</p>
                  <span className={`text-xs ${isOnline ? "text-green-400" : "text-gray-400"}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                {unseenMessages[user._id] > 0 && (
                  <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500 font-bold">
                    {unseenMessages[user._id]}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;



// Sidebar
//    │
//    ├── Logo
//    ├── Dropdown Menu
//    │      ├── Edit Profile
//    │      └── Logout
//    │
//    ├── Search Bar
//    │
//    └── User List
//           ├── Profile Pic
//           ├── Name
//           ├── Online Status
//           └── Notification Badge