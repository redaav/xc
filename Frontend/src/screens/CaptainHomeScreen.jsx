import { useEffect, useState } from "react";
import { useCaptain } from "../contexts/CaptainContext";
import { Phone, User } from "lucide-react";
import { NewRide, Sidebar } from "../components";
import MapView from "../components/MapView";
import { supabase } from "../lib/supabase";
import { useAlert } from "../hooks/useAlert";
import { Alert } from "../components";

function CaptainHomeScreen() {
  const { captain } = useCaptain();
  const [loading, setLoading] = useState(false);
  const { alert, showAlert, hideAlert } = useAlert();

  const [captainLocation, setCaptainLocation] = useState({ lat: 20.5937, lng: 78.9629 });

  const [earnings, setEarnings] = useState({ total: 0, today: 0 });
  const [rides, setRides] = useState({ accepted: 0, cancelled: 0, distanceTravelled: 0 });

  const [newRide, setNewRide] = useState(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const [showCaptainDetailsPanel, setShowCaptainDetailsPanel] = useState(true);
  const [showNewRidePanel, setShowNewRidePanel] = useState(false);
  const [showBtn, setShowBtn] = useState("accept");

  const updateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCaptainLocation({ lat, lng });
          supabase
            .from("captain_details")
            .update({ latitude: lat, longitude: lng, status: "active" })
            .eq("id", captain.id);
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  };

  const clearRideData = () => {
    setShowBtn("accept");
    setShowNewRidePanel(false);
    setShowCaptainDetailsPanel(true);
    setNewRide(null);
    setOtp("");
    setError("");
  };

  const acceptRide = async () => {
    if (!newRide) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from("rides")
        .update({ status: "accepted", captain_id: captain.id })
        .eq("id", newRide.id)
        .eq("status", "pending");

      if (error) throw error;

      const { data: updated } = await supabase
        .from("rides")
        .select("*, user:profiles!rides_user_id_fkey(id, firstname, lastname, phone, email)")
        .eq("id", newRide.id)
        .maybeSingle();

      if (!updated || updated.captain_id !== captain.id) {
        showAlert("Ride unavailable", "This ride was accepted by another captain", "failure");
        clearRideData();
        return;
      }

      setShowBtn("otp");
    } catch (err) {
      showAlert("Error", err.message || "Could not accept ride", "failure");
      clearRideData();
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!newRide || otp.length !== 6) return;
    try {
      setLoading(true);
      const { data: ride } = await supabase
        .from("rides")
        .select("otp")
        .eq("id", newRide.id)
        .maybeSingle();

      if (!ride || ride.otp !== otp) {
        setError("Invalid OTP");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("rides")
        .update({ status: "ongoing" })
        .eq("id", newRide.id);

      if (error) throw error;
      setShowBtn("end-ride");
    } catch (err) {
      setError("Failed to start ride");
    } finally {
      setLoading(false);
    }
  };

  const endRide = async () => {
    if (!newRide) return;
    try {
      setLoading(true);
      await supabase.from("rides").update({ status: "completed" }).eq("id", newRide.id);
      clearRideData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize
  useEffect(() => {
    if (captain?.id) {
      updateLocation();
    }
  }, [captain?.id]);

  // Fetch ride history for earnings
  useEffect(() => {
    if (!captain?.id) return;
    const fetchEarnings = async () => {
      const { data: captainRides } = await supabase
        .from("rides")
        .select("fare, status, distance, updated_at")
        .eq("captain_id", captain.id);

      if (!captainRides) return;

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      let total = 0, todayEarnings = 0, accepted = 0, cancelled = 0, dist = 0;

      captainRides.forEach((r) => {
        if (r.status === "completed") {
          accepted++;
          dist += r.distance || 0;
          total += r.fare;
          const d = new Date(r.updated_at);
          if (`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayStr) {
            todayEarnings += r.fare;
          }
        }
        if (r.status === "cancelled") cancelled++;
      });

      setEarnings({ total, today: todayEarnings });
      setRides({ accepted, cancelled, distanceTravelled: Math.round(dist / 1000) });
    };
    fetchEarnings();
  }, [captain?.id]);

  // Subscribe to pending rides for this captain's vehicle type
  useEffect(() => {
    if (!captain?.id) return;

    const vehicleType = captain.vehicle?.type;
    if (!vehicleType) return;

    const channel = supabase
      .channel("captain-rides")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: `vehicle_type=eq.${vehicleType}` },
        async (payload) => {
          const ride = payload.new;
          if (ride.status !== "pending") return;

          const { data: userProfile } = await supabase
            .from("profiles")
            .select("id, firstname, lastname, phone, email")
            .eq("id", ride.user_id)
            .maybeSingle();

          setNewRide({
            id: ride.id,
            pickup: ride.pickup,
            destination: ride.destination,
            fare: ride.fare,
            vehicle_type: ride.vehicle_type,
            distance: ride.distance,
            duration: ride.duration,
            otp: "",
            user: userProfile || {},
          });
          setShowNewRidePanel(true);
          setShowCaptainDetailsPanel(false);
          setShowBtn("accept");
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides" },
        (payload) => {
          const ride = payload.new;
          if (ride.id === newRide?.id && ride.status === "cancelled") {
            clearRideData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [captain?.id, captain?.vehicle?.type]);

  // Also poll for pending rides periodically (backup for realtime misses)
  useEffect(() => {
    if (!captain?.id || !captain?.vehicle?.type) return;
    const vehicleType = captain.vehicle.type;

    const poll = async () => {
      const { data: pendingRides } = await supabase
        .from("rides")
        .select("*, user:profiles!rides_user_id_fkey(id, firstname, lastname, phone, email)")
        .eq("status", "pending")
        .eq("vehicle_type", vehicleType)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pendingRides && pendingRides.length > 0 && !showNewRidePanel) {
        const ride = pendingRides[0];
        setNewRide({
          id: ride.id,
          pickup: ride.pickup,
          destination: ride.destination,
          fare: ride.fare,
          vehicle_type: ride.vehicle_type,
          distance: ride.distance,
          duration: ride.duration,
          otp: "",
          user: ride.user || {},
        });
        setShowNewRidePanel(true);
        setShowCaptainDetailsPanel(false);
        setShowBtn("accept");
      }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [captain?.id, captain?.vehicle?.type, showNewRidePanel]);

  const mapMarkers = [];
  if (newRide?.pickup_lat && newRide?.pickup_lng) {
    mapMarkers.push({ lat: newRide.pickup_lat, lng: newRide.pickup_lng, label: "Pickup" });
  }
  if (newRide?.dest_lat && newRide?.dest_lng) {
    mapMarkers.push({ lat: newRide.dest_lat, lng: newRide.dest_lng, label: "Destination" });
  }

  const defaultRideData = {
    user: { firstname: "", lastname: "", phone: "", email: "" },
    pickup: "",
    destination: "",
    fare: 0,
    distance: 0,
  };

  return (
    <div className="relative w-full h-dvh">
      <Alert
        heading={alert.heading}
        text={alert.text}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        type={alert.type}
      />
      <Sidebar userType="captain" profile={captain} />
      <div className="absolute inset-0 z-0">
        <MapView center={[captainLocation.lat, captainLocation.lng]} markers={mapMarkers} />
      </div>

      {showCaptainDetailsPanel && (
        <div className="absolute bottom-0 flex flex-col justify-start p-4 gap-2 rounded-t-lg bg-white h-fit w-full z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="my-2 select-none rounded-full w-10 h-10 bg-blue-400 mx-auto flex items-center justify-center">
                <h1 className="text-lg text-white">
                  {captain?.firstname?.[0] || ""}{captain?.lastname?.[0] || ""}
                </h1>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-6">
                  {captain?.firstname} {captain?.lastname}
                </h1>
                <p className="text-xs flex items-center gap-1 text-gray-500">
                  <Phone size={12} />{captain?.phone}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Earnings</p>
              <h1 className="font-semibold">&#8377; {earnings.today}</h1>
            </div>
          </div>

          <div className="flex justify-around items-center mt-2 py-4 rounded-lg bg-zinc-800">
            <div className="flex flex-col items-center text-white">
              <h1 className="mb-1 text-xl">{rides.accepted}</h1>
              <p className="text-xs text-gray-400 text-center leading-3">Rides<br />Accepted</p>
            </div>
            <div className="flex flex-col items-center text-white">
              <h1 className="mb-1 text-xl">{rides.distanceTravelled}</h1>
              <p className="text-xs text-gray-400 text-center leading-3">Km<br />Travelled</p>
            </div>
            <div className="flex flex-col items-center text-white">
              <h1 className="mb-1 text-xl">{rides.cancelled}</h1>
              <p className="text-xs text-gray-400 text-center leading-3">Rides<br />Cancelled</p>
            </div>
          </div>

          <div className="flex justify-between border-2 items-center pl-3 py-2 rounded-lg">
            <div>
              <h1 className="text-lg font-semibold leading-6 tracking-tighter">{captain?.vehicle?.number}</h1>
              <p className="text-xs text-gray-500 flex items-center">
                {captain?.vehicle?.color} | <User size={12} strokeWidth={2.5} /> {captain?.vehicle?.capacity}
              </p>
            </div>
            <img
              className="rounded-full h-16 scale-x-[-1]"
              src={captain?.vehicle?.type === "car" ? "/car.png" : `/${captain?.vehicle?.type}.webp`}
              alt="Vehicle"
            />
          </div>
        </div>
      )}

      <NewRide
        rideData={newRide || defaultRideData}
        otp={otp}
        setOtp={setOtp}
        showBtn={showBtn}
        showPanel={showNewRidePanel}
        setShowPanel={setShowNewRidePanel}
        showPreviousPanel={setShowCaptainDetailsPanel}
        loading={loading}
        acceptRide={acceptRide}
        verifyOTP={verifyOTP}
        endRide={endRide}
        error={error}
      />
    </div>
  );
}

export default CaptainHomeScreen;
