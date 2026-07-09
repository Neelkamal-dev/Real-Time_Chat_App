import React from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext.jsx";

const ProfilePage = () => {
  const { authUser, updateProfile } = React.useContext(AuthContext);

  const [selectedImage, setSelectedImage] = React.useState(null);
  const navigate = useNavigate();
  const [name, setName] = React.useState(authUser?.fullName || "");
  const [bio, setBio] = React.useState(authUser?.bio || "");

  React.useEffect(() => {
    if (authUser) {
      setName(authUser.fullName || "");
      setBio(authUser.bio || "");
    }
  }, [authUser]);

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedImage) {
      await updateProfile({ fullName: name, bio });
      navigate("/");
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(selectedImage);
    reader.onload = async () => {
      const base64Image = reader.result;
      await updateProfile({ fullName: name, bio, profilePic: base64Image });
      navigate("/");
    };
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 transition-colors duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl shadow-lg p-6 text-slate-800 dark:text-white transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <img
            onClick={() => navigate("/")}
            src={assets.arrow_icon}
            alt="Back"
            className="w-4 h-4 cursor-pointer hover:opacity-85 transition-all filter dark:invert invert"
          />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Profile Settings</h2>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-1 py-2">
            <label htmlFor="avatar" className="relative group cursor-pointer">
              <input
                type="file"
                id="avatar"
                accept=".png, .jpg, .jpeg"
                hidden
                onChange={(e) => setSelectedImage(e.target.files[0])}
              />
              <img
                src={
                  selectedImage
                    ? URL.createObjectURL(selectedImage)
                    : (authUser.profilePic || assets.avatar_icon)
                }
                alt="avatar"
                className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-zinc-850 shadow-sm group-hover:opacity-85 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] text-white font-bold uppercase tracking-wider">Change</span>
              </div>
            </label>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Change Avatar</span>
          </div>

          {/* Name input */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="p-2.5 bg-slate-50 dark:bg-black/10 border border-slate-200 dark:border-zinc-850 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-800 dark:text-white"
            />
          </div>

          {/* Bio input */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Bio</label>
            <textarea
              onChange={(e) => setBio(e.target.value)}
              value={bio}
              placeholder="Write a brief bio about yourself..."
              required
              className="p-2.5 bg-slate-50 dark:bg-black/10 border border-slate-200 dark:border-zinc-850 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-800 dark:text-white resize-none leading-relaxed"
              rows={4}
            ></textarea>
          </div>

          <button
            type="submit"
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-semibold transition-all active:scale-98 text-xs shadow-sm shadow-blue-500/10 mt-2"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
