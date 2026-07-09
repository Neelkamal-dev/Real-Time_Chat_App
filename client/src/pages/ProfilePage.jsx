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

  // Update local states if authUser details finish loading
  React.useEffect(() => {
    if (authUser) {
      setName(authUser.fullName || "");
      setBio(authUser.bio || "");
    }
  }, [authUser]);

  if (!authUser) {
    return (
      <div className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center text-white">
        <p>Loading profile...</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedImage) {
      await updateProfile({ fullName: name, bio });
      navigate("/"); // Navigate to the home page after saving
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(selectedImage);
    reader.onload = async () => {
      const base64Image = reader.result;
      await updateProfile({ fullName: name, bio, profilePic: base64Image });
      navigate("/"); // Navigate to the home page after saving
    };
  };

  return (
    <div className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center">
      <div className="w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg">
        
        {/* Profile form */}
        <form className="flex flex-col gap-5 p-10 flex-1" onSubmit={handleSubmit}>
          <h3 className="text-lg">Profile details</h3>

          {/* Avatar upload */}
          <label htmlFor="avatar" className="flex items-center gap-3 cursor-pointer">
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
              className="w-12 h-12 rounded-full object-cover"
            />
          </label>

          {/* Name input */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-white bg-transparent"
          />

          {/* Bio input */}
          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write profile bio"
            required
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 text-white bg-transparent"
            rows={4}
          ></textarea>

          <button
            type="submit"
            className="bg-gradient-to-r from-purple-400 to-violet-600 text-white p-2 rounded-full text-lg cursor-pointer font-medium"
          >
            Save
          </button>
        </form>

        {/* Right-side preview */}
        <img
          className="max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10 object-cover"
          src={authUser.profilePic || assets.logo_icon}
          alt=""
        />
      </div>
    </div>
  );
};

export default ProfilePage;
