import { useEffect, useState } from "react";
import { PlusIcon, XIcon, TruckIcon, PhoneIcon, MailIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { DeliveryPartner, DriverAvailabilityStatus, Store } from "../../types";
import Loading from "../../components/Loading";
import {
  getAllPartners,
  createPartner,
  updatePartner,
} from "../../lib/db/deliveryPartners";
import { getAllStores } from "../../lib/db/stores";

export default function AdminDeliveryPartners() {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    vehicleType: "bike",
    partnerType: "marketplace" as "marketplace" | "store_owned",
    storeId: "",
  });

  const fetchPartners = async () => {
    try {
      const [partnersData, storesData] = await Promise.all([
        getAllPartners(),
        getAllStores(),
      ]);
      setPartners(partnersData);
      setStores(storesData);
    } catch (error: any) {
      toast.error(error?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.partnerType === "store_owned" && !form.storeId) {
      toast.error("Please select a store for this store-owned driver.");
      return;
    }
    setSaving(true);
    try {
      await createPartner({
        ...form,
        storeId: form.partnerType === "store_owned" ? form.storeId : null,
      });
      toast.success("Partner onboarded successfully!");
      setShowForm(false);
      setForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        vehicleType: "bike",
        partnerType: "marketplace",
        storeId: "",
      });
      fetchPartners();
    } catch (error: any) {
      toast.error(error?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await updatePartner(id, { isActive: !isActive });
      toast.success(isActive ? "Partner deactivated" : "Partner activated");
      fetchPartners();
    } catch (error: any) {
      toast.error(error?.message || "Failed");
    }
  };

  const AVAIL_DOT: Record<DriverAvailabilityStatus, string> = {
    online: "bg-green-500",
    busy: "bg-amber-500",
    unavailable: "bg-red-400",
    offline: "bg-zinc-400",
  };
  const AVAIL_LABEL: Record<DriverAvailabilityStatus, string> = {
    online: "Online",
    busy: "Busy",
    unavailable: "Unavailable",
    offline: "Offline",
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">
          Delivery Partners
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-app-green text-white text-sm font-semibold rounded-xl hover:bg-app-green-light transition-colors flex items-center gap-2"
        >
          <PlusIcon className="size-4" /> Add Partner
        </button>
      </div>

      {/* Partners Grid */}
      {partners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-app-border">
          <TruckIcon className="size-12 text-app-border mx-auto mb-3" />
          <p className="text-lg font-semibold text-zinc-900 mb-1">
            No delivery partners
          </p>
          <p className="text-sm text-zinc-500">
            Onboard your first partner to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {partners.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-app-border p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-app-green flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {p.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">
                      {p.name}
                    </p>
                    <p className="text-xs text-zinc-500 capitalize">
                      {p.vehicleType}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <span
                      className={`size-1.5 rounded-full ${AVAIL_DOT[p.availabilityStatus]}`}
                    />
                    {AVAIL_LABEL[p.availabilityStatus]}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      p.partnerType === "store_owned"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {p.partnerType === "store_owned" ? "Store" : "Marketplace"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-zinc-600">
                <p className="flex items-center gap-2">
                  <MailIcon className="w-3.5 h-3.5 text-zinc-400" /> {p.email}
                </p>
                <p className="flex items-center gap-2">
                  <PhoneIcon className="w-3.5 h-3.5 text-zinc-400" /> {p.phone}
                </p>
              </div>
              <button
                onClick={() => toggleActive(p.id || p._id, p.isActive)}
                className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${p.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
              >
                {p.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Partner Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-app-cream/80 backdrop-blur z-50"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl p-6 w-full max-w-lg animate-fade-in"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-app-green">
                  Onboard Delivery Partner
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-app-cream rounded-lg"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-green mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-app-green mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-green mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-app-green mb-1.5">
                      Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-green mb-1.5">
                      Vehicle Type
                    </label>
                    <select
                      value={form.vehicleType}
                      onChange={(e) =>
                        setForm({ ...form, vehicleType: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none bg-white"
                    >
                      <option value="bike">Bike</option>
                      <option value="scooter">Scooter</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-green mb-1.5">
                    Partner Type
                  </label>
                  <select
                    value={form.partnerType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        partnerType: e.target.value as "marketplace" | "store_owned",
                        storeId: "",
                      })
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none bg-white"
                  >
                    <option value="marketplace">Marketplace (shared pool)</option>
                    <option value="store_owned">Store-owned (linked to a specific store)</option>
                  </select>
                </div>
                {form.partnerType === "store_owned" && (
                  <div>
                    <label className="block text-sm font-medium text-app-green mb-1.5">
                      Linked Store <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.storeId}
                      required
                      onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none bg-white"
                    >
                      <option value="">Select a store…</option>
                      {stores
                        .filter((s) => s.selfDeliveryEnabled)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                    {stores.filter((s) => s.selfDeliveryEnabled).length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No stores have self-delivery enabled. Enable it in the store detail page first.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-6 w-full py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Partner"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
