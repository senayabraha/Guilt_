import { ChevronRightIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router-dom";

const CheckoutAddress = ({ addresses, address, setAddress, setStep }: any) => {
  return (
    <div className="bg-white rounded-2xl p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-app-green mb-5 flex items-center gap-2">
        <MapPinIcon className="size-5" /> Delivery Address
      </h2>
      {addresses && addresses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-app-green mb-3">
            Saved Addresses
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {addresses.map((addr: any) => (
              <div
                key={addr._id || addr.label}
                onClick={() =>
                  setAddress({
                    label: addr.label,
                    address: addr.address,
                    city: addr.city,
                    state: addr.state,
                    zip: addr.zip,
                    lat: addr.lat,
                    lng: addr.lng,
                  })
                }
                className={`p-4 rounded-xl border cursor-pointer transition-colors ${address.label === addr.label && address.address === addr.address ? "border-app-green bg-app-cream" : "border-app-border hover:bg-app-cream"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPinIcon className="size-4 text-app-green" />
                  <span className="font-semibold text-zinc-900 text-sm">
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-semibold text-app-orange uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                {addr.zip && (
                  <p className="text-xs text-zinc-500">{addr.zip}</p>
                )}
                <p className="text-xs text-zinc-500">
                  {addr.city}
                  {addr.state ? `, ${addr.state}` : ""}
                </p>
                {addr.address && (
                  <p className="text-sm text-zinc-600 truncate">
                    {addr.address}
                  </p>
                )}
                {addr.lat && addr.lng ? (
                  <p className="text-[11px] text-app-success mt-0.5">
                    Pinned location saved
                  </p>
                ) : (
                  <p className="text-[11px] text-app-orange mt-0.5">
                    No map pin — edit to add one
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {address.address && (!address.lat || !address.lng) && (
        <p className="text-xs text-app-orange mt-4">
          This address has no map pin. Add a pin from{" "}
          <Link to="/addresses" className="underline font-medium">
            My Addresses
          </Link>{" "}
          so delivery partners can find you.
        </p>
      )}
      <Link
        to="/addresses"
        className="mt-6 px-6 py-3 border border-gray-600 text-gray-600 rounded-xl flex-center gap-2"
      >
        Add New Address <PlusIcon className="size-4" />
      </Link>
      <button
        onClick={() => {
          setStep("payment");
          scrollTo(0, 0);
        }}
        disabled={!address.address || !address.city || !address.lat || !address.lng}
        className="mt-6 px-6 py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        Continue to Payment <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
};

export default CheckoutAddress;
