import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button, Heading, Input } from "../components";
import { useCaptain } from "../contexts/CaptainContext";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAlert } from "../hooks/useAlert";
import { Alert } from "../components";

function CaptainEditProfile() {
  const [loading, setLoading] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();
  const { handleSubmit, register, formState: { errors } } = useForm();
  const { captain, setCaptain } = useCaptain();
  const navigation = useNavigate();

  const updateProfile = async (data) => {
    try {
      setLoading(true);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ firstname: data.firstname, lastname: data.lastname, phone: data.phone })
        .eq("id", captain.id);

      if (profileError) throw profileError;

      const { error: detailError } = await supabase
        .from("captain_details")
        .update({
          vehicle_color: data.color,
          vehicle_number: data.number,
          vehicle_capacity: parseInt(data.capacity),
          vehicle_type: data.type.toLowerCase(),
        })
        .eq("id", captain.id);

      if (detailError) throw detailError;

      setCaptain({
        ...captain,
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        vehicle: { color: data.color, number: data.number, capacity: parseInt(data.capacity), type: data.type.toLowerCase() },
      });
      navigation("/captain/home");
    } catch (error) {
      showAlert("Error", error.message || "Failed to update profile", "failure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-dvh flex flex-col justify-between p-4 pt-6">
      <Alert heading={alert.heading} text={alert.text} isVisible={alert.isVisible} onClose={hideAlert} type={alert.type} />
      <div className="overflow-auto">
        <div className="flex gap-3">
          <ArrowLeft strokeWidth={3} className="mt-[5px] cursor-pointer" onClick={() => navigation(-1)} />
          <Heading title={"Edit Profile"} />
        </div>
        <Input label={"Email"} type={"email"} name={"email"} register={register} error={errors.email} defaultValue={captain?.email} disabled={true} />
        <form onSubmit={handleSubmit(updateProfile)}>
          <Input label={"Phone Number"} type={"number"} name={"phone"} register={register} error={errors.phone} defaultValue={captain?.phone} />
          <div className="flex gap-4 -mb-2">
            <Input label={"First name"} name={"firstname"} register={register} error={errors.firstname} defaultValue={captain?.firstname} />
            <Input label={"Last name"} name={"lastname"} register={register} error={errors.lastname} defaultValue={captain?.lastname} />
          </div>
          <div className="flex gap-4 -my-2">
            <Input label={"Vehicle colour"} name={"color"} register={register} error={errors.color} defaultValue={captain?.vehicle?.color} />
            <Input label={"Vehicle capacity"} type={"number"} name={"capacity"} register={register} error={errors.capacity} defaultValue={captain?.vehicle?.capacity} />
          </div>
          <Input label={"Vehicle number"} name={"number"} register={register} error={errors.number} defaultValue={captain?.vehicle?.number} />
          <Input label={"Vehicle type"} type={"select"} options={["Car", "Bike", "Auto"]} name={"type"} register={register} error={errors.type} defaultValue={captain?.vehicle?.type} />
          <Button title={"Update Profile"} loading={loading} type="submit" classes={"mt-4"} />
        </form>
      </div>
    </div>
  );
}

export default CaptainEditProfile;
