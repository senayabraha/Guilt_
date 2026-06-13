import { Outlet, useNavigate } from "react-router-dom";
import { AlertCircleIcon, LogOutIcon, TruckIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { DeliveryPartner } from "../../types";
import { supabase } from "../../lib/supabase";
import { getMyPartner } from "../../lib/db/deliveryPartners";
import Loading from "../../components/Loading";

export default function DeliveryLayout() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [checked, setChecked] = useState(false);
  const [inactive, setInactive] = useState(false);

  useEffect(() => {
    getMyPartner()
      .then((p) => {
        if (!p) {
          navigate("/delivery/login");
          return;
        }
        if (!p.isActive) {
          setInactive(true);
          return;
        }
        setPartner(p);
      })
      .catch(() => navigate("/delivery/login"))
      .finally(() => setChecked(true));
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPartner(null);
    navigate("/delivery/login");
  };

  if (!checked) return <Loading />;

  if (inactive) {
    return (
      <div className="min-h-screen bg-app-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-app-border p-8 max-w-sm w-full text-center space-y-5">
          <div className="flex justify-center">
            <AlertCircleIcon className="size-12 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-zinc-900">
              Account Inactive
            </h2>
            <p className="text-sm text-zinc-500">
              Your delivery partner account is inactive. Please contact admin
              support to reactivate your account.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl border border-app-border text-sm font-medium text-zinc-600 hover:bg-app-cream transition-colors flex items-center justify-center gap-2"
          >
            <LogOutIcon className="size-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="min-h-screen bg-app-cream">
      {/* Top Bar */}
      <header className="bg-white border-b border-app-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TruckIcon className="size-6 text-app-green" />
            <span className="text-lg font-semibold text-app-green">
              Zembil Delivery
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Log out of delivery account"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        {/* Partner data flows to the dashboard via outlet context so the
            dashboard does not need a second getMyPartner() call. */}
        <Outlet context={{ partner }} />
      </div>
    </div>
  );
}
