import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const userDataContext = createContext();

const UserContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Check if user has an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setUser({
            id: null,
            email: "",
            firstname: "",
            lastname: "",
            phone: "",
            email_verified: false,
            user_type: "user",
          });
          setLoading(false);
          return;
        }

        // Fetch user profile from profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            firstname: "",
            lastname: "",
            phone: "",
            email_verified: session.user.email_confirmed_at ? true : false,
            user_type: "user",
          });
        } else if (profile) {
          setUser({
            id: profile.id,
            email: profile.email || session.user.email || "",
            firstname: profile.firstname || "",
            lastname: profile.lastname || "",
            phone: profile.phone || "",
            email_verified: profile.email_verified || session.user.email_confirmed_at ? true : false,
            user_type: profile.user_type || "user",
          });
        } else {
          // Profile doesn't exist yet
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            firstname: "",
            lastname: "",
            phone: "",
            email_verified: session.user.email_confirmed_at ? true : false,
            user_type: "user",
          });
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
        setUser({
          id: null,
          email: "",
          firstname: "",
          lastname: "",
          phone: "",
          email_verified: false,
          user_type: "user",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <userDataContext.Provider value={{ user, setUser, loading }}>
      {children}
    </userDataContext.Provider>
  );
};

export const useUser = () => {
  const { user, setUser, loading } = useContext(userDataContext);
  return { user, setUser, loading };
};

export default UserContext;
