import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

import { uploadStoreImage } from "../lib/storage";

interface Props {
  label: string;
  value?: string;
  aspect: number;
  recommendedSize?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  /** Defaults to uploading into the `store-images` bucket. */
  upload?: (file: File) => Promise<string>;
  /** Tailwind aspect class for the preview box (e.g. "aspect-square"). */
  previewClassName?: string;
  disabled?: boolean;
}

// Load an image element from a (blob) URL.
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    img.src = url;
  });
}

// Render the cropped region to a canvas and export as webp (fallback jpeg).
async function getCroppedFile(imageSrc: string, crop: Area): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp) {
          resolve(webp);
          return;
        }
        // Fallback for browsers without webp encoding.
        canvas.toBlob(
          (jpeg) =>
            jpeg ? resolve(jpeg) : reject(new Error("Could not process image")),
          "image/jpeg",
          0.9,
        );
      },
      "image/webp",
      0.9,
    );
  });

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `store-image-${Date.now()}.${ext}`, {
    type: blob.type,
  });
}

const ImageCropUpload = ({
  label,
  value,
  aspect,
  recommendedSize,
  onChange,
  onRemove,
  upload = uploadStoreImage,
  previewClassName = "aspect-square",
  disabled,
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  // Revoke the local object URL when the modal closes / component unmounts.
  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow selecting the same file again later.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImageSrc(URL.createObjectURL(file));
  };

  const closeModal = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setAreaPixels(null);
  };

  const handleSave = async () => {
    if (!imageSrc || !areaPixels) return;
    setUploading(true);
    try {
      const file = await getCroppedFile(imageSrc, areaPixels);
      const url = await upload(file);
      onChange(url);
      toast.success(`${label} uploaded`);
      closeModal();
    } catch (error: any) {
      console.error("Image upload failed:", error);
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-2">
        {label}
      </label>

      <div
        className={`relative w-full ${previewClassName} rounded-xl border border-dashed border-app-border bg-app-cream/40 overflow-hidden flex-center`}
      >
        {value ? (
          <img
            src={value}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-app-text-light">
            <ImageIcon className="size-7" />
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-green text-white text-xs font-medium hover:bg-app-green-light transition-colors disabled:opacity-50"
        >
          <UploadIcon className="size-3.5" /> {value ? "Change" : "Upload image"}
        </button>
        {value && onRemove && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <XIcon className="size-3.5" /> Remove
          </button>
        )}
      </div>

      {recommendedSize && (
        <p className="text-xs text-app-text-light mt-1.5">{recommendedSize}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {/* Crop modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-upload-title"
          >
            <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
              <h3 id="crop-upload-title" className="font-semibold text-zinc-900">Crop {label}</h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={uploading}
                className="p-1.5 rounded-lg hover:bg-app-cream transition-colors disabled:opacity-50"
                aria-label={`Close ${label} crop dialog`}
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="relative w-full h-72 sm:h-80 bg-zinc-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <label htmlFor="crop-upload-zoom" className="text-xs font-medium text-zinc-600 shrink-0">
                  Zoom
                </label>
                <input
                  id="crop-upload-zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-app-orange"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg border border-app-border text-sm font-medium text-zinc-600 hover:bg-app-cream transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={uploading || !areaPixels}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-app-orange text-white text-sm font-semibold hover:bg-app-orange-dark transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" /> Uploading…
                    </>
                  ) : (
                    "Save image"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCropUpload;
