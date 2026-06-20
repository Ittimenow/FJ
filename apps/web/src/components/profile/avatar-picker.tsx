"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  avatarColor: string;
  initials: string;
  onAvatarChange: (dataUrl: string | null) => void;
}

export function AvatarPicker({
  currentAvatarUrl,
  avatarColor,
  initials,
  onAvatarChange
}: AvatarPickerProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function resizeAndCrop(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeAndCrop(file);
    setPreview(dataUrl);
    onAvatarChange(dataUrl);
    e.target.value = "";
  }

  async function openCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } catch {
      setCameraError("Не удалось получить доступ к камере");
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const min = Math.min(vw, vh);
    ctx.drawImage(video, (vw - min) / 2, (vh - min) / 2, min, min, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    onAvatarChange(dataUrl);
    closeCamera();
  }

  function handleRemove() {
    setPreview(null);
    onAvatarChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt="Аватар"
            className="h-24 w-24 rounded-full object-cover border border-line"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white select-none"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        )}
      </div>

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 gap-4 p-4">
          <video
            ref={videoRef}
            className="h-64 w-64 rounded-full object-cover"
            muted
            playsInline
          />
          <div className="flex gap-3">
            <Button onClick={capturePhoto}>Сфотографировать</Button>
            <Button variant="secondary" onClick={closeCamera}>Отмена</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-3 text-xs"
          onClick={() => fileRef.current?.click()}
        >
          Загрузить фото
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-8 px-3 text-xs"
          onClick={openCamera}
        >
          Камера
        </Button>
        {preview && (
          <Button
            type="button"
            variant="danger"
            className="h-8 px-3 text-xs"
            onClick={handleRemove}
          >
            Удалить
          </Button>
        )}
      </div>

      {cameraError && (
        <p className="text-xs text-red-600">{cameraError}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
