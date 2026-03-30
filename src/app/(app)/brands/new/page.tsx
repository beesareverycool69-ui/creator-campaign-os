import Link from "next/link";
import { BrandForm } from "@/components/features/brands";

export default function NewBrandPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span>/</span>
        <span>New</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Add Brand</h1>
        <p className="text-muted-foreground mt-1">
          Create a new brand to manage creator relationships
        </p>
      </div>

      {/* Form */}
      <BrandForm />
    </div>
  );
}
