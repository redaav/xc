import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCaptain } from "../contexts/CaptainContext";
import Loading from "./Loading";
import { supabase } from "../lib/supabase";

function CaptainProtectedWrapper({ children }) {
  const navigate = useNavigate();
  const { setCaptain } = useCaptain();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) { navigate("/captain/login"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile || profile.user_type !== "captain") {
          navigate("/captain/login");
          return;
        }

        const { data: details } = await supabase
          .from("captain_details")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        setCaptain({
          id: profile.id,
          email: profile.email || session.user.email || "",
          firstname: profile.firstname || "",
          lastname: profile.lastname || "",
          phone: profile.phone || "",
          email_verified: profile.email_verified || false,
          user_type: "captain",
          vehicle: details ? {
            color: details.vehicle_color || "",
            number: details.vehicle_number || "",
            capacity: details.vehicle_capacity || 0,
            type: details.vehicle_type || "",
          } : { color: "", number: "", capacity: 0, type: "" },
          status: details?.status || "inactive",
          latitude: details?.latitude || null,
          longitude: details?.longitude || null,
        });
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/captain/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) return <Loading />;
  return <>{children}</>;
}

export default CaptainProtectedWrapper;
