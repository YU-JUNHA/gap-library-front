import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, LogOut, PencilLine, UserRound, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

function ActionLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof PencilLine;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 transition group-hover:scale-105 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
      </div>
    </Link>
  );
}

export function MyPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">My Page</p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">마이페이지</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">필요한 정보만 담아서, 한눈에 보이도록 정리했습니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-[32px] border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-start gap-5">
            <div className="relative h-[128px] w-[128px] shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-center bg-cover bg-no-repeat"
                style={{ backgroundImage: `url(${getAvatarSrc(user?.avatarUrl)})` }}
              />
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30 dark:ring-black/10" />
              <div className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-emerald-400 text-slate-950 shadow-sm">
                <BadgeCheck size={11} />
              </div>
            </div>

            <div className="min-w-0 flex-1 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                  {user?.name || "이름 없음"}
                </h3>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {roleLabel(user?.role)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">이메일</div>
                    <div className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user?.email || "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">조직</div>
                    <div className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user?.organization || "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">가입일</div>
                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{formatDate(user?.createdAt)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">계정 상태</div>
                    <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">활성</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Actions</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">계정 관리</h3>
              </div>
              <UserRound size={18} className="text-slate-400" />
            </div>

            <div className="mt-5 grid gap-3">
              <ActionLink
                to="/mypage/edit"
                icon={PencilLine}
                title="프로필 수정"
                description="이름, 조직, 아바타를 변경합니다."
              />
              <ActionLink
                to="/mypage/change-password"
                icon={KeyRound}
                title="비밀번호 변경"
                description="계정 보안을 위해 비밀번호를 바꿉니다."
              />
            </div>
          </Card>

          <Card className="rounded-[32px] border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Session</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">로그아웃</h3>
              </div>
              <LogOut size={18} className="text-rose-500" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              현재 계정에서 안전하게 로그아웃합니다.
            </p>
            <Button
              className="mt-5 w-full justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
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
  );
}
