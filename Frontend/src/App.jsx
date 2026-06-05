import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  GetStarted,
  UserLogin,
  CaptainLogin,
  UserHomeScreen,
  CaptainHomeScreen,
  UserProtectedWrapper,
  CaptainProtectedWrapper,
  UserSignup,
  CaptainSignup,
  RideHistory,
  UserEditProfile,
  CaptainEditProfile,
  Error,
  ChatScreen,
  VerifyEmail,
  ResetPassword,
  ForgotPassword,
} from "./screens/";
import { ChevronLeft, Trash2 } from "lucide-react";
import { supabase } from "./lib/supabase";

function App() {
  const forceReset = () => {
    if (confirm("Are you sure you want to reset the app? All data will be cleared.")) {
      supabase.auth.signOut();
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="w-full h-dvh flex items-center">
      <div className="relative w-full sm:min-w-96 sm:w-96 h-full bg-white overflow-hidden">
        <div className="absolute top-36 -right-11 opacity-20 hover:opacity-100 z-50 flex items-center p-1 pl-0 gap-1 bg-zinc-50 border-2 border-r-0 border-gray-300 hover:-translate-x-11 rounded-l-md transition-all duration-300">
          <ChevronLeft />
          <button className="flex justify-center items-center w-10 h-10 rounded-lg border-2 border-red-300 bg-red-200 text-red-500" onClick={forceReset}>
            <Trash2 strokeWidth={1.8} width={18} />
          </button>
        </div>

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<GetStarted />} />
            <Route path="/home" element={<UserProtectedWrapper><UserHomeScreen /></UserProtectedWrapper>} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/signup" element={<UserSignup />} />
            <Route path="/user/edit-profile" element={<UserProtectedWrapper><UserEditProfile /></UserProtectedWrapper>} />
            <Route path="/user/rides" element={<UserProtectedWrapper><RideHistory /></UserProtectedWrapper>} />
            <Route path="/user/reset-password" element={<ResetPassword />} />

            <Route path="/captain/home" element={<CaptainProtectedWrapper><CaptainHomeScreen /></CaptainProtectedWrapper>} />
            <Route path="/captain/login" element={<CaptainLogin />} />
            <Route path="/captain/signup" element={<CaptainSignup />} />
            <Route path="/captain/edit-profile" element={<CaptainProtectedWrapper><CaptainEditProfile /></CaptainProtectedWrapper>} />
            <Route path="/captain/rides" element={<CaptainProtectedWrapper><RideHistory /></CaptainProtectedWrapper>} />
            <Route path="/captain/reset-password" element={<ResetPassword />} />

            <Route path="/:userType/chat/:rideId" element={<ChatScreen />} />
            <Route path="/:userType/verify-email/" element={<VerifyEmail />} />
            <Route path="/:userType/forgot-password/" element={<ForgotPassword />} />
            <Route path="*" element={<Error />} />
          </Routes>
        </BrowserRouter>
      </div>
      <div className="hidden sm:block w-full h-full bg-emerald-50 overflow-hidden select-none border-l-2 border-black">
        <img
          className="h-full object-cover mx-auto select-none"
          src="https://img.freepik.com/free-vector/taxi-app-service-concept_23-2148497472.jpg?semt=ais_hybrid"
          alt="Side image"
        />
      </div>
    </div>
  );
}

export default App;
