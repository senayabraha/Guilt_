import React, { useEffect, useState } from "react";
import { MapPinIcon, PlusIcon } from "lucide-react";
import toast from "react-hot-toast";

import Loading from "../components/Loading";
import AddressCard from "../components/AddressCard";
import AddressForm from "../components/AddressForm";
import { useAuth } from "../context/AuthContext";
import type { Address } from "../types";
import {
  getMyAddresses,
  createAddress,
  updateAddress,
} from "../lib/db/addresses";

const Addresses = () => {
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: "",
    address: "",
    city: "Addis Ababa",
    state: "",
    zip: "",
    isDefault: false,
    lat: 0,
    lng: 0,
  });

  const resetForm = () => {
    setForm({
      label: "",
      address: "",
      city: "Addis Ababa",
      state: "",
      zip: "",
      isDefault: false,
      lat: 0,
      lng: 0,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    // The map pin (lat/lng) is required so delivery partners can find the spot.
    if (!form.lat || !form.lng) {
      toast.error("Drop a pin or use your current location on the map.");
      return;
    }
    try {
      const payload = { ...form };

      if (editingId) {
        await updateAddress(editingId, payload);
        toast.success("Address updated!");
      } else {
        if (!user) return;
        await createAddress(payload, user.id || user._id);
        toast.success("Address added!");
      }
      setAddresses(await getMyAddresses());
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "Failed");
    }
  };

  const onEditHandler = (add: Address) => {
    setForm({
      label: add.label,
      address: add.address,
      city: add.city || "Addis Ababa",
      state: add.state,
      zip: add.zip,
      isDefault: add.isDefault,
      lat: add.lat || 0,
      lng: add.lng || 0,
    });
    setEditingId(add.id || add._id);
    setShowForm(true);
  };

  useEffect(() => {
    getMyAddresses()
      .then(setAddresses)
      .catch((error: any) => {
        toast.error(error?.message || "Failed to load addresses");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Defensive: collapse exact-duplicate rows so the list never shows the same
  // address twice (the underlying query returns each DB row as-is).
  const seen = new Set<string>();
  const uniqueAddresses = addresses.filter((a) => {
    const sig = [a.label, a.zip, a.city, a.state, a.address, a.lat, a.lng]
      .join("|")
      .toLowerCase();
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  return (
    <div className="min-h-screen bg-app-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* page header  */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-app-green">
            My Addresses
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-app-green text-white text-sm font-semibold rounded-xl hover:bg-app-green-light transition-colors flex items-center gap-2"
          >
            <PlusIcon className="size-4" /> Add Address
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <AddressForm
            resetForm={resetForm}
            handleSubmit={handleSubmit}
            form={form}
            setForm={setForm}
            editingId={editingId}
          />
        )}

        {/* Addresses List */}
        {loading ? (
          <Loading />
        ) : uniqueAddresses.length === 0 ? (
          <div className="text-center py-16">
            <MapPinIcon className="size-16 text-app-border mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-app-green mb-2">
              No addresses saved
            </h2>
            <p className="text-sm text-app-text-light">
              Add an address for faster checkout
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {uniqueAddresses.map((addr) => (
              <AddressCard
                key={addr.id}
                addr={addr}
                onEditHandler={onEditHandler}
                setAddresses={setAddresses}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Addresses;
