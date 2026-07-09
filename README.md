# 💬 Real-Time Chat Application

A premium, state-of-the-art Real-Time Chat Application built as a portfolio project. This application supports secure authentication, real-time messaging, typing indicators, read receipts, image/file sharing, message search, emoji reactions, and fully synchronized group chats—all wrapped in a gorgeous dark/light mode UI with smooth micro-animations.

---

## ✨ Features Implemented

1. **User Authentication**: Secure signup and login with hashed passwords (bcryptjs), persistent sessions via JWT stored in HTTP-only cookies, and loading guards to prevent UI layout shifts.
2. **One-on-One Private Messaging**: Seamless and immediate direct messaging between users.
3. **Online/Offline Status Indicators**: Real-time status indicators (green active dots) powered by Socket.io connection tracking.
4. **Read Receipts (Seen Ticks)**: Real-time seen indicators where single grey ticks (`✓`) turn into double blue ticks (`✓✓`) as soon as the recipient opens the chat.
5. **Typing Indicators**: Bouncing three-dot typing bubbles and header states that appear instantly when the other user is typing.
6. **File & Image Sharing**: Integrated Cloudinary media uploads. Users can attach image files, preview them as base64 strings, and view them directly within message streams.
7. **Shared Media Gallery**: A right-side panel that dynamically aggregates all shared photos and files in the active chat.
8. **In-Chat & Sidebar Search**:
   - Sidebar filter to quickly find users by name.
   - Header search bar inside active chats to filter messaging history by keyword.
9. **Dark/Light Theme Toggle**: Full responsive theme toggle stored in `localStorage` utilizing Tailwind CSS v4 class-based variants.
10. **Group Chat Creation & Channels**:
    - Interactive modal to select multiple members and create custom group rooms.
    - Full socket broadcast to members on group messages.
    - Populated group member roster in the right sidebar showing active statuses.
11. **In-App Toast Alerts & Sound Notifications**: Audible alert sounds and informative toasts whenever a user receives a message from a background conversation.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Socket.io-client, React Router Dom, Axios, React Hot Toast
- **Backend**: Node.js, Express, Socket.io, MongoDB Mongoose ODM, JWT, Cloudinary, bcryptjs
- **Styling**: Class-based Tailwind CSS v4 styling with dynamic overlays, gradients, and micro-animations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB account (local MongoDB server or MongoDB Atlas cluster URI)
- Cloudinary account (for file sharing storage)

### Local Installation & Run

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd realtime-chat-app
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   ```
   - Create a `.env` file in the `server` directory and fill in the values according to `server/.env.example`:
   ```bash
   cp .env.example .env
   ```
   - Start the development server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../client
   npm install
   ```
   - Create a `.env` file in the `client` directory and fill in the values according to `client/.env.example`:
   ```bash
   cp .env.example .env
   ```
   - Start the React/Vite development server:
   ```bash
   npm run dev
   ```

---

## 📦 Deployment Guide

### Backend (Deployed on Render / Heroku)
1. Register/Login to [Render](https://render.com).
2. Create a new **Web Service** and link your Git repository.
3. Configure the Root Directory as `server`.
4. Select Environment as `Node`.
5. Under **Environment Variables**, add the variables defined in `server/.env.example` (make sure to set `CLIENT_URL` to your production frontend URL).
6. Deploy the service.

### Frontend (Deployed on Vercel / Netlify)
1. Register/Login to [Vercel](https://vercel.com).
2. Create a new Project and link your Git repository.
3. Set the Root Directory to `client`.
4. In the build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Under **Environment Variables**, add:
   - `VITE_BACKEND_URL` = (URL of your deployed Render backend, e.g., `https://my-chat-api.onrender.com`).
6. Click **Deploy**.

---

## 📄 License
This project is licensed under the MIT License.
