import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function MyPage() {
  const { user, logout } = useAuth();
  const { documents } = useDocuments();
  const myDocs = documents.filter((d) => d.ownerId === user?.id);

  return <div className="space-y-4">
    <Card><h3 className="font-semibold">사용자 프로필</h3><div className="mt-2 space-y-1 text-sm"><div>이름: {user?.name}</div><div>이메일: {user?.email}</div><div>역할: {user?.role}</div><div>조직: {user?.organization}</div><div>가입일: {new Date(user?.createdAt ?? "").toLocaleDateString()}</div></div></Card>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4"><Card>내가 만든 문서 수<div className="text-2xl font-bold">{myDocs.length}</div></Card><Card>최근 열람 문서 수<div className="text-2xl font-bold">{documents.filter((d) => d.lastOpenedAt).length}</div></Card><Card>업로드 파일 수<div className="text-2xl font-bold">8</div></Card><Card>AI 기능 사용 횟수<div className="text-2xl font-bold">23</div></Card></div>
    <Card><h3 className="font-semibold">내가 만든 문서</h3><ul className="mt-2 space-y-1 text-sm">{myDocs.map((d) => <li key={d.id}>{d.title}</li>)}</ul></Card>
    <Button onClick={logout}>로그아웃</Button>
  </div>;
}
