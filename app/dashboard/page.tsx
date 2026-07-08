import { UserButton } from "@clerk/nextjs";
import DashboardClient from "@/components/DashboardClient";

export default function Dashboard() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl">StandOut</h1>
        <UserButton />
      </div>
      <DashboardClient />
    </main>
  );
}
