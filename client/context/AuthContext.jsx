import {createContext,useState} from "react";
import axios from "axios";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client";


const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({children}) =>{
  const [token,setToken] = useState(localStorage.getItem("token") || null);

  const [authUser,setAuthUser] = useState(null);
  const [onlineUsers,setOnlineUsers] = useState([]);
  const [socket,setSocket] = useState(null);  
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setAuthToken = (token) =>{
    setToken(token);
    localStorage.setItem("token", token);
  };

  const checkAuth = async () =>{
    try{
      const currentToken = localStorage.getItem("token");
      if(!currentToken) {
        setIsCheckingAuth(false);
        return;
      }
      const {data} = await axios.get("/api/auth/check") ;
      if(data.success){
        setAuthUser(data.user);
        connectSocket(data.user);
      } else {
        setAuthUser(null);
      }
    }catch(error){
      console.log("Error checking auth:", error);
      setAuthUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  //login function to handle user authentication and socket connection
  const login = async (state,credentials) =>{
    try {
      const {data} = await axios.post(`/api/auth/${state}`,credentials);
      if(data.success){
        // setAuthToken(data.token);
        setAuthUser(data.userData);
        connectSocket(data.userData);
        axios.defaults.headers.common["token"] = data.token; // Set token for future requests
        setToken(data.token);
        localStorage.setItem("token", data.token); // Store token in localStorage
        toast.success(data.message);
      }else{
        toast.error(data.message);
      } 
    }catch(error){
      toast.error(error.message);
    }
  }

  //logout function to clear user data and disconnect socket
  const logout = async () =>{
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);  
    setOnlineUsers([]);
    axios.defaults.headers.common["token"] = null; // Remove token from future requests
    if(socket){
      socket.disconnect();
      setSocket(null);
    }
    toast.success("Logged out successfully");
    socket?.disconnect(); 

  }

  // update profile function to handle user profile updates
  const updateProfile = async (profileData) =>{
    try { 
      const {data} = await axios.post("/api/auth/update-profile",profileData);
      if(data.success){
        setAuthUser(data.updatedUser);
        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };  

  //connect to socket server when user is authenticated
  const connectSocket = (userData) =>{
    if(!userData || socket?.connected) return;

    const newSocket = io(backendUrl,{
      query : {userId : userData._id}
    });
    newSocket.connect();
    setSocket(newSocket); 

    newSocket.on("getOnlineUsers",(users)=>{
      setOnlineUsers(users);
    })
  };
  useEffect(()=>{
    if(token){
      axios.defaults.headers.common["token"] = token;
    }
    checkAuth();
  },[token])

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    isCheckingAuth,
    theme,
    toggleTheme,
    setAuthUser,
    login,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};