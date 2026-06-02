import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  return <div className="max-w-xl space-y-4">
    <Card>
      <h2 className="text-lg font-semibold">프로필 정보 변경</h2>
      <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="group relative h-16 w-16 overflow-hidden rounded-full"
          onClick={() => fileInputRef.current?.click()}
          title="프로필 사진 변경"
        >
          <img
            src={getAvatarSrc(avatarPreview)}
            alt={user?.name ?? "avatar"}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white transition duration-200 group-hover:bg-slate-900/45">
            <Camera size={18} className="opacity-0 transition duration-200 group-hover:opacity-100" />
          </div>
        </button>
        <div className="text-sm text-slate-500 dark:text-slate-300">
          <div>이미지 파일만 가능</div>
          <div>최대 2MB</div>
          {user?.avatarUrl ? (
            <button
              type="button"
              className="mt-2 rounded-md border border-line px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={resetToDefaultAvatar}
            >
              기본 이미지로 변경
            </button>
          ) : null}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm">이름</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm">조직</label>
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
      <div className="flex gap-2">
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
    </Card>

    <Card>
      <h3 className="text-lg font-semibold">비밀번호 변경</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿀 수 있습니다.</p>
      <Link
        to="/mypage/change-password"
        className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
      >
        비밀번호 변경하기
      </Link>
    </Card>
  </div>;
}
