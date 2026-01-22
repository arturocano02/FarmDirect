import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = ["farm-images", "product-images", "farm-videos", "product-videos"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (for videos)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (for images)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * POST /api/upload
 * Upload a file to Supabase Storage
 * Uses service role client to bypass RLS for uploads
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const bucket = formData.get("bucket") as string | null;
  const path = formData.get("path") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  if (!path) {
    return NextResponse.json({ error: "No path provided" }, { status: 400 });
  }

  // Determine if this is an image or video based on bucket
  const isVideo = bucket.includes("video");
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
  const maxSize = isVideo ? MAX_FILE_SIZE : MAX_IMAGE_SIZE;

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { 
        error: isVideo 
          ? "Invalid file type. Allowed: MP4, WebM, QuickTime" 
          : "Invalid file type. Allowed: JPG, PNG, WebP, GIF" 
      },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > maxSize) {
    return NextResponse.json(
      { 
        error: isVideo
          ? `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          : `File too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
      },
      { status: 400 }
    );
  }

  // Verify user has permission to upload to this path
  // Path should start with their farm_id for farm users
  const pathParts = path.split("/");
  const farmId = pathParts[0];

  // Check if user owns this farm
  const { data: farm } = await supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .eq("owner_user_id", user.id)
    .single();

  // Also check if user is admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!farm && (profile as any)?.role !== "admin") {
    return NextResponse.json(
      { error: "Not authorized to upload to this location" },
      { status: 403 }
    );
  }

  try {
    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Use service role client for uploads to bypass RLS
    const serviceClient = await createServiceClient();

    // Upload to Supabase Storage
    const { data, error: uploadError } = await serviceClient.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[api/upload] Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL using service client
    const { data: urlData } = serviceClient.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("[api/upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
