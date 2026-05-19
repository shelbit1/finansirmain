import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { todayString } from "@/lib/utils";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { BottomBar } from "@/components/app/BottomBar";
import { DailyMemoModal } from "@/components/app/DailyMemoModal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const today = todayString();
  const checkin = await prisma.dailyCheckIn.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
    select: { id: true },
  });

  const userName = user.name || user.email.split("@")[0];

  return (
    <div className="min-h-dvh flex bg-bg">
      <Sidebar userName={userName} userEmail={user.email} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={userName} />

        <main className="flex-1 w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-7">
          {children}
        </main>

        <BottomBar />
      </div>

      <DailyMemoModal show={!checkin} />
    </div>
  );
}
