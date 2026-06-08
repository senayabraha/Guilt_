import { BanknoteIcon, ChevronRightIcon, CreditCardIcon } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface CheckoutPaymentProps {
  setStep: Dispatch<SetStateAction<string>>;
  paymentMethod: string;
  setPaymentMethod: Dispatch<SetStateAction<string>>;
}

export default function CheckoutPayment({
  setStep,
  paymentMethod,
  setPaymentMethod,
}: CheckoutPaymentProps) {
  return (
    <div className="bg-white rounded-2xl p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-app-green mb-5 flex items-center gap-2">
        <CreditCardIcon className="size-5" /> Payment Method
      </h2>

      <div className="space-y-3">
        {/* Cash on Delivery — the only supported method */}
        <label className="flex items-center gap-4 p-4 rounded-xl border border-app-green bg-app-cream cursor-pointer">
          <input
            type="radio"
            name="payment"
            value="cash"
            checked={paymentMethod === "cash"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="size-4 text-app-green"
          />
          <div className="flex items-start gap-3">
            <BanknoteIcon className="size-5 text-app-green shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-app-green">
                Cash on Delivery
              </p>
              <p className="text-xs text-app-text-light">
                Pay in cash when your order arrives — no card required.
              </p>
            </div>
          </div>
        </label>

        <p className="text-xs text-app-text-light px-1">
          Online card payment will be available soon.
        </p>
      </div>

      <button
        onClick={() => {
          setStep("review");
          scrollTo(0, 0);
        }}
        className="mt-6 px-6 py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors flex items-center gap-2"
      >
        Review Order <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
