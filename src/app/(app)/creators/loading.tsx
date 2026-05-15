import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/ui/page-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={5} />
    </div>
  );
}
