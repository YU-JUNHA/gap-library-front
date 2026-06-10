import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Building2,
  CalendarDays,
  KeyRound,
  LogOut,
  Mail,
  PencilLine,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAvatarSrc } from "@/lib/avatar";

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function roleLabel(role?: string) {
  if (role === "admin") return "관리자";
  if (role === "member") return "일반 사용자";
  return role || "-";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function ProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = getAvatarSrc(avatarUrl, name);
  const showImage = !failed;

  return (
    <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-200 dark:border-slate-900 dark:ring-slate-700">
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-3xl font-semibold text-slate-700 dark:from-slate-700 dark:to-slate-800 dark:text-slate-100">
          {getInitials(name)}
        </div>
      )}
      <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30 dark:ring-black/10" />
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-200/70 py-4 last:border-b-0 dark:border-slate-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 break-words text-sm font-medium text-slate-950 dark:text-slate-50">{value}</div>
      </div>
    </div>
  );
}

function ActionItem({
  icon: Icon,
  title,
  description,
  onClick,
  tone = "default",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-4 rounded-3xl border px-5 py-4 text-left transition",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/5",
        danger
          ? "border-rose-200 bg-rose-50/70 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:border-rose-800"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/45 dark:hover:border-slate-700",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition group-hover:scale-105",
          danger
            ? "bg-rose-100 text-rose-600 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-900/60"
            : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700",
        ].join(" ")}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
      </div>
    </button>
  );
}

export function MyPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const accountStatus = "활성";
  const name = user?.name || "이름 없음";
  const avatarCandidate =
    user?.avatarUrl ??
    ((user as { avatar?: string | null }).avatar ?? null) ??
    ((user as { avatar_url?: string | null }).avatar_url ?? null) ??
    ((user as { profileImage?: string | null }).profileImage ?? null);

  return (
    <div className="w-full py-4 lg:py-6">
      <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[32px] border-slate-200 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
          <div className="h-28 bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
          <div className="-mt-14 px-6 pb-6">
            <div className="flex justify-center">
              <ProfileAvatar name={name} avatarUrl={avatarCandidate} />
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50">{name}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{user?.email || "-"}</p>
              <span className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {roleLabel(user?.role)}
              </span>
            </div>
          </div>
        </Card>

        <div className="grid gap-8">
          <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Account</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">계정 정보</h3>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-slate-50/70 px-5 dark:border-slate-800 dark:bg-slate-950/35">
              <InfoItem icon={Mail} label="이메일" value={user?.email || "-"} />
              <InfoItem icon={Building2} label="조직" value={user?.organization || "-"} />
              <InfoItem icon={CalendarDays} label="가입일" value={formatDate(user?.createdAt)} />
              <InfoItem icon={ShieldCheck} label="계정 상태" value={accountStatus} />
            </div>
          </Card>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Account</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">계정 관리</h3>
                </div>
                <UserRound size={18} className="text-slate-400" />
              </div>

              <div className="mt-6 space-y-4">
                <ActionItem
                  icon={PencilLine}
                  title="프로필 수정"
                  description="이름, 조직, 아바타를 변경합니다."
                  onClick={() => nav("/mypage/edit")}
                />
                <ActionItem
                  icon={KeyRound}
                  title="비밀번호 변경"
                  description="계정 보안을 위해 비밀번호를 바꿉니다."
                  onClick={() => nav("/mypage/change-password")}
                />
              </div>
            </Card>

            <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Session</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">로그아웃</h3>
                </div>
                <LogOut size={18} className="text-rose-500" />
              </div>

              <p className="mt-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
                현재 계정에서 안전하게 로그아웃합니다.
              </p>

              <Button
                className="mt-8 w-full justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                onClick={async () => {
                  await logout();
                  nav("/login");
                }}
              >
                로그아웃
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
