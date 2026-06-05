import {
  CreditCard,
  MapPinMinus,
  MapPinPlus,
  PhoneCall,
  SendHorizontal,
} from "lucide-react";
import Button from "./Button";

function NewRide({
  rideData,
  otp,
  setOtp,
  showBtn,
  showPanel,
  setShowPanel,
  showPreviousPanel,
  loading,
  acceptRide,
  endRide,
  verifyOTP,
  error,
}) {
  const ignoreRide = () => {
    setShowPanel(false);
    showPreviousPanel(true);
  };

  const pickupParts = (rideData?.pickup || "").split(", ");
  const destParts = (rideData?.destination || "").split(", ");

  return (
    <div
      className={`${showPanel ? "bottom-0" : "-bottom-[60%]"} transition-all duration-500 absolute bg-white w-full rounded-t-xl p-4 pt-0`}
    >
      <div>
        <div className="flex justify-between items-center pb-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="my-2 select-none rounded-full w-10 h-10 bg-green-500 mx-auto flex items-center justify-center">
              <h1 className="text-lg text-white">
                {rideData?.user?.firstname?.[0] || ""}{rideData?.user?.lastname?.[0] || ""}
              </h1>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-6">
                {rideData?.user?.firstname} {rideData?.user?.lastname}
              </h1>
              <p className="text-xs text-gray-500">{rideData?.user?.phone || rideData?.user?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="font-semibold text-lg">&#8377; {rideData?.fare}</h1>
            <p className="text-xs text-gray-500">
              {rideData?.distance ? `${(rideData.distance / 1000).toFixed(1)} Km` : ""}
            </p>
          </div>
        </div>

        {showBtn !== "accept" && (
          <div className="flex gap-2 mb-2">
            <Button
              type={"link"}
              path={`/captain/chat/${rideData?.id}`}
              title={"Send a message..."}
              icon={<SendHorizontal strokeWidth={1.5} size={18} />}
              classes={"bg-zinc-100 font-medium text-sm text-zinc-950"}
            />
            <div className="flex items-center justify-center w-14 rounded-md bg-zinc-100">
              <a href={"tel:" + rideData?.user?.phone}>
                <PhoneCall size={18} strokeWidth={2} color="black" />
              </a>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-3 border-t-2 py-2 px-2">
            <MapPinMinus size={18} />
            <div>
              <h1 className="text-lg font-semibold leading-5">{pickupParts[0]}</h1>
              <p className="text-xs text-gray-800">{pickupParts.slice(1).join(", ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t-2 py-2 px-2">
            <MapPinPlus size={18} />
            <div>
              <h1 className="text-lg font-semibold leading-5">{destParts[0]}</h1>
              <p className="text-xs text-gray-800">{destParts.slice(1).join(", ")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t-2 py-2 px-2">
            <CreditCard size={18} />
            <div>
              <h1 className="text-lg font-semibold leading-6">&#8377; {rideData?.fare}</h1>
              <p className="text-xs text-gray-800">Cash</p>
            </div>
          </div>
        </div>

        {showBtn === "accept" ? (
          <div className="flex gap-2">
            <Button title={"Ignore"} loading={loading} fun={ignoreRide} classes={"bg-white text-zinc-900 border-2 border-black"} />
            <Button title={"Accept"} fun={acceptRide} loading={loading} />
          </div>
        ) : showBtn === "otp" ? (
          <>
            <input
              type="number"
              minLength={6}
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder={"Enter OTP"}
              className="w-full bg-zinc-100 px-4 py-3 rounded-lg outline-none text-sm mb-2"
            />
            {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
            <Button title={"Verify OTP"} loading={loading} fun={verifyOTP} />
          </>
        ) : (
          <Button title={"End Ride"} fun={endRide} loading={loading} classes={"bg-green-600"} />
        )}
      </div>
    </div>
  );
}

export default NewRide;
