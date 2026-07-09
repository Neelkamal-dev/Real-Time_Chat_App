// import React from "react";
// import assets, { messagesDummyData } from "../assets/assets";

// const ChatContainer = ({ selectedUser, setSelectedUser }) => {
//   return selectedUser ? (
//     <div className="h-full overflow-scroll relative backdrop-blur-lg">
//       {/* header part of chat container */}
//       <div className="flex items-center gap-3 py-4 mx-4 border-b border-stone-500">
//         <img src={assets.profile_martin} alt="" className="w-8 rounded-full" />
//         <p className="flex-1 text-lg text-white flex items-center gap-2">
//           Martin Johnson
//           <span className="w-2 h-2 rounded-full bg-green-500"></span>
//         </p>
//         <img
//           onClick={() => setSelectedUser(null)}
//           src={assets.arrow_icon}
//           alt="Menu"
//           className="md:hidden max-w-7"
//         />
//         <img src={assets.help_icon} alt="" className="max-md:hidden max-w-5" />
//       </div>
//         {/* messages part of chat container */}
//         <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
//           {messagesDummyData.map((message, index) => (
//             <div key={index} className=
//             {`flex items-end gap-2 justify-end ${message.senderId !== '22625df2f646f44fd6646sd' && 'flex-row-reverse'}`}>
//               {message.image ? (
//                 <img src={assets.image} alt="" className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"  />
//               ) : (
//                 <p className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
//                   ${message.senderId === '680f50e4f10f3cd28382ecf9'
//                   ? 'rounded-br-none': 'rounded-bl-none'}`}>
//                   {message.text}
//                   </p>
//                   <div className="text-center text-xs">
//                   <img
//                   src={
//                   message.senderId === '680f50e4f10f3cd28382ecf9'
//                   ? assets.avatar_icon
//                   : assets.profile_martin
//                   }
//                   alt=""
//                   className="w-7 rounded-full"
//                   />
//                   <p>{message.createdAt}</p>
//                   </div>

//               )}
//             </div>
//           ))}

//         </div>
//     </div>
//   ) : (
//     <div className="h-full flex flex-col items-center justify-center gap-5">
//       <img src={assets.logo_icon} alt="" className="max-w-16" />
//       <p className="text-white text-lg font-medium">Chat anytime,anywhere</p>
//     </div>
//   );
// };

// export default ChatContainer;

import React, { use, useEffect, useRef } from "react";
import assets, { messagesDummyData } from "../assets/assets";
import { formatMessageTime } from "../library/utils";

const ChatContainer = ({ selectedUser, setSelectedUser }) => {
  const scrollEnd = useRef(null);
  useEffect(() => {
    if (scrollEnd.current) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop-blur-lg">
      {/* header part of chat container */}
      <div className="flex items-center gap-3 py-4 mx-4 border-b border-stone-500">
        <img src={assets.profile_martin} alt="" className="w-8 rounded-full" />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          Martin Johnson
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt="Menu"
          className="md:hidden max-w-7"
        />
        <img src={assets.help_icon} alt="" className="max-md:hidden max-w-5" />
      </div>
      {/* messages part of chat container */}
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
        {messagesDummyData.map((message, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 justify-end ${
              message.senderId !== "22625df2f646f44fd6646sd" &&
              "flex-row-reverse"
            }`}
          >
            {message.image ? (
              <img
                src={assets.image}
                alt=""
                className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : (
              <p
                className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
                  message.senderId === "680f50e4f10f3cd28382ecf9"
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                }`}
              >
                {message.text}
              </p>
            )}
            <div className="text-center text-xs">
              <img
                src={
                  message.senderId === "680f50e4f10f3cd28382ecf9"
                    ? assets.avatar_icon
                    : assets.profile_martin
                }
                alt=""
                className="w-7 rounded-full"
              />
              <p className="text-gray-500">
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>
       {/* ------- bottom area -------  */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3">
        <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            type="text"
            placeholder="Send a message"
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
          />
          <input type="file" id="image" accept="image/png, image/jpeg" hidden />
          <label htmlFor="image">
            <img
              src={assets.gallery_icon}
              alt=""
              className="w-5 mr-2 cursor-pointer"
            />
          </label>
        </div>
        <img src={assets.send_button} alt="" className="w-7 cursor-pointer" />
      </div>
      
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center gap-5">
      <img src={assets.logo_icon} alt="" className="max-w-16" />
      <p className="text-white text-lg font-medium">Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatContainer;
