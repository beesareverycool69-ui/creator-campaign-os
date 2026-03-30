import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for storage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}-${randomId}.${extension}`;

    // Check if Supabase is configured
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("content")
        .upload(`uploads/${filename}`, buffer, {
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
      } = supabase.storage.from("content").getPublicUrl(`uploads/${filename}`);

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
      url: `/uploads/${filename}`,
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
