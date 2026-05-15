import {
  ChartCardSkeleton,
  PageHeaderSkeleton,
  StatCardsSkeleton,
  TableCardSkeleton,
} from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton showAction={false} />
      <StatCardsSkeleton />
      <ChartCardSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <TableCardSkeleton rows={5} />
        <TableCardSkeleton rows={5} />
      </div>
    </div>
  );
}
