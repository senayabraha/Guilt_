import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckIcon,
  ChevronRightIcon,
  CreditCardIcon,
  MapPinIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCart } from "../context/CartContext";
import type { Address } from "../types";
import CheckoutAddress from "../components/Checkout/CheckoutAddress";
import CheckoutPayment from "../components/Checkout/CheckoutPayment";
import CheckoutReview from "../components/Checkout/CheckoutReview";
import { getMyAddresses } from "../lib/db/addresses";
import { placeOrder } from "../lib/db/orders";
import { formatCurrency } from "../lib/format";

const Checkout = () => {
  const navigate = useNavigate();

  const { items, cartTotal, clearCart } = useCart();

  const [step, setStep] = useState("address");
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const [address, setAddress] = useState<Address>({
    _id: "",
    id: "",
    label: "Home",
    address: "",
    city: "",
    state: "",
    zip: "",
    isDefault: false,
    lat: 0,
    lng: 0,
  });

  const [paymentMethod, setPaymentMethod] = useState("card");

  const deliveryFee = cartTotal > 20 ? 0 : 1.99;
  const tax = cartTotal * 0.08;
  const total = cartTotal + deliveryFee + tax;

  const steps: { key: string; label: string; icon: typeof MapPinIcon }[] = [
    { key: "address", label: "Address", icon: MapPinIcon },
    { key: "payment", label: "Payment", icon: CreditCardIcon },
    { key: "review", label: "Review", icon: CheckIcon },
  ];

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // Temporary cash/test flow: validation, totals, order creation, and stock
      // decrement happen server-side in the place_order RPC. No Stripe required.
      // shipping_address is stored as JSON. Include the new Addis-focused keys
      // (fullName/phone/area/instructions) plus legacy keys so existing order
      // displays keep working.
      const shippingAddress = {
        fullName: address.label,
        phone: address.zip,
        city: address.city,
        area: address.state,
        instructions: address.address,
        lat: address.lat,
        lng: address.lng,
        // legacy keys
        label: address.label,
        address: address.address,
        state: address.state,
        zip: address.zip,
      };

      const orderId = await placeOrder({
        items: items.map((item) => ({
          product: item.product.id || item.product._id,
          quantity: item.quantity,
        })),
        shippingAddress,
      });

      clearCart();
      toast.success("Order placed successfully!");
      navigate(`/orders/${orderId}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to place order");
    } finally {
      setLoading(false);
      scrollTo(0, 0);
    }
  };

  // Populate address from the user's default saved address.
  useEffect(() => {
    getMyAddresses()
      .then((addresses) => {
        setSavedAddresses(addresses);
        if (!addresses.length) return;
        const def = addresses.find((a) => a.isDefault) || addresses[0];
        setAddress(def);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-app-cream flex-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-app-green mb-2">
            Your cart is empty
          </h2>
          <p className="text-sm text-app-text-light mb-4">
            Add some products to checkout
          </p>
          <button
            onClick={() => navigate("/products")}
            className="px-5 py-2.5 bg-app-green text-white text-sm font-medium rounded-xl hover:bg-app-green-light transition-colors"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-app-text-light hover:text-app-green mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <h1 className="text-2xl font-semibold text-app-green mb-8">Checkout</h1>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <button
                onClick={() => setStep(s.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${step === s.key ? "bg-app-green text-white" : "bg-white text-app-text-light"}`}
              >
                <s.icon className="size-4" /> {s.label}
                {i < steps.length - 1 && (
                  <ChevronRightIcon className="size-4 text-app-text-light" />
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="md:col-span-2">
            {step === "address" && (
              <CheckoutAddress
                address={address}
                setAddress={setAddress}
                setStep={setStep}
                addresses={savedAddresses}
              />
            )}

            {step === "payment" && (
              <CheckoutPayment
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                setStep={setStep}
              />
            )}

            {step === "review" && (
              <CheckoutReview
                address={address}
                items={items}
                handlePlaceOrder={handlePlaceOrder}
                loading={loading}
                total={total}
              />
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-white rounded-2xl p-5 h-fit sticky top-24">
            <h3 className="text-sm font-semibold text-app-green mb-4">
              Order Summary
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-app-text-light">
                  Subtotal ({items.length} items)
                </span>
                <span>
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-app-text-light">Delivery</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-app-success">Free</span>
                  ) : (
                    `${formatCurrency(deliveryFee)}`
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-app-text-light">Tax</span>
                <span>
                  {formatCurrency(tax)}
                </span>
              </div>

              <div className="flex justify-between pt-3 border-t border-app-border text-base font-semibold">
                <span>Total</span>
                <span className="text-app-green">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
