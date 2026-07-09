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
      className={`bg-slate-50 dark:bg-zinc-900/60 border-r border-slate-200 dark:border-zinc-800/80 h-full p-5 flex flex-col text-slate-800 dark:text-zinc-200 ${selectedUser || selectedGroup ? "max-md:hidden" : ""}`}
    >
      <div className="pb-4">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-32 filter dark:brightness-100 brightness-50" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-4 cursor-pointer filter dark:invert-0 invert opacity-75 hover:opacity-100 transition-opacity"
            />
            <div className="absolute top-full right-0 z-20 w-36 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 hidden group-hover:block shadow-xl">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-xs hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium"
              >
                Edit Profile
              </p>
              <hr className="my-1 border-t border-slate-100 dark:border-zinc-800" />
              <p
                onClick={toggleTheme}
                className="cursor-pointer text-xs hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-zinc-800 font-medium"
              >
                {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
              </p>
              <hr className="my-1 border-t border-slate-100 dark:border-zinc-800" />
              <p
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="cursor-pointer text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-md font-semibold"
              >
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search user */}
        <div className="bg-slate-100/80 dark:bg-zinc-800/30 rounded-lg flex items-center gap-2 py-2 px-3 mt-4 border border-slate-200/50 dark:border-zinc-800/50">
          <img src={assets.search_icon} alt="Search" className="w-3 filter dark:invert-0 invert opacity-60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-800 dark:text-white text-xs placeholder-gray-400 flex-1"
            placeholder="Search users..."
          />
        </div>
      </div>

       {/* user list */}
      <div className="flex-1 overflow-y-scroll space-y-1 pr-1">
        <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2 uppercase">Direct Messages</div>
        {filteredUsers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-450 text-xs text-center py-4 italic">No users found</p>
        ) : (
          filteredUsers.map((user) => {
            const isOnline = onlineUsers.includes(user._id);
            const isSelected = selectedUser?._id === user._id;
            return (
              <div
                key={user._id}
                className={`relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-100 dark:bg-zinc-800/60 border-l-2 border-blue-600"
                    : "hover:bg-slate-100/50 dark:hover:bg-zinc-800/20"
                }`}
                onClick={() => handleUserSelect(user)}
              >
                <div className="relative">
                  <img
                    src={user?.profilePic || assets.avatar_icon}
                    alt={user.fullName}
                    className="w-8 h-8 object-cover rounded-full shadow-sm"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                      isOnline ? "bg-green-500" : "bg-gray-500"
                    }`}
                  ></span>
                </div>
                <div className="flex flex-col leading-4 flex-1">
                  <p className="font-semibold text-xs text-slate-800 dark:text-zinc-200">{user.fullName}</p>
                  <span className={`text-[10px] ${isOnline ? "text-green-600 dark:text-green-400 font-semibold" : "text-slate-400 dark:text-gray-500"}`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                {unseenMessages[user._id] > 0 && (
                  <p className="text-[9px] h-4.5 w-4.5 flex justify-center items-center rounded-full bg-blue-600 text-white font-bold animate-pulse">
                    {unseenMessages[user._id]}
                  </p>
                )}
              </div>
            );
          })
        )}

        {/* Groups Header */}
        <div className="flex justify-between items-center mt-5 mb-2 border-t border-slate-200 dark:border-zinc-800/80 pt-4 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500">
          <span className="uppercase">Groups ({groups.length})</span>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-[9px] py-1 px-2.5 rounded-lg font-bold transition-all shadow-sm active:scale-95"
          >
            + Create
          </button>
        </div>

        {/* Groups List */}
        <div className="space-y-1 pr-1">
          {groups.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-450 text-[10px] text-center py-2 italic">No groups joined</p>
          ) : (
            groups.map((group) => {
              const isSelected = selectedGroup?._id === group._id;
              return (
                <div
                  key={group._id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? "bg-slate-100 dark:bg-zinc-800/60 border-l-2 border-blue-600"
                      : "hover:bg-slate-100/50 dark:hover:bg-zinc-800/20"
                  }`}
                  onClick={() => handleGroupSelect(group)}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20 uppercase shadow-inner">
                    {group.name.substring(0, 2)}
                  </div>
                  <div className="flex flex-col leading-4 flex-1">
                    <p className="font-semibold text-xs text-slate-800 dark:text-zinc-200">{group.name}</p>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 font-light">
                      {group.members?.length || 0} members
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Group Modal Backdrop */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 w-full max-w-sm p-6 rounded-xl shadow-2xl relative text-slate-800 dark:text-white animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-400">Create New Group</h3>
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Project Team"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-black/10 text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Select Members</label>
                <div className="max-h-40 overflow-y-scroll border border-slate-200 dark:border-zinc-850 rounded-lg p-2 space-y-1.5 bg-slate-50 dark:bg-black/10">
                  {users.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-2">No members available</p>
                  ) : (
                    users.map((user) => (
                      <label key={user._id} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-250 dark:hover:bg-white/5 rounded-md transition-all">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user._id)}
                          onChange={() => handleMemberToggle(user._id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-200 dark:border-zinc-800 accent-blue-600"
                        />
                        <img src={user.profilePic || assets.avatar_icon} alt="" className="w-6 h-6 rounded-full object-cover" />
                        <span className="text-xs font-semibold">{user.fullName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupName("");
                    setSelectedMembers([]);
                  }}
                  className="cursor-pointer px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-300 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md active:scale-95"
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