import { useState } from "react";
import { ChevronRight, CircleUserRound, History, KeyRound, Menu, X } from "lucide-react";
import Button from "./Button";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Sidebar({ userType, profile }) {
  const [showSidebar, setShowSidebar] = useState(false);
  const navigate = useNavigate();

  const initials = `${profile?.firstname?.[0] || ""}${profile?.lastname?.[0] || ""}`;

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <div
        className="m-3 mt-4 absolute right-0 top-0 z-20 cursor-pointer bg-white p-1 rounded"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? <X /> : <Menu />}
      </div>

      <div
        className={`${showSidebar ? "left-0" : "-left-[100%]"} z-10 duration-300 absolute w-full h-dvh bottom-0 bg-white p-4 pt-5 flex flex-col justify-between`}
      >
        <div className="select-none">
          <h1 className="relative text-2xl font-semibold">Profile</h1>
          <div className="leading-3 mt-8 mb-4">
            <div className="my-2 rounded-full w-24 h-24 bg-blue-400 mx-auto flex items-center justify-center">
              <h1 className="text-5xl text-white">{initials || "?"}</h1>
            </div>
            <h1 className="text-center font-semibold text-2xl">
              {profile?.firstname} {profile?.lastname}
            </h1>
            <h1 className="mt-1 text-center text-zinc-400">{profile?.email}</h1>
          </div>

          <Link
            to={`/${userType}/edit-profile`}
            className="flex items-center justify-between py-4 cursor-pointer hover:bg-zinc-100 rounded-xl px-3"
            onClick={() => setShowSidebar(false)}
          >
            <div className="flex gap-3">
              <CircleUserRound /> <h1>Edit Profile</h1>
            </div>
            <ChevronRight />
          </Link>

          <Link
            to={`/${userType}/rides`}
            className="flex items-center justify-between py-4 cursor-pointer hover:bg-zinc-100 rounded-xl px-3"
            onClick={() => setShowSidebar(false)}
          >
            <div className="flex gap-3">
              <History /> <h1>Ride History</h1>
            </div>
            <ChevronRight />
          </Link>

          <Link
            to={`/${userType}/reset-password`}
            className="flex items-center justify-between py-4 cursor-pointer hover:bg-zinc-100 rounded-xl px-3"
            onClick={() => setShowSidebar(false)}
          >
            <div className="flex gap-3">
              <KeyRound /> <h1>Change Password</h1>
            </div>
            <ChevronRight />
          </Link>
        </div>

        <Button title={"Logout"} classes={"bg-red-600"} fun={logout} />
      </div>
    </>
  );
}

export default Sidebar;
