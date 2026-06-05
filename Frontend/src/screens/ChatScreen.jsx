import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Loading from "./Loading";

function ChatScreen() {
  const { rideId, userType } = useParams();
  const navigation = useNavigate();
  const scrollableDivRef = useRef(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [userId, setUserId] = useState(null);

  const scrollToBottom = () => {
    if (scrollableDivRef.current) {
      scrollableDivRef.current.scrollTop = scrollableDivRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigation(-1); return; }
      setUserId(session.user.id);

      // Fetch ride to get participants
      const { data: ride } = await supabase
        .from("rides")
        .select("user_id, captain_id")
        .eq("id", rideId)
        .maybeSingle();

      if (!ride) { navigation(-1); return; }

      // Authorization check
      if (session.user.id !== ride.user_id && session.user.id !== ride.captain_id) {
        navigation(-1);
        return;
      }

      // Fetch the other user's profile
      const otherId = userType === "user" ? ride.captain_id : ride.user_id;
      if (otherId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, firstname, lastname")
          .eq("id", otherId)
          .maybeSingle();
        setOtherUser(profile);
      }

      // Fetch existing messages
      const { data: existingMessages } = await supabase
        .from("ride_messages")
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });

      if (existingMessages) setMessages(existingMessages);
    };
    init();
  }, [rideId]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id !== userId) {
            setMessages((prev) => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [rideId, userId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const msgText = message;
    setMessage("");

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      ride_id: rideId,
      sender_id: userId,
      sender_type: userType,
      message: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    await supabase.from("ride_messages").insert({
      ride_id: rideId,
      sender_id: userId,
      sender_type: userType,
      message: msgText,
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!otherUser) return <Loading />;

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex h-fit items-center p-3 bg-white border-b-2 border-b-blue-600 gap-2">
        <ArrowLeft strokeWidth={3} className="cursor-pointer" onClick={() => navigation(-1)} />
        <div className="select-none rounded-full w-10 h-10 bg-blue-600 flex items-center justify-center">
          <h1 className="text-lg font-semibold text-white">
            {otherUser?.firstname?.[0]}{otherUser?.lastname?.[0]}
          </h1>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-black leading-6">
            {otherUser?.firstname} {otherUser?.lastname}
          </h1>
        </div>
      </div>

      <div className="overflow-scroll h-full bg-blue-100" ref={scrollableDivRef}>
        <div className="flex flex-col justify-end w-full p-3">
          {messages.map((msg, i) => (
            <span
              key={msg.id || i}
              className={`${msg.sender_type === userType ? "ml-auto rounded-br-none bg-blue-600 text-white" : "mr-auto rounded-bl-none bg-white"} rounded-xl mb-1 px-3 pt-2 pb-[3px] text-sm max-w-64 leading-4`}
            >
              {msg.message}
              <div className="text-[10px] font-normal text-right opacity-60 mt-[1px]">{formatTime(msg.created_at)}</div>
            </span>
          ))}
        </div>
      </div>

      <form className="flex items-center p-3 h-fit gap-2" onSubmit={sendMessage}>
        <input
          placeholder="Enter message..."
          className="w-full border-2 border-black outline-none rounded-md p-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          autoFocus
          spellCheck="false"
        />
        <button className="cursor-pointer px-1 bg-blue-600 hover:bg-blue-700 h-full aspect-square rounded-md flex items-center justify-center text-white">
          <Send />
        </button>
      </form>
    </div>
  );
}

export default ChatScreen;
