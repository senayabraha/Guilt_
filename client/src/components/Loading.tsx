import { Loader2Icon } from "lucide-react";

const Loading = () => {
  return (
    <div
      className="flex-center h-full min-h-96 w-full flex-col gap-3 text-app-text-light"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <Loader2Icon className="size-8 animate-spin text-green-950" aria-hidden="true" />
      <span className="text-sm font-medium">Loading...</span>
    </div>
  );
};

export default Loading;
