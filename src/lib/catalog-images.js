import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadImages(images, folder) {
  return Promise.all(images.map(async (image) => {
    if (typeof image === "string") return image;
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) {
      throw new Error("invalid-image");
    }
    const target = ref(storage, `${folder}/${crypto.randomUUID()}`);
    const snapshot = await uploadBytes(target, image);
    return getDownloadURL(snapshot.ref);
  }));
}
