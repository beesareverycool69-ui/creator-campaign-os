import Link from "next/link";
import { CreatorForm } from "@/components/features/creators";

export default function NewCreatorPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/creators" className="hover:text-foreground">
          Creators
        </Link>
        <span>/</span>
        <span>New</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Add Creator</h1>
        <p className="text-muted-foreground mt-1">
          Add a new creator to your database
        </p>
      </div>

      {/* Form */}
      <CreatorForm />
    </div>
  );
}
