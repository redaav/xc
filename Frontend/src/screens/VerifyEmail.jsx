import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import mailImg from "/mail.png";
import { Button } from "../components";
import { useEffect, useState } from "react";

const VerifyEmail = () => {
  const { userType } = useParams();
  const [response, setResponse] = useState("Verifying your email...");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("profiles").update({ email_verified: true }).eq("id", session.user.id);
        setResponse("Your email is verified successfully. You can continue using the application.");
      } else {
        setResponse("Invalid or expired verification link.");
      }
      setLoading(false);
    };
    verify();
  }, []);

  return (
    <div className="w-full h-dvh flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-2xl font-bold">Email Verification</h1>
      <img src={mailImg} alt="Verify Email" className="h-24 mx-auto mb-4" />
      <p className="text-md font-semibold">{response}</p>
      <Button
        title={"Go to Home"}
        fun={() => navigate(userType === "captain" ? "/captain/home" : "/home")}
        disabled={loading}
      />
    </div>
  );
};

export default VerifyEmail;
