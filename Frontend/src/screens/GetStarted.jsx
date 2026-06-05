import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/index";
import background from "/get_started_illustration.jpg";
import { useNavigate } from "react-router-dom";
import logo from "/logo-quickride.png";
import { supabase } from "../lib/supabase";

function GetStarted() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profile?.user_type === "user") navigate("/home", { replace: true });
        else if (profile?.user_type === "captain") navigate("/captain/home", { replace: true });
      }
    };
    checkSession();
  }, []);

  return (
    <div
      className="flex flex-col justify-between w-full h-full bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
    >
      <img className="h-10 object-contain m-4 self-start" src={logo} alt="Logo" />
      <div className="flex flex-col bg-white p-4 pb-8 gap-8 rounded-t-lg">
        <h1 className="text-2xl font-semibold">Get started with QuickRide</h1>
        <Button title={"Continue"} path={"/login"} type={"link"} icon={<ArrowRight />} />
      </div>
    </div>
  );
}

export default GetStarted;
