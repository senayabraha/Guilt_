import { supabase } from "./supabase";

/**
 * Upload a file to a public Supabase Storage bucket and return its public URL.
 * Files are stored under a random, time-based path to avoid collisions.
 */
async function uploadToBucket(bucket: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadProductImage(file: File): Promise<string> {
  return uploadToBucket("product-images", file);
}

export function uploadStoreImage(file: File): Promise<string> {
  return uploadToBucket("store-images", file);
}

export function uploadAvatar(file: File): Promise<string> {
  return uploadToBucket("avatars", file);
}
