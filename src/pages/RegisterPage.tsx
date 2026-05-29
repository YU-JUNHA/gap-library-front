import { useState } from "react";
import type React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({ name, email, password, inviteCode });
    nav("/");
  };

  return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <form onSubmit={onSubmit} className="w-full max-w-md card p-6 space-y-3">
      <h1 className="text-xl font-bold">회원가입</h1>
      <Input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Input placeholder="초대 코드" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
      <Button className="w-full">가입하기</Button>
      <Link to="/login" className="block text-center text-sm text-slate-600 hover:underline">로그인 화면으로 돌아가기</Link>
    </form>
  </div>;
}
