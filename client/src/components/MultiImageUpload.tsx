import { useState } from "react";
import { Loader2Icon, StarIcon, UploadIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

import { uploadProductImage } from "../lib/storage";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  upload?: (file: File) => Promise<string>;
}

// Multi-image uploader for products. images[0] is the primary image (shown
// first on cards/lists). Vendors can add several images, remove any, and pick
// which one is primary.
const MultiImageUpload = ({
  images,
  onChange,
  upload = uploadProductImage,
}: Props) => {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        urls.push(await upload(file));
      }
      if (urls.length) onChange([...images, ...urls]);
    } catch (error: any) {
      console.error("Image upload failed:", error);
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  const makePrimary = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [picked] = next.splice(i, 1);
    onChange([picked, ...next]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className={`relative size-24 rounded-lg overflow-hidden border ${i === 0 ? "border-app-green ring-2 ring-app-green/30" : "border-zinc-200"}`}
          >
            <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />

            {i === 0 ? (
              <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-app-green text-white text-[9px] font-semibold leading-none">
                <StarIcon className="size-2.5 fill-white" /> Primary
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makePrimary(i)}
                title="Set as primary"
                className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/90 text-app-green text-[9px] font-semibold leading-none hover:bg-white"
              >
                <StarIcon className="size-2.5" /> Primary
              </button>
            )}

            <button
              type="button"
              onClick={() => removeAt(i)}
              title="Remove image"
              className="absolute top-1 right-1 size-5 rounded-full bg-black/55 text-white flex-center hover:bg-black/75"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}

        {/* Add tile */}
        <label
          className={`size-24 rounded-lg border border-dashed border-app-border flex flex-col items-center justify-center gap-1 cursor-pointer text-app-text-light hover:bg-app-cream transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {uploading ? (
            <Loader2Icon className="size-5 animate-spin" />
          ) : (
            <>
              <UploadIcon className="size-5" />
              <span className="text-[10px] font-medium">Add image</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
        </label>
      </div>

      <p className="text-xs text-app-text-light mt-2">
        The first image is the primary one shown on product cards. Tap
        &ldquo;Primary&rdquo; on another image to make it first.
      </p>
    </div>
  );
};

export default MultiImageUpload;
