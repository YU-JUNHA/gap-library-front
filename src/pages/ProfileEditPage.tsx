import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ProfileEditPage() {
  const { user, updateProfile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");

  return <Card className="max-w-xl">
    <h2 className="text-lg font-semibold">프로필 정보 변경</h2>
    <div className="mt-4 space-y-3">
      <div>
        <label className="mb-1 block text-sm">이름</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm">프로필 사진</label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setAvatarUrl(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={async () => { await updateProfile({ name, avatarUrl }); nav("/mypage"); }}>저장</Button>
        <Button className="bg-slate-700" onClick={() => nav("/mypage")}>취소</Button>
      </div>
    </div>
  </Card>;
}
