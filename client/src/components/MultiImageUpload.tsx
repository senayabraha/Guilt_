import { useState } from "react";
import { Loader2Icon, StarIcon, UploadIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

import { uploadProductImage } from "../lib/storage";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  upload?: (file: File) => Promise<string>;
  maxImages?: number;
}

// Multi-image uploader. images[0] is the primary (shown on product cards).
// Tap "Primary" on any other image to promote it to position 0.
const MultiImageUpload = ({
  images,
  onChange,
  upload = uploadProductImage,
  maxImages = 8,
}: Props) => {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    e.target.value = "";
    if (!rawFiles.length) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed. Remove one to add another.`);
      return;
    }

    const files = rawFiles.slice(0, remaining);
    if (rawFiles.length > remaining) {
      toast(`Only ${remaining} more image${remaining !== 1 ? "s" : ""} can be added — taking the first ${remaining}.`, {
        icon: "ℹ️",
      });
    }

    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported format. Use JPEG, PNG, WebP, or GIF.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: too large (max ${MAX_FILE_SIZE_MB} MB).`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of valid) {
        urls.push(await upload(file));
      }
      if (urls.length) onChange([...images, ...urls]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload image — please try again.");
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

  const atMax = images.length >= maxImages;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className={`relative size-24 rounded-lg overflow-hidden border-2 ${
              i === 0 ? "border-app-green ring-2 ring-app-green/20" : "border-zinc-200"
            }`}
          >
            <img
              src={url}
              alt={`Product image ${i + 1}`}
              className="w-full h-full object-cover"
            />

            {i === 0 ? (
              <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-app-green text-white text-[9px] font-semibold leading-none">
                <StarIcon className="size-2.5 fill-white" /> Primary
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makePrimary(i)}
                title="Set as primary image"
                className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/90 text-app-green text-[9px] font-semibold leading-none hover:bg-white transition-colors"
              >
                <StarIcon className="size-2.5" /> Primary
              </button>
            )}

            <button
              type="button"
              onClick={() => removeAt(i)}
              title="Remove image"
              className="absolute top-1 right-1 size-5 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 transition-colors"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}

        {/* Add tile — hidden when at max */}
        {!atMax && (
          <label
            className={`size-24 rounded-lg border-2 border-dashed border-app-border flex flex-col items-center justify-center gap-1 cursor-pointer text-app-text-light hover:bg-app-cream hover:border-app-green transition-colors ${
              uploading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {uploading ? (
              <Loader2Icon className="size-5 animate-spin" />
            ) : (
              <>
                <UploadIcon className="size-5" />
                <span className="text-[10px] font-medium">Add image</span>
                <span className="text-[9px] text-zinc-400">
                  {images.length}/{maxImages}
                </span>
              </>
            )}
            <input
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </label>
        )}
      </div>

      <p className="text-xs text-app-text-light mt-2">
        {atMax ? (
          <span className="text-amber-600">
            Maximum {maxImages} images reached. Remove one to add another.
          </span>
        ) : (
          <>
            The first image is the primary (shown on product cards). Tap{" "}
            <strong className="font-medium">Primary</strong> on any other to promote
            it. Max {maxImages} images, {MAX_FILE_SIZE_MB}&nbsp;MB each.
          </>
        )}
      </p>
    </div>
  );
};

export default MultiImageUpload;
