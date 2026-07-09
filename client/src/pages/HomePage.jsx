import React, { useContext } from "react";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import ChatContainer from "../components/ChatContainer";
import { MessageContext } from "../../context/MessageContext";

const HomePage = () => {
  const { selectedUser } = useContext(MessageContext);

  return (
    <div className="w-full h-screen sm:px-[10%] sm:py-[2%]">
      <div className={`backdrop-blur-xl border border-gray-600/50 rounded-2xl overflow-hidden h-[100%] grid grid-cols-1 relative bg-[#130f26]/75 shadow-2xl transition-all duration-300 ${
        selectedUser
          ? "md:grid-cols-[1.2fr_2fr_1.2fr] xl:grid-cols-[1fr_2.5fr_1fr]"
          : "md:grid-cols-[1.5fr_2fr]"
      }`}>
        <Sidebar />
        <ChatContainer />
        <RightSidebar />
      </div>
    </div>
  );
};

export default HomePage;
