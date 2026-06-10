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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) return "이름을 입력해주세요.";
    if (!trimmedEmail) return "이메일을 입력해주세요.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return "올바른 이메일 형식을 입력해주세요.";
    if (!password) return "비밀번호를 입력해주세요.";
    if (password.length < 8) return "비밀번호는 8자 이상 입력해주세요.";
    if (!confirmPassword) return "비밀번호 확인을 입력해주세요.";
    if (password !== confirmPassword) return "비밀번호 확인이 일치하지 않습니다.";

    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await register({ name: name.trim(), email: email.trim(), password });
      setSuccess("가입 요청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
      setTimeout(() => nav("/login"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 처리 중 오류가 발생했습니다.");
    }
  };

  return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <form onSubmit={onSubmit} className="w-full max-w-md card p-6 space-y-3">
      <h1 className="text-xl font-bold">회원가입</h1>
      <Input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Input type="password" placeholder="비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      {error ? <div className="whitespace-pre-line text-sm text-red-500">{error}</div> : null}
      {success ? <div className="text-sm text-emerald-600 dark:text-emerald-300">{success}</div> : null}
      <Button className="w-full">가입하기</Button>
      <Link to="/login" className="block text-center text-sm text-slate-600 hover:underline">로그인 화면으로 돌아가기</Link>
    </form>
  </div>;
}
