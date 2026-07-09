import React, { useContext } from "react";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import ChatContainer from "../components/ChatContainer";
import { MessageContext } from "../../context/MessageContext";

const HomePage = () => {
  const { selectedUser, selectedGroup } = useContext(MessageContext);

  return (
    <div className="w-screen h-screen flex bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-150 overflow-hidden transition-colors duration-300">
      <div className={`w-full h-full grid grid-cols-1 relative bg-white dark:bg-zinc-900/40 transition-all duration-300 ${
        selectedUser || selectedGroup
          ? "md:grid-cols-[290px_1fr_260px] xl:grid-cols-[320px_1fr_290px]"
          : "md:grid-cols-[340px_1fr]"
      }`}>
        <Sidebar />
        <ChatContainer />
        <RightSidebar />
      </div>
    </div>
  );
};

export default HomePage;
