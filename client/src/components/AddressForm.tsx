import { XIcon } from "lucide-react";

import MapPinPicker from "./MapPinPicker";
import { ADDIS_AREAS } from "../lib/areas";

// Simplified Addis-Ababa-focused address form. We reuse the existing DB columns:
//   label   = Full Name (recipient)
//   zip     = Phone Number
//   city    = City (default "Addis Ababa")
//   state   = Sub-city / Area
//   address = Delivery instructions
//   lat/lng = map pin
const AddressForm = ({
  resetForm,
  handleSubmit,
  form,
  setForm,
  editingId,
}: any) => {
  return (
    <>
      {/* overlay  */}
      <div className="fixed inset-0 bg-black/40 z-50" />

      {/* form container  */}
      <div onClick={resetForm} className="fixed inset-0 z-50 flex-center p-4">
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 w-full max-w-lg animate-fade-in max-h-[92vh] overflow-y-auto"
        >
          {/* form header  */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-app-green">
              {editingId ? "Edit Address" : "Add Delivery Address"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="p-2 hover:bg-app-cream rounded-lg"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* form input fields  */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-app-green mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="Recipient name"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-green mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="+251 ..."
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-app-green mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-green mb-1.5">
                  Sub-city / Area
                </label>
                <select
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none bg-white"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                >
                  <option value="">Select area</option>
                  {ADDIS_AREAS.filter((a) => a !== "Addis Ababa").map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-green mb-1.5">
                Delivery instructions *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Example: Bole, behind Edna Mall, white gate. Call when nearby."
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none resize-none"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            {/* Map pin */}
            <MapPinPicker
              label="Map pin / GPS location *"
              lat={form.lat}
              lng={form.lng}
              onChange={(c) => setForm({ ...form, lat: c.lat, lng: c.lng })}
              helperText="Your pin helps delivery partners find you faster."
            />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />
              <span className="text-sm text-app-text">
                Set as default address
              </span>
            </label>
          </div>

          {/* submit button  */}
          <button
            type="submit"
            className="mt-6 w-full py-3 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors"
          >
            {editingId ? "Update Address" : "Save Address"}
          </button>
        </form>
      </div>
    </>
  );
};

export default AddressForm;
