import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const nav = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!currentPassword.trim()) {
      setError("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("비밀번호를 변경했습니다.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">비밀번호 변경</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">새 비밀번호로 안전하게 변경하세요.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm">현재 비밀번호</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="현재 비밀번호" />
          </div>
          <div>
            <label className="mb-1 block text-sm">새 비밀번호</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8자 이상 입력" />
          </div>
          <div>
            <label className="mb-1 block text-sm">새 비밀번호 확인</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="새 비밀번호를 다시 입력" />
          </div>

          {error ? <div className="text-sm text-red-600 dark:text-red-300">{error}</div> : null}
          {success ? <div className="text-sm text-emerald-600 dark:text-emerald-300">{success}</div> : null}

          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving}>
              {saving ? "변경 중..." : "비밀번호 변경"}
            </Button>
            <Button className="bg-slate-700" onClick={() => nav("/mypage")}>돌아가기</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
