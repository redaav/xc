import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button, Heading, Input } from "../components";
import { useUser } from "../contexts/UserContext";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAlert } from "../hooks/useAlert";
import { Alert } from "../components";

function UserEditProfile() {
  const [loading, setLoading] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const { handleSubmit, register, formState: { errors } } = useForm();
  const { user, setUser } = useUser();
  const navigation = useNavigate();

  const updateProfile = async (data) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({ firstname: data.firstname, lastname: data.lastname, phone: data.phone })
        .eq("id", user.id);

      if (error) throw error;

      setUser({ ...user, firstname: data.firstname, lastname: data.lastname, phone: data.phone });
      showAlert("Edit Successful", "Your profile details have been successfully updated", "success");
      setTimeout(() => navigation("/home"), 3000);
    } catch (error) {
      showAlert("Error", error.message || "Failed to update profile", "failure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-dvh flex flex-col justify-between p-4 pt-6">
      <Alert heading={alert.heading} text={alert.text} isVisible={alert.isVisible} onClose={hideAlert} type={alert.type} />
      <div>
        <div className="flex gap-3">
          <ArrowLeft strokeWidth={3} className="mt-[5px] cursor-pointer" onClick={() => navigation(-1)} />
          <Heading title={"Edit Profile"} />
        </div>
        <Input label={"Email"} type={"email"} name={"email"} register={register} error={errors.email} defaultValue={user?.email} disabled={true} />
        <form onSubmit={handleSubmit(updateProfile)}>
          <Input label={"First name"} name={"firstname"} register={register} error={errors.firstname} defaultValue={user?.firstname} />
          <Input label={"Last name"} name={"lastname"} register={register} error={errors.lastname} defaultValue={user?.lastname} />
          <Input label={"Phone Number"} type={"number"} name={"phone"} register={register} error={errors.phone} defaultValue={user?.phone} />
          <Button title={"Update Profile"} loading={loading} type="submit" classes={"mt-4"} />
        </form>
      </div>
    </div>
  );
}

export default UserEditProfile;
