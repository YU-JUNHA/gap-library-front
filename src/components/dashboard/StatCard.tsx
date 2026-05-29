import { Card } from "@/components/ui/Card";

export function StatCard({ label, value }: { label: string; value: number }) {
  return <Card>{label}<div className="text-2xl font-bold">{value}</div></Card>;
}
