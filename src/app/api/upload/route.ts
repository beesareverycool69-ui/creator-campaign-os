import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { campaignCreators } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/access";
import { validatePortalToken } from "@/lib/creator-portal/tokens";
import { getOptionalEnv } from "@/lib/env";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const portalToken = formData.get("portalToken");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let uploadPrefix: string;

    if (typeof portalToken === "string" && portalToken.length > 0) {
      const campaignCreatorId = validatePortalToken(portalToken);
      if (!campaignCreatorId) {
        return NextResponse.json({ error: "Invalid portal token" }, { status: 401 });
      }

      const campaignCreator = await db.query.campaignCreators.findFirst({
        where: eq(campaignCreators.id, campaignCreatorId),
        columns: { id: true },
      });

      if (!campaignCreator) {
        return NextResponse.json({ error: "Invalid portal token" }, { status: 401 });
      }

      uploadPrefix = `creator-portal/${campaignCreatorId}`;
    } else {
      try {
        const user = await requireUser();
        uploadPrefix = `app/${user.id}`;
      } catch {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${randomId}.${extension}`;
    const uploadPath = `${uploadPrefix}/${filename}`;

    // Check if Supabase storage is configured
    const supabaseUrl = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseServiceKey = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("content")
        .upload(uploadPath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("content").getPublicUrl(uploadPath);

      return NextResponse.json({
        url: publicUrl,
        filename,
        size: file.size,
        type: file.type,
      });
    }

    // Fallback: return a placeholder URL for development
    // In production, always use real storage
    console.warn("Supabase not configured, returning placeholder URL");
    return NextResponse.json({
      url: `/${uploadPath}`,
      filename,
      size: file.size,
      type: file.type,
      placeholder: true,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Next.js 14+ handles FormData automatically, no config needed
