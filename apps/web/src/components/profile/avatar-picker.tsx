"use client";

import { figurineImagePath } from "@cashflow/shared";
import { Camera, ImageUp, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  avatarColor: string;
  initials: string;
  figurine: string | null;
  onAvatarChange: (dataUrl: string | null) => void;
}

export function AvatarPicker({
  currentAvatarUrl,
  avatarColor,
  initials,
  figurine,
  onAvatarChange
}: AvatarPickerProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setPreview(currentAvatarUrl);
  }, [currentAvatarUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeCamera();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [cameraOpen]);

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
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Не удалось прочитать изображение"));
      };
      img.src = url;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLoading(true);
    setCameraError(null);
    try {
      const dataUrl = await resizeAndCrop(file);
      setPreview(dataUrl);
      onAvatarChange(dataUrl);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Не удалось обработать изображение"
      );
    } finally {
      setFileLoading(false);
      e.target.value = "";
    }
  }

  async function openCamera() {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Камера недоступна в этом браузере");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (error) {
      setCameraError(
        error instanceof Error && error.message === "Камера недоступна в этом браузере"
          ? error.message
          : "Не удалось получить доступ к камере. Проверьте разрешение браузера."
      );
    }
  }

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function closeCamera() {
    stopCameraStream();
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
    <div className="flex flex-col items-center gap-5">
      <div className="relative grid h-44 w-44 place-items-center overflow-hidden rounded-2xl bg-card shadow-[0_18px_40px_rgba(5,18,45,.28)]">
        {figurine ? (
          <img
            src={figurineImagePath(figurine)}
            alt="Игровая фигурка"
            className="h-full w-full object-contain p-5"
          />
        ) : preview ? (
          <img
            src={preview}
            alt="Аватар"
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-5xl font-extrabold text-white select-none"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        )}
        <span className="absolute bottom-3 left-3 rounded-lg bg-ink/85 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm">
          {figurine ? "Фигурка" : preview ? "Фотография" : "Инициалы"}
        </span>
      </div>

      {cameraOpen && (
        <div
          className="app-shell-overlay fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#071225]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-camera-title"
        >
          <div className="app-shell-overlay-panel app-shell-overlay-scroll w-full max-w-md rounded-2xl bg-card p-5 shadow-[0_34px_90px_rgba(5,18,45,.35)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-camera-title" className="text-xl font-extrabold text-ink">
                  Сделайте фотографию
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Поместите лицо в центр кадра. Изображение обрежется до квадрата.
                </p>
              </div>
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
                onClick={closeCamera}
                aria-label="Закрыть камеру"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <video
              ref={videoRef}
              className="mt-5 aspect-square w-full rounded-2xl bg-ink object-cover"
              muted
              playsInline
            />
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="action" onClick={capturePhoto}>
                <Camera className="mr-2" size={17} aria-hidden="true" />
                Использовать снимок
              </Button>
              <Button type="button" variant="secondary" onClick={closeCamera}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button
          type="button"
          variant="secondary"
          className="w-full border-white/15 bg-white/10 text-white hover:bg-white hover:text-ink"
          onClick={() => fileRef.current?.click()}
          disabled={fileLoading}
        >
          <ImageUp className="mr-2" size={16} aria-hidden="true" />
          {fileLoading ? "Обрабатываем..." : "Загрузить фото"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full border-white/15 bg-white/10 text-white hover:bg-white hover:text-ink"
          onClick={openCamera}
        >
          <Camera className="mr-2" size={16} aria-hidden="true" />
          Камера
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-white/70 hover:bg-white/10 hover:text-white sm:col-span-2 lg:col-span-1"
            onClick={handleRemove}
          >
            <Trash2 className="mr-2" size={16} aria-hidden="true" />
            Удалить
          </Button>
        )}
      </div>

      {cameraError && (
        <p className="text-center text-xs leading-5 text-[#ffd0c8]" role="alert">
          {cameraError}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
