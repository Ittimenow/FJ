"use client";

import { figurineImagePath } from "@cashflow/shared";
import { Camera, Dices, ImageUp, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FigurinePicker } from "@/components/figurine-picker";
import { Button } from "@/components/ui/button";

const MAX_AVATAR_FILE_SIZE = 15 * 1024 * 1024;

interface AvatarPickerProps {
  currentAvatarUrl: string | null;
  avatarColor: string;
  initials: string;
  figurine: string | null;
  onAvatarChange: (dataUrl: string | null) => void;
  onFigurineChange: (figurine: string | null) => void;
}

export function AvatarPicker({
  currentAvatarUrl,
  avatarColor,
  initials,
  figurine,
  onAvatarChange,
  onFigurineChange
}: AvatarPickerProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [figurineOpen, setFigurineOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cameraTriggerRef = useRef<HTMLButtonElement | null>(null);
  const figurineDialogRef = useRef<HTMLElement>(null);
  const figurineCloseButtonRef = useRef<HTMLButtonElement>(null);
  const figurineTriggerRef = useRef<HTMLButtonElement>(null);

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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCamera();
      if (event.key === "Tab") keepFocusInsideDialog(event, cameraDialogRef.current);
    }

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKeyDown);
      cameraTriggerRef.current?.focus();
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!figurineOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    figurineCloseButtonRef.current?.focus();

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFigurineOpen(false);
      if (event.key === "Tab") keepFocusInsideDialog(event, figurineDialogRef.current);
    }

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleDialogKeyDown);
      figurineTriggerRef.current?.focus();
    };
  }, [figurineOpen]);

  useEffect(() => {
    if (!cameraOpen) return;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => {
      setCameraError("Не удалось запустить камеру. Закройте окно и попробуйте снова.");
    });

    return () => {
      video.srcObject = null;
    };
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
        const ctx = canvas.getContext("2d");
        if (!ctx || img.width === 0 || img.height === 0) {
          URL.revokeObjectURL(url);
          reject(new Error("Не удалось обработать изображение"));
          return;
        }
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
      if (!file.type.startsWith("image/")) {
        throw new Error("Выберите файл изображения");
      }
      if (file.size > MAX_AVATAR_FILE_SIZE) {
        throw new Error("Фотография слишком большая. Выберите файл до 15 МБ.");
      }
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

  async function openCamera(event: React.MouseEvent<HTMLButtonElement>) {
    cameraTriggerRef.current = event.currentTarget;
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Камера недоступна в этом браузере");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      streamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true);
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
    setCameraReady(false);
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Камера ещё запускается. Подождите секунду и повторите снимок.");
      return;
    }
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Не удалось обработать снимок. Попробуйте загрузить фотографию.");
      return;
    }
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

  const cameraDialog = cameraOpen ? (
    <div
      className="app-shell-overlay fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-[#071225]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-camera-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeCamera();
      }}
    >
      <div ref={cameraDialogRef} className="app-shell-overlay-panel app-shell-overlay-scroll w-full max-w-md rounded-2xl bg-card p-5 shadow-[0_34px_90px_rgba(5,18,45,.35)] sm:p-6">
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
            ref={closeButtonRef}
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
          autoPlay
          muted
          playsInline
          onCanPlay={() => setCameraReady(true)}
        />
        {cameraError ? (
          <p className="mt-3 text-sm leading-5 text-red-700" role="alert">
            {cameraError}
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="action"
            onClick={capturePhoto}
            disabled={!cameraReady}
          >
            <Camera className="mr-2" size={17} aria-hidden="true" />
            {cameraReady ? "Использовать снимок" : "Запускаем камеру..."}
          </Button>
          <Button type="button" variant="secondary" onClick={closeCamera}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const figurineDialog = figurineOpen ? (
    <div
      className="app-shell-overlay fixed inset-0 z-[190] overflow-y-auto bg-[#071225]/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setFigurineOpen(false);
      }}
    >
      <section
        ref={figurineDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-figurine-title"
        className="app-shell-overlay-panel mx-auto my-auto flex max-h-[min(760px,92dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-[0_34px_90px_rgba(5,18,45,.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line/70 p-4 sm:p-6">
          <div className="min-w-0">
            <h2 id="profile-figurine-title" className="text-xl font-extrabold text-ink">
              Любимая фигурка
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
              Выберите фигурку — окно закроется, а новый образ сразу появится в профиле.
            </p>
          </div>
          <button
            ref={figurineCloseButtonRef}
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
            onClick={() => setFigurineOpen(false)}
            aria-label="Закрыть выбор фигурки"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="app-shell-overlay-scroll min-h-0 p-4 sm:p-6">
          <FigurinePicker
            value={figurine}
            onChange={(figurineId) => {
              onFigurineChange(figurineId);
              setFigurineOpen(false);
            }}
          />
        </div>
        {figurine ? (
          <div className="flex shrink-0 justify-end border-t border-line/70 p-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onFigurineChange(null);
                setFigurineOpen(false);
              }}
            >
              Показывать фото или инициалы
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  ) : null;

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

      {cameraDialog ? createPortal(cameraDialog, document.body) : null}
      {figurineDialog ? createPortal(figurineDialog, document.body) : null}

      <div
        className="grid w-full grid-cols-4 gap-2"
        role="group"
        aria-label="Настройки игрового образа"
      >
        <Button
          type="button"
          variant="secondary"
          className="w-full min-w-0 border-white/15 bg-white/10 px-0 text-white hover:bg-white hover:text-ink"
          onClick={() => fileRef.current?.click()}
          disabled={fileLoading}
          aria-label={fileLoading ? "Обрабатываем фотографию" : "Загрузить фото"}
          title={fileLoading ? "Обрабатываем фотографию" : "Загрузить фото"}
        >
          <ImageUp size={18} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full min-w-0 border-white/15 bg-white/10 px-0 text-white hover:bg-white hover:text-ink"
          onClick={openCamera}
          disabled={fileLoading}
          aria-label="Открыть камеру"
          title="Камера"
        >
          <Camera size={18} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full min-w-0 border-white/15 bg-white/10 px-0 text-white hover:bg-white hover:text-ink"
          onClick={handleRemove}
          disabled={!preview || fileLoading}
          aria-label="Удалить фотографию"
          title="Удалить фото"
        >
          <Trash2 size={18} aria-hidden="true" />
        </Button>
        <button
          ref={figurineTriggerRef}
          type="button"
          className="inline-flex h-11 w-full min-w-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-0 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          onClick={() => setFigurineOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={figurineOpen}
          aria-label="Выбрать любимую фигурку"
          title="Выбрать фигурку"
        >
          <Dices size={18} aria-hidden="true" />
        </button>
      </div>

      {cameraError && !cameraOpen && (
        <p className="text-center text-xs leading-5 text-[#ffd0c8]" role="alert">
          {cameraError}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function keepFocusInsideDialog(event: KeyboardEvent, dialog: HTMLElement | null) {
  if (!dialog) return;
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.getClientRects().length > 0);
  if (focusable.length === 0) return;

  const first = focusable.at(0);
  const last = focusable.at(-1);
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
