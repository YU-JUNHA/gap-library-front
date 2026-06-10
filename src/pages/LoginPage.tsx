import { useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      await login(email, password);
      nav("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    }
  };

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 p-4">
    <form onSubmit={onSubmit} className="w-full max-w-md card p-6">
      <h1 className="text-2xl font-bold">GAP Library</h1>
      <p className="mt-1 text-sm text-slate-600">GAP의 문서와 자료를 한 곳에서 관리하세요.</p>
      <div className="mt-4 space-y-3">
        <Input placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" className="mt-4 w-full">로그인</Button>
      <Link to="/register" className="mt-4 block text-center text-sm text-slate-600 hover:underline">회원가입</Link>
    </form>
  </div>;
}
