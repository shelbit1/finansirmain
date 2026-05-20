import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { todayString } from "@/lib/utils";
import { describeSubscription } from "@/lib/billing";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { BottomBar } from "@/components/app/BottomBar";
import { DailyMemoModal } from "@/components/app/DailyMemoModal";
import { SubscriptionBanner } from "@/components/app/SubscriptionBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const today = todayString();
  const [checkin, subscription] = await Promise.all([
    prisma.dailyCheckIn.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      select: { id: true },
    }),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
  ]);

  const subscriptionView = describeSubscription(subscription);
  const userName = user.name || user.email.split("@")[0];

  return (
    <div className="h-dvh flex overflow-hidden bg-bg">
      <Sidebar userName={userName} userEmail={user.email} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Topbar userName={userName} />

        <main className="flex-1 min-h-0 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-7">
            <SubscriptionBanner view={subscriptionView} />
            {children}
          </div>
        </main>

        <BottomBar />
      </div>

      <DailyMemoModal show={!checkin} />
    </div>
  );
}
