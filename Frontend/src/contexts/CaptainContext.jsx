import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const captainDataContext = createContext();

const defaultCaptain = {
  id: null,
  email: "",
  firstname: "",
  lastname: "",
  phone: "",
  email_verified: false,
  user_type: "captain",
  vehicle: { color: "", number: "", capacity: 0, type: "" },
  status: "inactive",
  latitude: null,
  longitude: null,
};

function CaptainContext({ children }) {
  const [captain, setCaptain] = useState(defaultCaptain);

  useEffect(() => {
    const fetchCaptainProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile) return;

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
          user_type: profile.user_type || "captain",
          vehicle: details ? {
            color: details.vehicle_color || "",
            number: details.vehicle_number || "",
            capacity: details.vehicle_capacity || 0,
            type: details.vehicle_type || "",
          } : defaultCaptain.vehicle,
          status: details?.status || "inactive",
          latitude: details?.latitude || null,
          longitude: details?.longitude || null,
        });
      } catch (error) {
        console.error("Error fetching captain profile:", error);
      }
    };
    fetchCaptainProfile();
  }, []);

  return (
    <captainDataContext.Provider value={{ captain, setCaptain }}>
      {children}
    </captainDataContext.Provider>
  );
}

export const useCaptain = () => {
  const { captain, setCaptain } = useContext(captainDataContext);
  return { captain, setCaptain };
};

export default CaptainContext;
