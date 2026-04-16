/**
 * Upload a file via XHR to get upload progress (fetch does not support progress).
 */
export function uploadFileWithProgress(
  file: File,
  folderId: number,
  onProgress: (loaded: number, total: number) => void
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.set("file", file);
    form.set("folderId", String(folderId));

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      } else {
        onProgress(e.loaded, file.size);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
      } else {
        let error = "Upload failed";
        try {
          const json = JSON.parse(xhr.responseText);
          if (json?.error) error = json.error;
        } catch {
          // ignore
        }
        resolve({ ok: false, error });
      }
    });

    xhr.addEventListener("error", () => {
      resolve({ ok: false, error: "Network error" });
    });

    xhr.addEventListener("abort", () => {
      resolve({ ok: false, error: "Upload cancelled" });
    });

    xhr.open("POST", "/api/files/upload");
    xhr.send(form);
  });
}
