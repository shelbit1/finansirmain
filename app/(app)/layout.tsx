import { getCurrentAccess, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { todayString } from "@/lib/utils";
import { Sidebar } from "@/components/app/Sidebar";
import { AppHeader } from "@/components/app/AppHeader";
import { BottomBar } from "@/components/app/BottomBar";
import { DailyMemoModal } from "@/components/app/DailyMemoModal";
import { SubscriptionBanner } from "@/components/app/SubscriptionBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { tier, view: subscriptionView } = await getCurrentAccess();

  const today = todayString();
  const checkin = await prisma.dailyCheckIn.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
    select: { id: true },
  });

  const userName = user.name || user.email.split("@")[0];

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-bg">
      <AppHeader userName={userName} userEmail={user.email} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar tier={tier} />

        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <main className="flex-1 min-h-0 overflow-y-auto w-full">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-7">
              <SubscriptionBanner view={subscriptionView} tier={tier} />
              {children}
            </div>
          </main>

          <BottomBar tier={tier} />
        </div>
      </div>

      <DailyMemoModal show={!checkin} />
    </div>
  );
}
