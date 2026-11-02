import { DashboardCardsSkeleton } from "@/app/components/ui/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="max-w-[1600px] w-full mx-auto pt-[28px] px-[32px] pb-[44px] max-[1240px]:px-[22px] max-[660px]:pt-[18px] max-[660px]:px-[16px] max-[660px]:pb-[36px]">
      <DashboardCardsSkeleton />
    </div>
  );
}
