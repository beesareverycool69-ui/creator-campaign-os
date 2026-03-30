import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/features/brands/template-editor";
import { getBrandById } from "@/lib/actions/brands";
import { getTemplatesByBrand } from "@/lib/actions/outreach-templates";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BrandSettingsPage({ params }: Props) {
  const { id } = await params;

  const [brand, templates] = await Promise.all([
    getBrandById(id),
    getTemplatesByBrand(id),
  ]);

  if (!brand) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span>/</span>
        <Link href={`/brands/${id}`} className="hover:text-foreground">
          {brand.name}
        </Link>
        <span>/</span>
        <span>Settings</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage templates and preferences for {brand.name}
        </p>
      </div>

      {/* Message Templates */}
      <TemplateEditor brandId={id} templates={templates} />
    </div>
  );
}
