import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getAvatarSrc } from "@/lib/avatar";

export function ProfileEditPage() {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [organization, setOrganization] = useState(user?.organization ?? "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarReset, setAvatarReset] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setOrganization(user?.organization ?? "");
    setAvatarPreview(user?.avatarUrl ?? "");
    setAvatarFile(null);
    setAvatarReset(false);
  }, [user]);

  const onFileChange = (file?: File) => {
    setError("");
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(user?.avatarUrl ?? "");
      setAvatarReset(false);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("이미지 용량은 2MB 이하로 올려주세요.");
      return;
    }
    setAvatarFile(file);
    setAvatarReset(false);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const resetToDefaultAvatar = () => {
    setError("");
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview("");
    setAvatarReset(true);
  };

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  return (
    <div className="w-full py-4 lg:py-6">
      <Card className="overflow-hidden rounded-[32px] border-slate-200 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
        <div className="border-b border-slate-200/70 px-6 py-5 dark:border-slate-800">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50">프로필 정보 변경</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            이름, 조직, 아바타를 한 화면에서 바로 수정할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:px-8 lg:py-8">
          <div className="flex flex-col items-center gap-4 rounded-[28px] border border-slate-200/70 bg-slate-50/70 px-5 py-6 text-center dark:border-slate-800 dark:bg-slate-950/35">
            <button
              type="button"
              className="group relative h-28 w-28 overflow-hidden rounded-full shadow-xl ring-1 ring-slate-200 transition hover:scale-[1.02] dark:ring-slate-700 sm:h-32 sm:w-32"
              onClick={() => fileInputRef.current?.click()}
              title="프로필 사진 변경"
            >
              <img
                src={getAvatarSrc(avatarPreview, user?.name ?? "avatar")}
                alt={user?.name ?? "avatar"}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white transition duration-200 group-hover:bg-slate-900/45">
                <Camera size={20} className="opacity-0 transition duration-200 group-hover:opacity-100" />
              </div>
            </button>
            <div className="text-sm text-slate-500 dark:text-slate-300">
              <div>이미지 파일만 가능</div>
              <div>최대 2MB</div>
              {user?.avatarUrl ? (
                <button
                  type="button"
                  className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={resetToDefaultAvatar}
                >
                  기본 이미지로 변경
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">조직</label>
              <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onFileChange(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            {error && <div className="text-sm text-red-600 dark:text-red-300">{error}</div>}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={async () => {
                  setError("");
                  await updateProfile({ name, organization, avatarUrl: avatarReset ? null : undefined });
                  if (avatarFile) await uploadAvatar(avatarFile);
                  nav("/mypage");
                }}
              >
                저장
              </Button>
              <Button className="bg-slate-700" onClick={() => nav("/mypage")}>취소</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
