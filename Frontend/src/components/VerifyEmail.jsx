import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Heading from "./Heading";
import Button from "./Button";
import mailImg from "/mail.png";
import useCooldownTimer from "../hooks/useCooldownTimer";
import { Alert } from "./Alert";
import { useAlert } from "../hooks/useAlert";
import { supabase } from "../lib/supabase";

function VerifyEmail({ user, role }) {
  const navigation = useNavigate();
  const [loading, setLoading] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const { timeLeft, isActive, startCooldown } = useCooldownTimer(60000, "email-verification-cooldown");

  const sendVerification = async () => {
    try {
      setLoading(true);
      await supabase.from("profiles").update({ email_verified: true }).eq("id", user.id);
      showAlert("Email verified!", "Your email has been verified successfully", "success");
      startCooldown();
    } catch (error) {
      showAlert("Error", error.message || "Failed to verify email", "failure");
    } finally {
      setLoading(false);
    }
  };

  const getButtonTitle = () => isActive ? `Wait ${timeLeft}s` : "Verify Email";

  return (
    <div className="w-full h-dvh flex flex-col text-center p-4 pt-6 gap-24">
      <Alert heading={alert.heading} text={alert.text} isVisible={alert.isVisible} onClose={hideAlert} type={alert.type} />
      <div className="flex gap-3">
        <ArrowLeft strokeWidth={3} className="mt-[5px] cursor-pointer" onClick={() => navigation(-1)} />
        <Heading title={"Go Back"} />
      </div>
      <div className="px-2">
        <p className="">Hi{` ${user?.firstname}`}</p>
        <h1 className="text-2xl font-bold">Verify Your Email</h1>
        <img src={mailImg} alt="Verify Email" className="h-24 mx-auto mb-4" />
        <span className="inline-block font-semibold bg-green-200 rounded-lg px-4 py-2 my-3">{user?.email}</span>
        <p className="text-sm mb-6">Click the button below to verify your email and activate your account.</p>
        <Button
          title={getButtonTitle()}
          classes={"bg-orange-500"}
          loading={loading}
          loadingMessage={"Verifying..."}
          fun={sendVerification}
          disabled={loading || isActive}
        />
      </div>
    </div>
  );
}

export default VerifyEmail;
