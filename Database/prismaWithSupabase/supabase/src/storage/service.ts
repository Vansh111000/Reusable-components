/* 
storage.upload()
storage.delete()
storage.getPublicUrl()
storage.getSignedUrl()
*/

import { storageClient } from "./client";

const BUCKET = "uploads";

// 1. UPLOAD
export async function uploadFile(path: string, file: File) {
    const { data, error } = await storageClient.storage
        .from(BUCKET)
        .upload(path, file, {
            upsert: false,
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    return data;
}

// 2. DELETE
export async function deleteFile(path: string) {
    const { error } = await storageClient.storage
        .from(BUCKET)
        .remove([path]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}

// 3. SIGNED URL
export async function getSignedUrl(
    path: string,
    expiresIn = 60 * 10
) {
    const { data, error } = await storageClient.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresIn);

    if (error) {
        throw new Error(`Signed URL failed: ${error.message}`);
    }

    return data.signedUrl;
}

// 4. DOWNLOAD
export async function downloadFile(path: string) {
    const { data, error } = await storageClient.storage
        .from(BUCKET)
        .download(path);

    if (error) {
        throw new Error(`Download failed: ${error.message}`);
    }

    return data;
}