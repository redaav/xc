import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button, Input } from "../components";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import useCooldownTimer from "../hooks/useCooldownTimer";
import mailImg from "/mail.png";
import { ArrowLeft } from "lucide-react";
import { useAlert } from "../hooks/useAlert";
import { Alert } from "../components";

const allowedParams = ["user", "captain"];

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const { handleSubmit, register, formState: { errors } } = useForm();
  const navigation = useNavigate();
  const { userType } = useParams();
  const { alert, showAlert, hideAlert } = useAlert();
  const { timeLeft, isActive, startCooldown } = useCooldownTimer(60000, "forgot-password-cooldown");

  if (!allowedParams.includes(userType)) return <Navigate to={"/not-found"} replace />;

  const forgotPassword = async (data) => {
    if (!data.email.trim()) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/${userType}/reset-password`,
      });
      if (error) throw error;
      showAlert("Email sent!", "Please check your inbox for the password reset link", "success");
      startCooldown();
    } catch (error) {
      showAlert("Error", error.message || "Failed to send reset email", "failure");
    } finally {
      setLoading(false);
    }
  };

  const getButtonTitle = () => isActive ? `Wait ${timeLeft}s` : "Reset Password";

  return (
    <div className="w-full h-dvh flex flex-col text-center p-4 pt-6 gap-24">
      <Alert heading={alert.heading} text={alert.text} isVisible={alert.isVisible} onClose={hideAlert} type={alert.type} />
      <div className="flex gap-3">
        <ArrowLeft strokeWidth={3} className="mt-[5px] cursor-pointer" onClick={() => navigation(-1)} />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">Forgot your Password?</h1>
        <p className="text-sm mt-3 text-zinc-600 text-balance">Enter your registered email below to receive a password reset link</p>
        <img src={mailImg} alt="Verify Email" className="h-36 mx-auto my-8" />
        <form onSubmit={handleSubmit(forgotPassword)}>
          <Input placeholder={"example@gmail.com"} type={"email"} name={"email"} register={register} error={errors.email} />
          <Button title={getButtonTitle()} loading={loading} loadingMessage={"Sending..."} type="submit" disabled={loading || isActive} />
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
