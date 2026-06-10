import { ChevronRightIcon, MapPinIcon, PhoneIcon, PlusIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router-dom";
import type { Address } from "../../types";

interface Props {
  addresses: Address[];
  address: Address;
  setAddress: Dispatch<SetStateAction<Address>>;
  setStep: Dispatch<SetStateAction<string>>;
  phone: string;
  setPhone: Dispatch<SetStateAction<string>>;
  instructions: string;
  setInstructions: Dispatch<SetStateAction<string>>;
}

const CheckoutAddress = ({
  addresses,
  address,
  setAddress,
  setStep,
  phone,
  setPhone,
  instructions,
  setInstructions,
}: Props) => {
  const canContinue = !!address.city && phone.trim().length >= 7;
  const phoneId = "checkout-phone";
  const instructionsId = "checkout-instructions";

  return (
    <div className="bg-white rounded-2xl p-6 animate-fade-in space-y-6">
      <h2 className="text-lg font-semibold text-app-green flex items-center gap-2">
        <MapPinIcon className="size-5" /> Delivery Address
      </h2>

      {/* Saved address picker */}
      {addresses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-app-green mb-3">
            Saved Addresses
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {addresses.map((addr) => {
              const isSelected =
                address._id === addr._id || address.id === addr.id;
              return (
                <button
                  type="button"
                  key={addr._id || addr.id}
                  onClick={() => setAddress(addr)}
                  className={`w-full p-4 text-left rounded-xl border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-app-green bg-app-cream"
                      : "border-app-border hover:bg-app-cream"
                  }`}
                  aria-pressed={isSelected}
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
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      No map pin — edit to add one
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {address.address && !address.lat && !address.lng && (
            <p className="text-xs text-amber-600 mt-3">
              Tip: add a map pin from{" "}
              <Link to="/addresses" className="underline font-medium">
                My Addresses
              </Link>{" "}
              so the delivery partner can find you easily.
            </p>
          )}
        </div>
      )}

      {addresses.length === 0 && (
        <p className="text-sm text-app-text-light">
          You have no saved addresses yet. Add one below to continue.
        </p>
      )}

      {/* Phone number */}
      <div>
        <label htmlFor={phoneId} className="block text-sm font-semibold text-app-green mb-2">
          Phone Number <span className="text-app-error">*</span>
        </label>
        <div className="relative">
          <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            id={phoneId}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+251 9XX XXX XXXX"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-app-border rounded-xl focus:border-app-green outline-none transition-colors"
          />
        </div>
        <p className="text-xs text-app-text-light mt-1">
          The delivery partner will call this number when they arrive.
        </p>
      </div>

      {/* Delivery instructions */}
      <div>
        <label htmlFor={instructionsId} className="block text-sm font-semibold text-app-green mb-2">
          Delivery Instructions{" "}
          <span className="text-app-text-light font-normal">(optional)</span>
        </label>
        <textarea
          id={instructionsId}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="E.g. Ring the bell, leave at gate, call before arriving…"
          rows={3}
          className="w-full px-4 py-2.5 text-sm bg-white border border-app-border rounded-xl focus:border-app-green outline-none transition-colors resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            setStep("payment");
            scrollTo(0, 0);
          }}
          disabled={!canContinue}
          className="px-6 py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Continue to Payment <ChevronRightIcon className="size-4" />
        </button>

        <Link
          to="/addresses"
          className="px-6 py-3 border border-app-border text-app-text-light rounded-xl flex items-center justify-center gap-2 text-sm hover:border-app-green hover:text-app-green transition-colors"
        >
          <PlusIcon className="size-4" /> Manage Addresses
        </Link>
      </div>
    </div>
  );
};

export default CheckoutAddress;
