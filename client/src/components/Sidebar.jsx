import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { MessageContext } from "../../context/MessageContext";
import { AuthContext } from "../../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, onlineUsers, theme, toggleTheme } = useContext(AuthContext);
  const {
    users,
    getUsers,
    selectedUser,
    setSelectedUser,
    getMessages,
    unseenMessages,
    groups,
    getGroups,
    selectedGroup,
    setSelectedGroup,
    getGroupMessages,
    createGroup,
  } = useContext(MessageContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    getUsers();
    getGroups();
  }, []);

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    getMessages(user._id);
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    getGroupMessages(group._id);
  };

  const handleMemberToggle = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const group = await createGroup({
      name: groupName.trim(),
      members: selectedMembers,
    });
    if (group) {
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-slate-800 dark:text-white ${selectedUser || selectedGroup ? "max-md:hidden" : ""}`}
    >
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-40 filter dark:brightness-100 brightness-50" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer filter dark:invert-0 invert"
            />
            <div className="absolute top-full right-0 z-20 w-36 p-4 rounded-md bg-white dark:bg-[#282142] border border-gray-200 dark:border-gray-600 text-slate-800 dark:text-gray-100 hidden group-hover:block shadow-lg">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm hover:text-purple-400 py-1"
              >
                Edit Profile
              </p>
              <hr className="my-1.5 border-t border-gray-200 dark:border-gray-500" />
              <p
                onClick={toggleTheme}
                className="cursor-pointer text-sm hover:text-purple-400 py-1"
              >
                {theme === "dark" ? "Light Mode ☀️" : "Dark Mode 🌙"}
              </p>
              <hr className="my-1.5 border-t border-gray-200 dark:border-gray-500" />
              <p
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="cursor-pointer text-sm hover:text-purple-400 py-1"
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search user */}
        <div className="bg-slate-200/60 dark:bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5">
          <img src={assets.search_icon} alt="Search" className="w-3 filter dark:invert-0 invert" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-800 dark:text-white text-xs placeholder-gray-500 dark:placeholder-[#c8c8c8] flex-1"
            placeholder="Search User..."
          />
        </div>
      </div>

       {/* user list */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold tracking-wider text-gray-400 mb-2 uppercase">Direct Messages</div>
        {filteredUsers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No users found</p>
        ) : (
          filteredUsers.map((user, index) => {
            const isOnline = onlineUsers.includes(user._id);
            return (
              <div
                key={user._id}
                className={`relative flex items-center gap-3 p-3 rounded-lg cursor-pointer max-sm:text-sm hover:bg-slate-200/40 dark:hover:bg-[#282142]/30 transition-all ${
                  selectedUser?._id === user._id && "bg-slate-200 dark:bg-[#282142]/50 border-l-4 border-violet-500"
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="relative">
                  <img
                    src={user?.profilePic || assets.avatar_icon}
                    alt={user.fullName}
                    className="w-10 h-10 object-cover rounded-full shadow-sm"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#130f26] ${
                      isOnline ? "bg-green-500" : "bg-gray-500"
                    }`}
                  ></span>
                </div>
                <div className="flex flex-col leading-5">
                  <p className="font-medium text-slate-800 dark:text-white">{user.fullName}</p>
                  <span className={`text-xs ${isOnline ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-gray-400"}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                {unseenMessages[user._id] > 0 && (
                  <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500 text-white font-bold animate-pulse">
                    {unseenMessages[user._id]}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Groups Header */}
      <div className="flex justify-between items-center mt-6 mb-3 border-t border-slate-200 dark:border-gray-600/30 pt-4 text-xs font-semibold tracking-wider text-gray-400">
        <span className="uppercase">Groups ({groups.length})</span>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="cursor-pointer bg-violet-600 hover:bg-violet-750 text-white text-[10px] py-1 px-2.5 rounded-full font-bold transition-all shadow-sm active:scale-95"
        >
          + Create
        </button>
      </div>

      {/* Groups List */}
      <div className="flex flex-col gap-1">
        {groups.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-2 italic">No groups joined</p>
        ) : (
          groups.map((group) => (
            <div
              key={group._id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer max-sm:text-sm hover:bg-slate-200/40 dark:hover:bg-[#282142]/30 transition-all ${
                selectedGroup?._id === group._id && "bg-slate-200 dark:bg-[#282142]/50 border-l-4 border-violet-500"
              }`}
              onClick={() => handleGroupSelect(group)}
            >
              <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-500/30 uppercase shadow-inner">
                {group.name.substring(0, 2)}
              </div>
              <div className="flex flex-col leading-5">
                <p className="font-medium text-slate-800 dark:text-white">{group.name}</p>
                <span className="text-[10px] text-slate-400 dark:text-gray-400 font-light">
                  {group.members?.length || 0} members
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Group Modal Backdrop */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f1936] border border-slate-200 dark:border-gray-700 w-full max-w-md p-6 rounded-2xl shadow-2xl relative text-slate-800 dark:text-white animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Hackathon Team"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-gray-700 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Select Members</label>
                <div className="max-h-40 overflow-y-scroll border border-slate-200 dark:border-gray-700 rounded-lg p-2 space-y-2 bg-slate-50 dark:bg-black/10">
                  {users.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-2">No members available</p>
                  ) : (
                    users.map((user) => (
                      <label key={user._id} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-200 dark:hover:bg-white/5 rounded-md transition-all">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user._id)}
                          onChange={() => handleMemberToggle(user._id)}
                          className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-gray-700 accent-violet-600"
                        />
                        <img src={user.profilePic || assets.avatar_icon} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <span className="text-sm font-medium">{user.fullName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupName("");
                    setSelectedMembers([]);
                  }}
                  className="cursor-pointer px-4 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-300 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-400 to-violet-600 text-white hover:opacity-90 active:scale-95 transition-all shadow-md"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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