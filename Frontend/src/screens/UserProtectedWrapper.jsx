import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import Loading from "./Loading";
import { supabase } from "../lib/supabase";

function UserProtectedWrapper({ children }) {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { navigate("/login"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile || profile.user_type !== "user") {
          navigate("/login");
          return;
        }

        setUser({
          id: profile.id,
          email: profile.email || session.user.email || "",
          firstname: profile.firstname || "",
          lastname: profile.lastname || "",
          phone: profile.phone || "",
          email_verified: profile.email_verified || false,
          user_type: "user",
        });
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) return <Loading />;
  return <>{children}</>;
}

export default UserProtectedWrapper;
