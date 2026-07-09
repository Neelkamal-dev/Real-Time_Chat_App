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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white">
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-slate-800 dark:text-white transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <img
            onClick={() => navigate("/")}
            src={assets.arrow_icon}
            alt="Back"
            className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity filter dark:invert invert"
          />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h2>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 py-4">
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
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md group-hover:opacity-85 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
              </div>
            </label>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Upload profile photo</span>
          </div>

          {/* Name input */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-white"
            />
          </div>

          {/* Bio input */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Bio</label>
            <textarea
              onChange={(e) => setBio(e.target.value)}
              value={bio}
              placeholder="Write a brief bio about yourself..."
              required
              className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-white resize-none"
              rows={4}
            ></textarea>
          </div>

          <button
            type="submit"
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 text-sm mt-2"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
