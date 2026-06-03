import { MailIcon } from "lucide-react";

const Newsletter = () => {
  return (
    <section className="bg-white py-8 px-4 sm:px-6 rounded-2xl mx-auto shadow-xs border border-app-border/70 mt-10 mb-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="size-11 bg-app-cream rounded-xl flex-center mx-auto mb-3">
          <MailIcon className="size-6 text-app-green" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold text-app-green mb-1.5">
          Stay in the loop
        </h2>
        <p className="text-app-text-light mb-5 text-sm">
          Get updates on new stores and deals across Addis Ababa.
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto"
        >
          <input
            type="email"
            placeholder="Enter your email address"
            required
            className="flex-1 px-4 py-2.5 rounded-xl border border-app-border focus:border-app-green focus:ring bg-white text-sm transition-all"
          />

          <button
            type="submit"
            className="px-6 py-2.5 bg-app-green text-white font-semibold rounded-xl hover:bg-app-green-light transition-colors shadow-sm whitespace-nowrap active:scale-[0.98]"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
