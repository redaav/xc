import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "../contexts/UserContext";
import { Button, LocationSuggestions, SelectVehicle, RideDetails, Sidebar } from "../components";
import MapView from "../components/MapView";
import { supabase } from "../lib/supabase";
import debounce from "lodash.debounce";
import { calculateFare, haversineDistance, estimateDuration } from "../utils/maps";

function UserHomeScreen() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [selectedInput, setSelectedInput] = useState("pickup");
  const [locationSuggestion, setLocationSuggestion] = useState([]);
  const [rideCreated, setRideCreated] = useState(false);

  const [pickupLocation, setPickupLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState("car");
  const [fare, setFare] = useState({ auto: 0, car: 0, bike: 0 });
  const [confirmedRideData, setConfirmedRideData] = useState(null);
  const [currentRideId, setCurrentRideId] = useState(null);
  const rideTimeout = useRef(null);

  const [userLocation, setUserLocation] = useState({ lat: 20.5937, lng: 78.9629 });

  // Panels
  const [showFindTripPanel, setShowFindTripPanel] = useState(true);
  const [showSelectVehiclePanel, setShowSelectVehiclePanel] = useState(false);
  const [showRideDetailsPanel, setShowRideDetailsPanel] = useState(false);

  const handleLocationChange = useCallback(
    debounce(async (inputValue) => {
      if (inputValue.length >= 3) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&limit=5`
          );
          const data = await response.json();
          setLocationSuggestion(data);
        } catch (error) {
          console.error(error);
        }
      }
    }, 700),
    []
  );

  const resolveCoords = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  };

  const onChangeHandler = (e) => {
    setSelectedInput(e.target.id);
    const value = e.target.value;
    if (e.target.id === "pickup") setPickupLocation(value);
    else if (e.target.id === "destination") setDestinationLocation(value);
    handleLocationChange(value);
    if (value.length < 3) setLocationSuggestion([]);
  };

  const selectSuggestion = (suggestion) => {
    const name = suggestion.display_name;
    const coords = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    if (selectedInput === "pickup") {
      setPickupLocation(name);
      setPickupCoords(coords);
    } else {
      setDestinationLocation(name);
      setDestCoords(coords);
    }
    setLocationSuggestion([]);
  };

  const getDistanceAndFare = async () => {
    try {
      setLoading(true);
      let pc = pickupCoords;
      let dc = destCoords;
      if (!pc) pc = await resolveCoords(pickupLocation);
      if (!dc) dc = await resolveCoords(destinationLocation);
      if (!pc || !dc) {
        setLoading(false);
        return;
      }
      setPickupCoords(pc);
      setDestCoords(dc);

      const distance = haversineDistance(pc.lat, pc.lng, dc.lat, dc.lng);
      const duration = estimateDuration(distance);
      const calculatedFare = calculateFare(distance, duration);
      setFare(calculatedFare);

      setShowFindTripPanel(false);
      setShowSelectVehiclePanel(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createRide = async () => {
    try {
      setLoading(true);
      const { data: ride, error } = await supabase
        .from("rides")
        .insert({
          user_id: user.id,
          pickup: pickupLocation,
          destination: destinationLocation,
          pickup_lat: pickupCoords?.lat,
          pickup_lng: pickupCoords?.lng,
          dest_lat: destCoords?.lat,
          dest_lng: destCoords?.lng,
          fare: fare[selectedVehicle],
          vehicle_type: selectedVehicle,
          status: "pending",
          distance: pickupCoords && destCoords ? Math.round(haversineDistance(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng)) : null,
          duration: pickupCoords && destCoords ? estimateDuration(haversineDistance(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng)) : null,
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentRideId(ride.id);
      setRideCreated(true);

      rideTimeout.current = setTimeout(() => {
        cancelRide(ride.id);
      }, 90000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRide = async (rideId) => {
    const id = rideId || currentRideId;
    if (!id) return;
    try {
      setLoading(true);
      await supabase.from("rides").update({ status: "cancelled" }).eq("id", id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      resetRide();
    }
  };

  const resetRide = () => {
    clearTimeout(rideTimeout.current);
    setShowRideDetailsPanel(false);
    setShowSelectVehiclePanel(false);
    setShowFindTripPanel(true);
    setPickupLocation("");
    setDestinationLocation("");
    setPickupCoords(null);
    setDestCoords(null);
    setSelectedVehicle("car");
    setFare({ auto: 0, car: 0, bike: 0 });
    setConfirmedRideData(null);
    setRideCreated(false);
    setCurrentRideId(null);
  };

  // Update user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.error("Geolocation error:", error)
      );
    }
  }, []);

  // Subscribe to ride updates
  useEffect(() => {
    if (!currentRideId) return;

    const channel = supabase
      .channel(`ride-${currentRideId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${currentRideId}` },
        async (payload) => {
          const updatedRide = payload.new;
          if (updatedRide.status === "accepted" && updatedRide.captain_id) {
            clearTimeout(rideTimeout.current);
            const { data: captainProfile } = await supabase
              .from("profiles")
              .select("id, firstname, lastname, phone")
              .eq("id", updatedRide.captain_id)
              .maybeSingle();
            const { data: captainDetails } = await supabase
              .from("captain_details")
              .select("vehicle_color, vehicle_number, vehicle_capacity, vehicle_type, latitude, longitude")
              .eq("id", updatedRide.captain_id)
              .maybeSingle();

            setConfirmedRideData({
              id: updatedRide.id,
              otp: updatedRide.otp,
              captain: {
                id: updatedRide.captain_id,
                firstname: captainProfile?.firstname || "",
                lastname: captainProfile?.lastname || "",
                phone: captainProfile?.phone || "",
                vehicle: captainDetails ? {
                  color: captainDetails.vehicle_color,
                  number: captainDetails.vehicle_number,
                  capacity: captainDetails.vehicle_capacity,
                  type: captainDetails.vehicle_type,
                } : null,
                location: captainDetails ? { lat: captainDetails.latitude, lng: captainDetails.longitude } : null,
              },
            });
            setRideCreated(false);
          }
          if (updatedRide.status === "ongoing") {
            // Ride started - just update status awareness
          }
          if (updatedRide.status === "completed") {
            resetRide();
          }
          if (updatedRide.status === "cancelled") {
            resetRide();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRideId]);

  // Map markers
  const markers = [];
  if (pickupCoords) markers.push({ lat: pickupCoords.lat, lng: pickupCoords.lng, label: "Pickup" });
  if (destCoords) markers.push({ lat: destCoords.lat, lng: destCoords.lng, label: "Destination" });
  if (confirmedRideData?.captain?.location) {
    markers.push({ lat: confirmedRideData.captain.location.lat, lng: confirmedRideData.captain.location.lng, label: "Captain" });
  }

  const mapCenter = confirmedRideData?.captain?.location
    ? [confirmedRideData.captain.location.lat, confirmedRideData.captain.location.lng]
    : markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [userLocation.lat, userLocation.lng];

  return (
    <div className="relative w-full h-dvh">
      <Sidebar userType="user" profile={user} />
      <div className="absolute inset-0 z-0">
        <MapView center={mapCenter} markers={markers} route={markers.length === 2 ? markers : null} />
      </div>

      {showFindTripPanel && (
        <div className="absolute bottom-0 flex flex-col justify-start p-4 pb-2 gap-4 rounded-b-lg bg-white h-fit w-full z-10">
          <h1 className="text-2xl font-semibold">Find a trip</h1>
          <div className="flex items-center relative w-full h-fit">
            <div className="h-3/5 w-[3px] flex flex-col items-center justify-between bg-black rounded-full absolute mx-5">
              <div className="w-2 h-2 rounded-full border-[3px] bg-white border-black"></div>
              <div className="w-2 h-2 rounded-sm border-[3px] bg-white border-black"></div>
            </div>
            <div>
              <input
                id="pickup"
                placeholder="Add a pick-up location"
                className="w-full bg-zinc-100 pl-10 pr-4 py-3 rounded-lg outline-black text-sm mb-2 truncate"
                value={pickupLocation}
                onChange={onChangeHandler}
                autoComplete="off"
              />
              <input
                id="destination"
                placeholder="Add a drop-off location"
                className="w-full bg-zinc-100 pl-10 pr-4 py-3 rounded-lg outline-black text-sm truncate"
                value={destinationLocation}
                onChange={onChangeHandler}
                autoComplete="off"
              />
            </div>
          </div>
          {pickupLocation.length > 2 && destinationLocation.length > 2 && (
            <Button title={"Search"} loading={loading} fun={getDistanceAndFare} />
          )}
          <div className="w-full h-full overflow-y-scroll">
            {locationSuggestion.length > 0 && (
              <LocationSuggestions
                suggestions={locationSuggestion}
                setSuggestions={setLocationSuggestion}
                setPickupLocation={(name) => { setPickupLocation(name); }}
                setDestinationLocation={(name) => { setDestinationLocation(name); }}
                input={selectedInput}
                onSelect={selectSuggestion}
              />
            )}
          </div>
        </div>
      )}

      <SelectVehicle
        selectedVehicle={setSelectedVehicle}
        showPanel={showSelectVehiclePanel}
        setShowPanel={setShowSelectVehiclePanel}
        showPreviousPanel={setShowFindTripPanel}
        showNextPanel={setShowRideDetailsPanel}
        fare={fare}
      />

      <RideDetails
        pickupLocation={pickupLocation}
        destinationLocation={destinationLocation}
        selectedVehicle={selectedVehicle}
        fare={fare}
        showPanel={showRideDetailsPanel}
        setShowPanel={setShowRideDetailsPanel}
        showPreviousPanel={setShowSelectVehiclePanel}
        createRide={createRide}
        cancelRide={() => cancelRide()}
        loading={loading}
        rideCreated={rideCreated}
        confirmedRideData={confirmedRideData}
      />
    </div>
  );
}

export default UserHomeScreen;
