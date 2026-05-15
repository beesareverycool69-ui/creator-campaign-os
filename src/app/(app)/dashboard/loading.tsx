import {
  CardGridSkeleton,
  ChartCardSkeleton,
  PageHeaderSkeleton,
  StatCardsSkeleton,
  TableCardSkeleton,
} from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={1} />
      <StatCardsSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <TableCardSkeleton rows={4} />
        <TableCardSkeleton rows={4} />
      </div>
      <ChartCardSkeleton />
    </div>
  );
}
