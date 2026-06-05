import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, ChevronUp, Clock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function RideHistory() {
  const navigation = useNavigate();
  const [rideList, setRideList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .maybeSingle();

      const field = profile?.user_type === "captain" ? "captain_id" : "user_id";
      const { data: rides } = await supabase
        .from("rides")
        .select("*")
        .eq(field, session.user.id)
        .order("created_at", { ascending: false });

      if (rides) setRideList(rides);
      setLoading(false);
    };
    fetchRides();
  }, []);

  function classifyAndSortRides(rides) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday = (d) => { const dd = new Date(d); return dd.getFullYear() === today.getFullYear() && dd.getMonth() === today.getMonth() && dd.getDate() === today.getDate(); };
    const isYesterday = (d) => { const dd = new Date(d); return dd.getFullYear() === yesterday.getFullYear() && dd.getMonth() === yesterday.getMonth() && dd.getDate() === yesterday.getDate(); };

    const todayRides = [], yesterdayRides = [], earlierRides = [];
    rides.forEach((ride) => {
      if (isToday(ride.created_at)) todayRides.push(ride);
      else if (isYesterday(ride.created_at)) yesterdayRides.push(ride);
      else earlierRides.push(ride);
    });

    return { today: todayRides, yesterday: yesterdayRides, earlier: earlierRides };
  }

  const categorized = classifyAndSortRides(rideList);

  return (
    <div className="p-4">
      <div className="flex gap-3">
        <ArrowLeft strokeWidth={3} className="mt-[4px] cursor-pointer" onClick={() => navigation(-1)} />
        <h1 className="text-2xl font-semibold mb-4">History</h1>
      </div>

      <div className="h-[90vh] overflow-scroll">
        {["today", "yesterday", "earlier"].map((period) => (
          <details open key={period} className="group">
            <summary className="flex items-center justify-between cursor-pointer text-gray-800 font-semibold mb-2 select-none">
              <span className="capitalize">{period}</span>
              <ChevronUp className="w-5 h-5 transition-transform duration-300 group-open:rotate-180 text-gray-600" />
            </summary>
            {categorized[period].length > 0 ? (
              categorized[period].map((ride) => <RideCard ride={ride} key={ride.id} />)
            ) : (
              <h1 className="text-sm text-center text-zinc-600">No rides found</h1>
            )}
          </details>
        ))}
      </div>
    </div>
  );
}

export const RideCard = ({ ride }) => {
  function formatDate(d) {
    const date = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  }

  function formatTime(d) {
    const date = new Date(d);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${period}`;
  }

  return (
    <div className="w-full px-3 py-2 border-2 mb-2 rounded-lg cursor-pointer relative">
      <div className="flex flex-wrap gap-2 justify-around">
        <h1 className="text-sm flex gap-1 items-center font-semibold">
          <Calendar size={13} className="-mt-[1px]" /> {formatDate(ride.created_at)}
        </h1>
        <h1 className="text-sm flex gap-1 items-center font-semibold">
          <Clock size={13} className="-mt-[1px]" /> {formatTime(ride.created_at)}
        </h1>
        <h1 className="text-sm flex gap-1 items-center font-semibold">
          <CreditCard size={13} className="-mt-[1px] text-black" />&#8377; {ride.fare}
        </h1>
      </div>

      <div className="bg-zinc-200 w-full h-[1px] my-2"></div>

      <div className="w-full items-center truncate">
        <div className="flex items-center relative w-full h-fit">
          <div className="h-4/5 w-[3px] flex flex-col items-center justify-between border-dashed border-2 border-black rounded-full absolute mx-2">
            <div className="w-3 h-3 rounded-full border-[3px] -mt-1 bg-green-500 border-black"></div>
            <div className="w-3 h-3 rounded-sm border-[3px] -mb-1 bg-red-400 border-black"></div>
          </div>
          <div className="ml-7 truncate w-full">
            <h1 className="text-xs truncate text-zinc-600" title={ride.pickup}>{ride.pickup}</h1>
            <div className="flex items-center gap-2">
              <div className="bg-zinc-200 w-full h-[2px]"></div>
              <h1 className="text-xs text-zinc-500">TO</h1>
              <div className="bg-zinc-200 w-full h-[2px]"></div>
            </div>
            <h1 className="text-xs truncate text-zinc-600" title={ride.destination}>{ride.destination}</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideHistory;
